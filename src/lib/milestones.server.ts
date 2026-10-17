/**
 * Server-side milestone escrow: release creation, settlement, aggregate deal status, auto-release and retention.
 * Every money step still goes through settleTransactionCore (simulated provider or connected provider).
 */
import { allocateMilestones, milestoneReleaseLedger, retentionReleaseLedger } from "@/lib/milestones";
import { roundMoney } from "@/lib/money";

export async function listMilestones(admin: any, dealId: string) {
  const { data } = await admin.from("deal_milestones").select("*").eq("deal_id", dealId).order("seq");
  return (data ?? []) as any[];
}

/** Allocation for every milestone from the locked funding breakdown. */
export async function milestoneAllocations(admin: any, deal: any) {
  const { getDealPricingLocked } = await import("@/lib/deal-rules.server");
  const b = await getDealPricingLocked(admin, deal);
  const ms = await listMilestones(admin, deal.id);
  const alloc = allocateMilestones(b, ms.map((m) => Number(m.amount)), Number(deal.retention_percent ?? 0));
  return { b, ms, alloc };
}

/** Creates the release transaction for one milestone (factor < 1 for a split dispute decision). */
export async function createMilestoneRelease(admin: any, deal: any, milestoneId: string, actorId: string | null, note: string, factor = 1) {
  const { ms, alloc } = await milestoneAllocations(admin, deal);
  const i = ms.findIndex((m) => m.id === milestoneId);
  if (i < 0) throw new Error("Milestone not found.");
  const a = alloc[i];
  if (!a) throw new Error("Milestone allocation not found.");
  const c = deal.currency;
  const s = (n: number) => roundMoney(n * factor, c);
  const gross = s(a.gross), retention = a.retention, feeShare = s(a.feeShare), vat = s(a.vat);
  const net = roundMoney(gross - retention - feeShare - vat, c);
  await admin.from("deal_milestones").update({ retention_amount: retention, fee_share: feeShare, vat, net_released: net }).eq("id", milestoneId);
  const { data: tx, error } = await admin
    .from("deal_transactions")
    .insert({
      deal_id: deal.id, kind: "release", milestone_id: milestoneId, release_part: "milestone",
      amount: net, fee: feeShare, currency: c, status: "processing", provider: "manual",
      note: note.slice(0, 500), created_by: actorId,
      idempotency_key: `${deal.ref}-M${ms[i].seq}-RELEASE${factor < 1 ? "-SPLIT" : ""}`,
    })
    .select("id")
    .single();
  if (error) {
    if (String(error.code) === "23505") throw new Error("This milestone release is already recorded.");
    throw error;
  }
  return { id: tx.id as string, gross };
}

/** Recomputes the aggregate deal status after a milestone money step. */
export async function refreshAggregate(admin: any, dealId: string) {
  const { data: deal } = await admin.from("deals").select("*").eq("id", dealId).single();
  const ms = await listMilestones(admin, dealId);
  if (!ms.length) return;
  const closed = ms.every((m) => ["released", "refunded"].includes(m.status));
  if (!closed) {
    if (deal.status !== "in_progress") await admin.from("deals").update({ status: "in_progress" }).eq("id", dealId);
    return;
  }
  const retention = ms.reduce((s, m) => s + (m.status === "released" ? Number(m.retention_amount) : 0), 0);
  const patch: Record<string, unknown> = {};
  if (!deal.handover_at) {
    const now = new Date();
    patch["handover_at"] = now.toISOString();
    patch["retention_release_at"] = new Date(now.getTime() + Number(deal.defects_liability_days) * 86_400_000).toISOString();
    await admin.from("deal_events").insert({
      deal_id: dealId, actor_id: null, title: "Final handover — defects liability period started",
      note: `Retention ${roundMoney(retention, deal.currency)} ${deal.currency} held for ${deal.defects_liability_days} day(s)`,
    });
  }
  if (retention <= 0 || deal.retention_released_at) {
    patch["status"] = "completed";
    patch["released_at"] = deal.released_at ?? new Date().toISOString();
  }
  if (Object.keys(patch).length) await admin.from("deals").update(patch).eq("id", dealId);
}

/** Settlement hook for milestone and retention transactions. Returns true when handled. */
export async function settleMilestoneTx(admin: any, tx: any, ref: string) {
  const c = tx.currency;
  const now = new Date().toISOString();
  let rows: { account: string; debit: number; credit: number; currency: string }[] = [];
  if (tx.release_part === "retention") {
    rows = retentionReleaseLedger(c, Number(tx.amount));
    await admin.from("deals").update({ retention_released_at: now, status: "completed", released_at: now }).eq("id", tx.deal_id);
  } else if (tx.milestone_id && tx.kind === "release") {
    const { data: m } = await admin.from("deal_milestones").select("*").eq("id", tx.milestone_id).single();
    const gross = roundMoney(Number(m.net_released) + Number(m.retention_amount) + Number(m.fee_share) + Number(m.vat), c);
    rows = milestoneReleaseLedger(c, { gross, retention: Number(m.retention_amount), feeShare: Number(m.fee_share), vat: Number(m.vat), net: Number(m.net_released) });
    await admin.from("deal_milestones").update({ status: "released", released_at: now, approved_at: m.approved_at ?? now, auto_release_at: null }).eq("id", m.id);
  } else if (tx.milestone_id && tx.kind === "refund") {
    const amt = Number(tx.amount);
    rows = [
      { account: "escrow_held", debit: amt, credit: 0, currency: c },
      { account: "buyer_refund_payable", debit: 0, credit: amt, currency: c },
    ];
    const { data: m } = await admin.from("deal_milestones").select("status").eq("id", tx.milestone_id).single();
    if (m.status !== "released") await admin.from("deal_milestones").update({ status: "refunded", auto_release_at: null }).eq("id", tx.milestone_id);
  } else return false;
  await admin.from("ledger_entries").insert(rows.filter((r) => r.debit || r.credit).map((r) => ({ ...r, deal_id: tx.deal_id, transaction_id: tx.id, reference: ref })));
  if (tx.release_part !== "retention") await refreshAggregate(admin, tx.deal_id);
  return true;
}

