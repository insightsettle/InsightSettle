import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { roundMoney } from "@/lib/money";

type Ctx = { supabase: any; userId: string; claims?: any };

async function admin() {
  const [{ supabaseAdmin }, notify] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("@/lib/notify.server"),
  ]);
  return { db: supabaseAdmin as any, notify };
}

async function requireStaff(ctx: Ctx) {
  const { requireStaffAccess } = await import("@/lib/staff-auth.server");
  await requireStaffAccess(ctx);
}

async function simConfirm(db: any, notify: any, ids: string[]) {
  const { simulateProviderConfirm } = await import("@/lib/settlement.server");
  await simulateProviderConfirm(db, notify, ids);
}

async function partyDeal(ctx: Ctx, dealId: string) {
  const { data, error } = await ctx.supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
  if (error) throw error;
  if (!data || (data.buyer_id !== ctx.userId && data.seller_id !== ctx.userId))
    throw new Error("You are not a party to this deal.");
  return data;
}

const HOURS = 3_600_000;

export const disputeReasons = [
  "not_received",
  "wrong_item",
  "damaged",
  "quantity_mismatch",
  "quality_issue",
  "late_delivery",
  "other",
] as const;

/** Party opens a dispute: funds are frozen, supplier notified, staff alerted. */
export const openDisputeCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; reason: string; details: string }) =>
    z
      .object({
        dealId: z.string().uuid(),
        reason: z.enum(disputeReasons),
        details: z.string().trim().min(10).max(3000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const deal = await partyDeal(context, data.dealId);
    if (!["held", "delivered", "under_review"].includes(deal.status))
      throw new Error("A dispute can only be opened while the funds are protected.");
    const { db, notify } = await admin();
    const { data: open } = await db
      .from("disputes")
      .select("id")
      .eq("deal_id", deal.id)
      .neq("status", "resolved")
      .maybeSingle();
    if (open) throw new Error("A dispute is already open on this deal.");

    const now = Date.now();
    const { data: dispute, error } = await db
      .from("disputes")
      .insert({
        deal_id: deal.id,
        opened_by: context.userId,
        reason: data.reason,
        details: data.details,
        status: "supplier_notified",
        response_deadline: new Date(now + 48 * HOURS).toISOString(),
        evidence_deadline: new Date(now + 72 * HOURS).toISOString(),
        resolution_deadline: new Date(now + 7 * 24 * HOURS).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    await db
      .from("deals")
      .update({ status: "disputed", disputed_reason: `${data.reason}: ${data.details}`.slice(0, 500) })
      .eq("id", deal.id);
    await db.from("deal_events").insert({
      deal_id: deal.id,
      actor_id: context.userId,
      title: "Dispute opened — release blocked",
      note: `${data.reason.replace(/_/g, " ")} · the other party has 48 hours to respond`,
    });
    await notify.notifyDealParties(db, deal.id, {
      title: `Dispute opened on ${deal.ref}`,
      body: "Funds are frozen until Insight reviews the case. Upload evidence within 72 hours.",
      kind: "dispute",
    });
    await notify.notifyUsers(db, {
      dealId: deal.id,
      title: `New dispute — ${deal.ref}`,
      body: data.details.slice(0, 200),
      kind: "dispute",
      recipients: await notify.staffUserIds(db),
    });
    return { id: dispute.id };
  });

/** Staff decision: full release, full refund, or split settlement. */
export const resolveDisputeCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { disputeId: string; outcome: string; buyerPercent?: number; note: string }) =>
      z
        .object({
          disputeId: z.string().uuid(),
          outcome: z.enum(["full_release", "full_refund", "partial_settlement"]),
          buyerPercent: z.number().min(0).max(100).optional(),
          note: z.string().trim().min(5).max(2000),
        })
        .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { db, notify } = await admin();
    const { data: dispute } = await db.from("disputes").select("*").eq("id", data.disputeId).maybeSingle();
    if (!dispute || dispute.status === "resolved") throw new Error("This dispute is already closed.");
    const { data: deal } = await db.from("deals").select("*").eq("id", dispute.deal_id).single();
    const { data: funding } = await db
      .from("deal_transactions")
      .select("id")
      .eq("deal_id", deal.id)
      .eq("kind", "funding")
      .eq("status", "succeeded")
      .maybeSingle();

    const pct =
      data.outcome === "full_refund" ? 100 : data.outcome === "full_release" ? 0 : (data.buyerPercent ?? 50);
    const amount = Number(deal.amount);
    const refund = roundMoney((amount * pct) / 100, deal.currency);
    const release = roundMoney(amount - refund, deal.currency);
    const rows: any[] = [];
    if (refund > 0)
      rows.push({
        kind: "refund",
        amount: refund,
        idempotency_key: `${deal.ref}-REFUND-${dispute.id.slice(0, 8)}`,
        original_transaction_id: funding?.id ?? null,
      });
    if (release > 0)
      rows.push({ kind: "release", amount: release, idempotency_key: `${deal.ref}-RELEASE-${dispute.id.slice(0, 8)}` });
    if (rows.length)
      await db.from("deal_transactions").insert(
        rows.map((r) => ({
          ...r,
          deal_id: deal.id,
          currency: deal.currency,
          status: "processing",
          provider: "manual",
          note: `Dispute decision: ${data.note}`.slice(0, 500),
          created_by: context.userId,
        })),
      );

    await db
      .from("disputes")
      .update({
        status: "resolved",
        outcome: data.outcome,
        buyer_percent: pct,
        resolution_note: data.note,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
        review_started_at: dispute.review_started_at ?? new Date().toISOString(),
      })
      .eq("id", dispute.id);
    await db
      .from("deals")
      .update({
        status: pct === 100 ? "refunded" : pct === 0 ? "released" : "partially_refunded",
        refunded_amount: refund,
        ...(pct < 100 ? { released_at: new Date().toISOString() } : {}),
      })
      .eq("id", deal.id);
    const label =
      pct === 100 ? "Full refund to the buyer" : pct === 0 ? "Full release to the seller" : `Split: buyer ${pct}% · seller ${100 - pct}%`;
    await db.from("deal_events").insert({
      deal_id: deal.id,
      actor_id: context.userId,
      title: `Dispute resolved — ${label}`,
      note: data.note,
    });
    await notify.notifyDealParties(db, deal.id, {
      title: `Dispute decision on ${deal.ref}`,
      body: `${label}. ${data.note}`.slice(0, 300),
      kind: "dispute",
    });
    return { ok: true };
  });

