/**
 * Deal creation by type and milestone party actions (Batch C). Parties never write deals or milestones directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEAL_TYPES, validateMilestones, type DealType } from "@/lib/milestones";

const milestoneSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  amount: z.number().positive().max(100_000_000),
  dueDate: z.string().max(20).nullable().optional(),
  evidenceRequired: z.string().trim().max(500).nullable().optional(),
  kind: z.enum(["advance", "work"]).optional(),
});

async function deps() {
  const [{ supabaseAdmin }, notify] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("@/lib/notify.server"),
  ]);
  return { admin: supabaseAdmin as any, notify };
}

async function partyLoad(userId: string, dealId: string) {
  const { admin, notify } = await deps();
  const { data: deal } = await admin.from("deals").select("*").eq("id", dealId).maybeSingle();
  if (!deal) throw new Error("Deal not found.");
  const isBuyer = deal.buyer_id === userId;
  const isSeller = deal.seller_id === userId;
  if (!isBuyer && !isSeller) throw new Error("You are not a party to this deal.");
  if (deal.frozen) throw new Error("This deal is frozen by Insight.");
  return { admin, notify, deal, isBuyer, isSeller };
}

async function record(admin: any, notify: any, dealId: string, actor: string | null, title: string, note: string | null) {
  await admin.from("deal_events").insert({ deal_id: dealId, actor_id: actor, title, note });
  await notify.notifyDealParties(admin, dealId, { title, body: note, kind: "deal" });
}

function snapshotOf(d: any, milestones: any[]) {
  return {
    title: d.title, amount: Number(d.amount), currency: d.currency, quantity: Number(d.quantity ?? 1), unit_price: d.unit_price,
    due_at: d.due_at, inspection_days: d.inspection_days, fee_payer: d.fee_payer, shipping_responsibility: d.shipping_responsibility,
    acceptance_criteria: d.acceptance_criteria, refund_conditions: d.refund_conditions, cancellation_conditions: d.cancellation_conditions,
    deal_type: d.deal_type, retention_percent: Number(d.retention_percent), defects_liability_days: d.defects_liability_days,
    funding_mode: d.funding_mode, revisions_included: d.revisions_included,
    milestones: milestones.map((m, i) => ({
      id: m.id ?? null, seq: i + 1, kind: m.kind ?? "work", title: m.title, description: m.description ?? null,
      amount: Number(m.amount), due_date: m.dueDate ?? m.due_date ?? null, evidence_required: m.evidenceRequired ?? m.evidence_required ?? null,
    })),
  };
}

const createSchema = z.object({
  dealType: z.enum(DEAL_TYPES),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000),
  amount: z.number().positive().max(100_000_000),
  currency: z.enum(["SAR", "BHD", "AED", "QAR", "KWD", "OMR", "USD"]),
  role: z.enum(["buyer", "seller"]),
  counterpartyEmail: z.string().trim().email().or(z.literal("")),
  dueAt: z.string().max(20).nullable(),
  feePayer: z.enum(["buyer", "seller", "split"]),
  inspectionDays: z.number().int().min(1).max(30),
  shippingRequired: z.boolean(),
  quantity: z.number().positive().max(1_000_000),
  supplierCountry: z.string().max(10).nullable(),
  deliveryCountry: z.string().max(10).nullable(),
  shippingResponsibility: z.enum(["seller", "buyer", "none"]),
  acceptanceCriteria: z.string().max(3000),
  refundConditions: z.string().max(3000),
  cancellationConditions: z.string().max(3000),
  autoRelease: z.boolean(),
  revisionsIncluded: z.number().int().min(0).max(20),
  retentionPercent: z.number().min(0).max(10),
  defectsLiabilityDays: z.number().int().min(0).max(365),
  fundingMode: z.enum(["upfront", "per_milestone"]),
  milestones: z.array(milestoneSchema).max(20),
});

/** Creates a typed deal with its milestone plan and terms version 1, all on the server. */
export const createTypedDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.input<typeof createSchema>) => createSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { admin } = await deps();
    const { data: me } = await admin.from("profiles").select("account_state").eq("id", context.userId).maybeSingle();
    if (me && me.account_state !== "active") throw new Error(`Your account is ${me.account_state}, so this action is not available. Contact Insight support.`);
    const type = data.dealType as DealType;
    if (data.fundingMode === "per_milestone") throw new Error("Funding each milestone separately is not available yet. Choose fund all upfront.");
    const ms = type === "goods" ? [] : data.milestones;
    const invalid = validateMilestones(data.amount, data.currency, ms, type);
    if (invalid) throw new Error(invalid);
    const isContract = type === "contracting";
    const shipping = type === "goods" ? data.shippingRequired : false;
    const { data: deal, error } = await admin
      .from("deals")
      .insert({
        deal_type: type, title: data.title, description: data.description, amount: data.amount, currency: data.currency,
        created_by: context.userId,
        buyer_id: data.role === "buyer" ? context.userId : null,
        seller_id: data.role === "seller" ? context.userId : null,
        counterparty_email: data.counterpartyEmail || null, due_at: data.dueAt, fee_payer: data.feePayer,
        inspection_days: data.inspectionDays, shipping_status: shipping ? "preparing" : "not_required",
        shipping_responsibility: shipping ? data.shippingResponsibility : "none",
        status: "pending_funding", terms_status: "pending", terms_version: 1,
        quantity: data.quantity, unit_price: data.amount / data.quantity,
        supplier_country: data.supplierCountry, delivery_country: data.deliveryCountry,
        acceptance_criteria: data.acceptanceCriteria || null, refund_conditions: data.refundConditions || null,
        cancellation_conditions: data.cancellationConditions || null, auto_release_enabled: data.autoRelease,
        revisions_included: type === "freelance" ? data.revisionsIncluded : 0,
        retention_percent: isContract ? data.retentionPercent : 0,
        defects_liability_days: isContract ? data.defectsLiabilityDays : 0,
        funding_mode: "upfront",
      })
      .select("*")
      .single();
    if (error) throw error;
    if (ms.length) {
      const { error: mErr } = await admin.from("deal_milestones").insert(
        ms.map((m, i) => ({
          deal_id: deal.id, seq: i + 1, kind: m.kind ?? "work", title: m.title, description: m.description ?? null,
          amount: m.amount, due_date: m.dueDate || null, evidence_required: m.evidenceRequired ?? null, status: "pending",
        })),
      );
      if (mErr) throw mErr;
    }
    await admin.from("deal_events").insert({
      deal_id: deal.id, actor_id: context.userId, title: "Deal created and invitation link generated",
      note: `Type: ${type} · fee: ${data.feePayer} · inspection period: ${data.inspectionDays} day(s)${ms.length ? ` · ${ms.length} milestones` : ""}`,
    });
    await admin.from("deal_term_versions").insert({
      deal_id: deal.id, version: 1, snapshot: snapshotOf(deal, ms), note: "Initial terms", created_by: context.userId,
    });
    return { id: deal.id as string, ref: deal.ref as string, invite_token: deal.invite_token as string };
  });