/** After upfront funding: every milestone becomes funded and the deal is in progress. */
export async function markMilestonesFunded(admin: any, dealId: string) {
  const ms = await listMilestones(admin, dealId);
  if (!ms.length) return false;
  await admin.from("deal_milestones").update({ status: "funded", funded_at: new Date().toISOString() }).eq("deal_id", dealId).eq("status", "pending");
  await admin.from("deals").update({ status: "in_progress" }).eq("id", dealId);
  return true;
}

/** Hourly/10-minute job: milestone auto-release after inspection, and retention after the defects liability period. */
export async function runMilestoneJobs(admin: any, notify: any) {
  const ids: string[] = [];
  const now = new Date().toISOString();
  const { data: due } = await admin
    .from("deal_milestones")
    .select("id, deal_id, seq, title")
    .eq("status", "submitted")
    .lte("auto_release_at", now)
    .limit(50);
  for (const m of due ?? []) {
    const { data: deal } = await admin.from("deals").select("*").eq("id", m.deal_id).single();
    if (deal.frozen || !deal.auto_release_enabled) continue;
    const { data: current } = await admin.from("deal_milestones").select("status").eq("id", m.id).single();
    if (current?.status !== "submitted") continue;
    const { data: releases } = await admin.from("deal_transactions").select("id").eq("milestone_id", m.id)
      .eq("kind", "release").in("status", ["processing", "pending", "succeeded"]).limit(1);
    if (releases?.length) continue;
    try {
      const tx = await createMilestoneRelease(admin, deal, m.id, null, "Automatic release after the inspection period");
      await admin.from("deal_milestones").update({ approved_at: now }).eq("id", m.id);
      await admin.from("deal_events").insert({ deal_id: deal.id, title: `Milestone ${m.seq} inspection period ended — automatic release started`, note: m.title });
      ids.push(tx.id);
    } catch (e) {
      console.error("milestone auto-release", m.id, e);
    }
  }
  const { data: ret } = await admin
    .from("deals")
    .select("*")
    .eq("status", "in_progress")
    .is("retention_released_at", null)
    .lte("retention_release_at", now)
    .eq("frozen", false)
    .limit(50);
  for (const deal of ret ?? []) {
    const { data: open } = await admin.from("disputes").select("id").eq("deal_id", deal.id).neq("status", "resolved").limit(1);
    if (open?.length) continue;
    const ms = await listMilestones(admin, deal.id);
    const amount = roundMoney(ms.reduce((s, m) => s + (m.status === "released" ? Number(m.retention_amount) : 0), 0), deal.currency);
    if (amount <= 0) continue;
    const { data: tx } = await admin
      .from("deal_transactions")
      .insert({
        deal_id: deal.id, kind: "release", release_part: "retention", amount, fee: 0, currency: deal.currency,
        status: "processing", provider: "manual", note: "Retention released after the defects liability period",
        idempotency_key: `${deal.ref}-RETENTION-RELEASE`,
      })
      .select("id")
      .maybeSingle();
    if (tx?.id) {
      ids.push(tx.id);
      await admin.from("deal_events").insert({ deal_id: deal.id, title: "Defects liability period ended — retention release started", note: `${amount} ${deal.currency}` });
    }
  }
  if (ids.length) {
    const { simulateProviderConfirm } = await import("@/lib/settlement.server");
    await simulateProviderConfirm(admin, notify, ids, 0);
  }
  return ids.length;
}

/** Applies an accepted milestone plan from a terms snapshot (used by acceptTerms). */
export async function applyMilestoneSnapshot(admin: any, deal: any, planned: any[]) {
  const current = await listMilestones(admin, deal.id);
  const keep = new Set(current.filter((m) => !["pending", "funded"].includes(m.status)).map((m) => m.id));
  const funded = deal.status === "in_progress";
  for (const m of current) await admin.from("deal_milestones").update({ seq: m.seq + 1000 }).eq("id", m.id);
  for (const m of current) if (!keep.has(m.id)) await admin.from("deal_milestones").delete().eq("id", m.id);
  for (const [i, p] of planned.entries()) {
    const row = { seq: i + 1, kind: p.kind ?? "work", title: p.title, description: p.description ?? null, amount: p.amount, due_date: p.due_date ?? null, evidence_required: p.evidence_required ?? null };
    if (p.id && keep.has(p.id)) await admin.from("deal_milestones").update({ seq: i + 1 }).eq("id", p.id);
    else await admin.from("deal_milestones").insert({ ...row, deal_id: deal.id, status: funded ? "funded" : "pending", funded_at: funded ? new Date().toISOString() : null });
  }
}