/** Cancellation follows the stage of the deal (PRD §36). */
export const cancelDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; reason: string }) =>
    z.object({ dealId: z.string().uuid(), reason: z.string().trim().min(3).max(1000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const deal = await partyDeal(context, data.dealId);
    const { db, notify } = await admin();
    if (deal.status === "disputed") throw new Error("Cancellation is disabled while a dispute is open.");
    if (deal.shipped_at || ["shipped", "in_transit", "out_for_delivery", "delivered"].includes(deal.shipping_status ?? ""))
      throw new Error("The item has shipped, so the deal can no longer be cancelled. Open a dispute instead.");

    if (deal.status === "pending_funding") {
      const { data: paid } = await db
        .from("deal_transactions")
        .select("id, amount, currency")
        .eq("deal_id", deal.id)
        .eq("kind", "funding")
        .in("status", ["processing", "succeeded"])
        .maybeSingle();
      await db.from("deals").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", deal.id);
      if (paid)
        await db.from("deal_transactions").insert({
          deal_id: deal.id,
          kind: "refund",
          amount: paid.amount,
          currency: paid.currency,
          status: "processing",
          provider: "manual",
          original_transaction_id: paid.id,
          idempotency_key: `${deal.ref}-REFUND-CANCEL`,
          note: "Full refund after cancellation",
          created_by: context.userId,
        });
      await db.from("deal_events").insert({ deal_id: deal.id, actor_id: context.userId, title: "Deal cancelled", note: data.reason });
      await notify.notifyDealParties(db, deal.id, { title: `Deal ${deal.ref} was cancelled`, body: data.reason, kind: "deal" });
      return { status: "cancelled" as const };
    }

    if (deal.status === "held") {
      await db.from("deal_events").insert({
        deal_id: deal.id,
        actor_id: context.userId,
        title: "Cancellation requested before shipment",
        note: `${data.reason}${deal.cancellation_conditions ? ` · Agreed terms: ${deal.cancellation_conditions}` : ""}`,
      });
      await notify.notifyDealParties(db, deal.id, { title: `Cancellation requested on ${deal.ref}`, body: data.reason, kind: "deal" });
      await notify.notifyUsers(db, {
        dealId: deal.id,
        title: `Cancellation to review — ${deal.ref}`,
        body: "Funds are secured and the item has not shipped. Apply the agreed cancellation terms.",
        kind: "deal",
        recipients: await notify.staffUserIds(db),
      });
      return { status: "requested" as const };
    }
    throw new Error("This deal can no longer be cancelled.");
  });

/** Staff operational actions with audit trail. */
export const staffAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      action: "freeze" | "unfreeze" | "request_documents" | "internal_note" | "account_state";
      dealId?: string;
      userId?: string;
      state?: "active" | "restricted" | "suspended";
      note: string;
    }) =>
      z
        .object({
          action: z.enum(["freeze", "unfreeze", "request_documents", "internal_note", "account_state"]),
          dealId: z.string().uuid().optional(),
          userId: z.string().uuid().optional(),
          state: z.enum(["active", "restricted", "suspended"]).optional(),
          note: z.string().trim().min(3).max(2000),
        })
        .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { db, notify } = await admin();
    const log = (entity: string, id: string, value: any) =>
      db.from("audit_logs").insert({
        user_id: context.userId,
        action: data.action.toUpperCase(),
        entity,
        entity_id: id,
        new_value: value,
      });

    if (data.action === "account_state") {
      if (!data.userId || !data.state) throw new Error("Choose a member and a state.");
      await db.from("profiles").update({ account_state: data.state }).eq("id", data.userId);
      await log("profiles", data.userId, { account_state: data.state, note: data.note });
      await notify.notifyUsers(db, {
        title: data.state === "active" ? "Your account is active again" : `Your account is ${data.state}`,
        body: data.note,
        kind: "account",
        recipients: [data.userId],
      });
      return { ok: true };
    }
    if (!data.dealId) throw new Error("Choose a deal.");
    const { data: deal } = await db.from("deals").select("id, ref").eq("id", data.dealId).single();

    if (data.action === "freeze" || data.action === "unfreeze") {
      const frozen = data.action === "freeze";
      await db.from("deals").update({ frozen, frozen_reason: frozen ? data.note : null }).eq("id", deal.id);
      await db.from("deal_events").insert({
        deal_id: deal.id,
        actor_id: context.userId,
        title: frozen ? "Deal frozen by Insight" : "Deal unfrozen by Insight",
        note: data.note,
      });
      await notify.notifyDealParties(db, deal.id, {
        title: frozen ? `Deal ${deal.ref} is on hold` : `Deal ${deal.ref} is active again`,
        body: data.note,
        kind: "deal",
      });
    } else if (data.action === "request_documents") {
      await db.from("deal_events").insert({
        deal_id: deal.id,
        actor_id: context.userId,
        title: "Insight requested documents",
        note: data.note,
      });
      await notify.notifyDealParties(db, deal.id, {
        title: `Documents requested on ${deal.ref}`,
        body: data.note,
        kind: "deal",
      });
    } else {
      await log("deals", deal.id, { internal_note: data.note });
    }
    return { ok: true };
  });

export const listInternalNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string }) => z.object({ dealId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { data: rows } = await context.supabase
      .from("audit_logs")
      .select("id, created_at, new_value, user_id")
      .eq("entity", "deals")
      .eq("entity_id", data.dealId)
      .eq("action", "INTERNAL_NOTE")
      .order("created_at", { ascending: false });
    return (rows ?? []).map((r: any) => ({
      id: r.id as string,
      created_at: r.created_at as string,
      note: String(r.new_value?.internal_note ?? ""),
    }));
  });

/** Every deal's disputes for the Insight console. */
export const listDisputeCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context);
    const { data } = await context.supabase
      .from("disputes")
      .select("*, deals(ref, title, amount, currency)")
      .order("created_at", { ascending: false });
    return (data ?? []) as any[];
  });