/** Variation / أمر تغيير: a new milestone plan becomes a new terms version that the other party must accept. */
export const proposeVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; note: string; milestones: z.input<typeof milestoneSchema>[] }) =>
    z.object({ dealId: z.string().uuid(), note: z.string().trim().min(3).max(1000), milestones: z.array(milestoneSchema).min(2).max(20) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { admin, notify, deal } = await partyLoad(context.userId, data.dealId);
    if (!["pending_funding", "in_progress"].includes(deal.status)) throw new Error("Milestones can no longer be changed on this deal.");
    const invalid = validateMilestones(Number(deal.amount), deal.currency, data.milestones, deal.deal_type);
    if (invalid) throw new Error(invalid);
    const { listMilestones } = await import("@/lib/milestones.server");
    const current = await listMilestones(admin, deal.id);
    const locked = current.filter((m) => !["pending", "funded"].includes(m.status));
    for (const l of locked) {
      const p = data.milestones.find((m) => m.id === l.id);
      if (!p || p.amount !== Number(l.amount) || p.title !== l.title)
        throw new Error(`Milestone ${l.seq} has already started and cannot be changed in a variation.`);
    }
    const next = (Number(deal.terms_version) || 1) + 1;
    await admin.from("deals").update({ terms_version: next, terms_status: "pending", terms_note: data.note }).eq("id", deal.id);
    await admin.from("deal_term_versions").insert({
      deal_id: deal.id, version: next, snapshot: { ...snapshotOf(deal, data.milestones), variation: true }, note: data.note, created_by: context.userId,
    });
    await record(admin, notify, deal.id, context.userId, `Variation proposed — terms version ${next}`, data.note);
    return { ok: true, version: next };
  });

/** Applies an accepted milestone plan from a terms snapshot (used by acceptTerms). */
export async function applyMilestoneSnapshot(admin: any, deal: any, planned: any[]) {
  const { listMilestones } = await import("@/lib/milestones.server");
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

const msOnly = z.object({ dealId: z.string().uuid(), milestoneId: z.string().uuid() });

async function loadMilestone(admin: any, dealId: string, milestoneId: string) {
  const { data: m } = await admin.from("deal_milestones").select("*").eq("id", milestoneId).eq("deal_id", dealId).maybeSingle();
  if (!m) throw new Error("Milestone not found.");
  return m;
}

/** Supplier submits a milestone with evidence; the buyer's inspection period starts on the server clock. */
export const submitMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; milestoneId: string; note: string; files?: string[] }) =>
    msOnly.extend({ note: z.string().trim().min(3).max(2000), files: z.array(z.string().max(300)).max(20).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { admin, notify, deal, isSeller } = await partyLoad(context.userId, data.dealId);
    if (!isSeller) throw new Error("Only the supplier can submit a milestone.");
    if (deal.status !== "in_progress") throw new Error("Milestones can be submitted once the funds are held.");
    const m = await loadMilestone(admin, deal.id, data.milestoneId);
    if (!["funded", "revision_requested"].includes(m.status)) throw new Error("This milestone is not ready to be submitted.");
    const now = new Date();
    const due = new Date(now.getTime() + Number(deal.inspection_days) * 86_400_000);
    await admin.from("deal_milestones").update({
      status: "submitted", submitted_at: now.toISOString(), auto_release_at: due.toISOString(),
      evidence_note: `${data.note}${data.files?.length ? `\nFiles: ${data.files.join(", ")}` : ""}`, revision_note: null,
    }).eq("id", m.id).in("status", ["funded", "revision_requested"]);
    await record(admin, notify, deal.id, context.userId, `Milestone ${m.seq} submitted with evidence`, `${m.title} · inspection ends ${due.toISOString().slice(0, 10)}`);
    return { ok: true };
  });

/** Buyer approves: release of the milestone amount minus retention, confirmed by the payment provider. */
export const approveMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; milestoneId: string }) => msOnly.parse(i))
  .handler(async ({ data, context }) => {
    const { admin, notify, deal, isBuyer } = await partyLoad(context.userId, data.dealId);
    if (!isBuyer) throw new Error("Only the buyer can approve a milestone.");
    const m = await loadMilestone(admin, deal.id, data.milestoneId);
    if (m.status !== "submitted") throw new Error("Only a submitted milestone can be approved.");
    const { data: claimed } = await admin.from("deal_milestones").update({ approved_at: new Date().toISOString(), auto_release_at: null })
      .eq("id", m.id).eq("status", "submitted").is("approved_at", null).select("id");
    if (!claimed?.length) throw new Error("This milestone is already approved.");
    const { createMilestoneRelease } = await import("@/lib/milestones.server");
    const tx = await createMilestoneRelease(admin, deal, m.id, context.userId, `Buyer approved milestone ${m.seq}`);
    await record(admin, notify, deal.id, context.userId, `Milestone ${m.seq} approved — release started`, m.title);
    const { getPaymentProvider } = await import("@/lib/payment-provider.server");
    if (!getPaymentProvider().connected) {
      const { simulateProviderConfirm } = await import("@/lib/settlement.server");
      await simulateProviderConfirm(admin, notify, [tx.id]);
    }
    return { ok: true };
  });

/** Buyer asks for a revision: the timer pauses; resubmission starts a new full inspection period. */
export const requestMilestoneRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; milestoneId: string; note: string }) => msOnly.extend({ note: z.string().trim().min(3).max(1000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { admin, notify, deal, isBuyer } = await partyLoad(context.userId, data.dealId);
    if (!isBuyer) throw new Error("Only the buyer can ask for a revision.");
    const m = await loadMilestone(admin, deal.id, data.milestoneId);
    if (m.status !== "submitted") throw new Error("A revision can be requested on a submitted milestone.");
    await admin.from("deal_milestones").update({ status: "revision_requested", auto_release_at: null, revision_note: data.note }).eq("id", m.id).eq("status", "submitted");
    await record(admin, notify, deal.id, context.userId, `Revision requested on milestone ${m.seq}`, data.note);
    return { ok: true };
  });
