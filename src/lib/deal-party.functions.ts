/**
 * Party actions on a deal. Parties cannot write deal fields directly (database trigger + no party
 * UPDATE policy); every step goes through here, which checks the caller's side and the current status.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { userId: string };

function snapshot(d: any) {
  return {
    title: d.title, amount: Number(d.amount), currency: d.currency, quantity: Number(d.quantity ?? 1),
    unit_price: d.unit_price, due_at: d.due_at, inspection_days: d.inspection_days, fee_payer: d.fee_payer,
    shipping_responsibility: d.shipping_responsibility, acceptance_criteria: d.acceptance_criteria,
    refund_conditions: d.refund_conditions, cancellation_conditions: d.cancellation_conditions,
  };
}

async function load(context: Ctx, dealId: string, shipping = false) {
  const [{ supabaseAdmin }, notify] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("@/lib/notify.server"),
  ]);
  const admin = supabaseAdmin as any;
  const { data: deal } = await admin.from("deals").select("*").eq("id", dealId).maybeSingle();
  if (!deal) throw new Error("Deal not found.");
  const isBuyer = deal.buyer_id === context.userId;
  let isSeller = deal.seller_id === context.userId;
  if (shipping && deal.deal_type === 'auction') {
    const { data: lot } = await admin.from('auction_lots').select('auction_id').eq('id', deal.auction_lot_id).single();
    const { data: auction } = await admin.from('auctions').select('organiser_id').eq('id', lot?.auction_id).single();
    isSeller = auction?.organiser_id === context.userId;
  }
  if (!isBuyer && !isSeller) throw new Error("You are not a party to this deal.");
  if (deal.frozen) throw new Error("This deal is frozen by Insight.");
  return { admin, notify, deal, isBuyer, isSeller };
}

async function record(admin: any, notify: any, dealId: string, actor: string, title: string, note: string | null, alertStaff = false) {
  await admin.from("deal_events").insert({ deal_id: dealId, actor_id: actor, title, note });
  await notify.notifyDealParties(admin, dealId, { title, body: note, kind: "deal" });
  if (alertStaff) {
    const staff = await notify.staffUserIds(admin);
    await notify.notifyUsers(admin, { dealId, title, body: note, kind: "deal", recipients: staff });
  }
}

const idOnly = z.object({ dealId: z.string().uuid() });
const withNote = z.object({ dealId: z.string().uuid(), note: z.string().trim().min(3).max(1000) });

/** Only the counterparty of the latest terms version can accept it. */
export const acceptTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string }) => idOnly.parse(i))
  .handler(async ({ data, context }) => {
    const { admin, notify, deal, isSeller } = await load(context, data.dealId, true);
    if (deal.status !== "pending_funding" && deal.status !== "in_progress") throw new Error("Terms can only be accepted before funding.");
    if (!deal.buyer_id || !deal.seller_id) throw new Error("Both parties must join before the terms can be accepted.");
    const { latestTerms, supplierPayoutOk, PAYOUT_ACCOUNT_MESSAGE } = await import("@/lib/deal-rules.server");
    const terms = await latestTerms(admin, deal.id);
    if (!terms || terms.version !== deal.terms_version) throw new Error("The latest terms version could not be found.");
    if (terms.accepted_at) throw new Error("This terms version is already accepted.");
    const proposer = terms.created_by ?? deal.created_by;
    if (proposer === context.userId) throw new Error("The other party must accept the terms you proposed.");
    if (isSeller && !(await supplierPayoutOk(admin, deal))) throw new Error(PAYOUT_ACCOUNT_MESSAGE);
    const now = new Date().toISOString();
    const { data: claimed } = await admin
      .from("deal_term_versions")
      .update({ accepted_by: context.userId, accepted_at: now })
      .eq("id", terms.id)
      .is("accepted_at", null)
      .select("id");
    if (!claimed?.length) throw new Error("This terms version is already accepted.");
    const planned = (terms as any).snapshot?.milestones;
    if (Array.isArray(planned) && planned.length) {
      const { applyMilestoneSnapshot } = await import("@/lib/milestones.server");
      await applyMilestoneSnapshot(admin, deal, planned);
    }
    await admin.from("deals").update({ terms_status: "agreed", terms_note: null }).eq("id", deal.id);
    await record(admin, notify, deal.id, context.userId,
      (terms as any).snapshot?.variation ? `Variation accepted — terms version ${terms.version}` : `Terms version ${terms.version} accepted by both parties`, null);
    return { ok: true };
  });

export const requestTermsChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; note: string }) => withNote.parse(i))
  .handler(async ({ data, context }) => {
    const { admin, notify, deal } = await load(context, data.dealId);
    if (deal.status !== "pending_funding" || deal.terms_status === "agreed") throw new Error("These terms can no longer be changed.");
    await admin.from("deals").update({ terms_status: "changes_requested", terms_note: data.note }).eq("id", deal.id);
    await record(admin, notify, deal.id, context.userId, "Changes requested on the deal terms", data.note);
    return { ok: true };
  });

export const rejectTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; note: string }) => withNote.parse(i))
  .handler(async ({ data, context }) => {
    const { admin, notify, deal } = await load(context, data.dealId);
    if (deal.status !== "pending_funding" || deal.terms_status === "agreed") throw new Error("These terms can no longer be rejected.");
    await admin.from("deals").update({ terms_status: "rejected", terms_note: data.note, status: "rejected" }).eq("id", deal.id);
    await record(admin, notify, deal.id, context.userId, "Deal terms rejected", data.note);
    return { ok: true };
  });

/** Any edit creates a new terms version and clears acceptance. */
export const proposeNewTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; amount?: number; quantity?: number; dueAt?: string | null; inspectionDays?: number; note: string }) =>
    z
      .object({
        dealId: z.string().uuid(),
        amount: z.number().positive().max(100_000_000).optional(),
        quantity: z.number().positive().max(1_000_000).optional(),
        dueAt: z.string().max(20).nullable().optional(),
        inspectionDays: z.number().int().min(1).max(30).optional(),
        note: z.string().trim().min(3).max(1000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { admin, notify, deal } = await load(context, data.dealId);
    if (deal.status !== "pending_funding") throw new Error("Core terms cannot change after the payment is secured.");
    const next = (Number(deal.terms_version) || 1) + 1;
    const patch: Record<string, unknown> = { terms_version: next, terms_status: "pending", terms_note: data.note };
    if (data.amount) patch["amount"] = data.amount;
    if (data.quantity) patch["quantity"] = data.quantity;
    if (data.dueAt !== undefined) patch["due_at"] = data.dueAt;
    if (data.inspectionDays !== undefined) patch["inspection_days"] = data.inspectionDays;
    const { data: updated, error } = await admin.from("deals").update(patch).eq("id", deal.id).select("*").single();
    if (error) throw error;
    await admin.from("deal_term_versions").insert({
      deal_id: deal.id, version: next, snapshot: snapshot(updated), note: data.note, created_by: context.userId,
    });
    await record(admin, notify, deal.id, context.userId, `Terms version ${next} proposed`, data.note);
    return { ok: true, version: next };
  });

export const updateShipping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; carrier: string; tracking: string; status: string; eta?: string | null }) =>
    z
      .object({
        dealId: z.string().uuid(),
        carrier: z.string().trim().max(120),
        tracking: z.string().trim().max(120),
        status: z.enum(["preparing", "shipped", "in_transit", "out_for_delivery"]),
        eta: z.string().max(20).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { admin, notify, deal, isSeller } = await load(context, data.dealId);
    if (!isSeller) throw new Error("Only the seller can update shipping.");
    if (deal.status !== "held") throw new Error("Shipping can be updated once the funds are held.");
    if (deal.shipping_status === "not_required") throw new Error("This deal does not need shipping.");
    const { error } = await admin
      .from("deals")
      .update({
        shipping_carrier: data.carrier || null,
        shipping_tracking: data.tracking || null,
        shipping_status: data.status,
        ...(data.eta ? { estimated_delivery_at: data.eta } : {}),
        ...(data.status !== "preparing" && !deal.shipped_at ? { shipped_at: new Date().toISOString() } : {}),
      })
      .eq("id", deal.id);
    if (error) throw error;
    const note = `${data.carrier || "Carrier"} · ${data.tracking || "no tracking number"} · ${data.status}`;
    await record(admin, notify, deal.id, context.userId, "Shipping details updated", note);
    return { ok: true };
  });

/** Seller confirms delivery; the inspection period (from the agreed terms) starts on the server clock. */
export const confirmDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string }) => idOnly.parse(i))
  .handler(async ({ data, context }) => {
    const { admin, notify, deal, isSeller } = await load(context, data.dealId, true);
    if (!isSeller) throw new Error("Only the seller can confirm delivery.");
    if (deal.status !== "held" && deal.status !== "under_review") throw new Error("Delivery can be confirmed only while the funds are held.");
    const now = new Date();
    const autoRelease = new Date(now.getTime() + Number(deal.inspection_days) * 86_400_000);
    const { error } = await admin
      .from("deals")
      .update({
        status: "delivered",
        ...(deal.shipping_status !== "not_required" ? { shipping_status: "delivered" } : {}),
        delivered_at: now.toISOString(),
        auto_release_at: autoRelease.toISOString(),
      })
      .eq("id", deal.id)
      .in("status", ["held", "under_review"]);
    if (error) throw error;
    await record(admin, notify, deal.id, context.userId, deal.status === "under_review" ? "Seller resubmitted the delivery — a new full inspection period started" : "Seller confirmed delivery", `Buyer inspection period ends ${autoRelease.toISOString().slice(0, 10)}`);
    return { ok: true };
  });

export const requestRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; note: string }) => withNote.parse(i))
  .handler(async ({ data, context }) => {
    const { admin, notify, deal, isBuyer } = await load(context, data.dealId);
    if (!isBuyer) throw new Error("Only the buyer can ask for a revision.");
    if (deal.status !== "delivered") throw new Error("A revision can be requested after delivery is confirmed.");
    const used = Number(deal.revisions_used ?? 0);
    if (deal.deal_type === "freelance" && used >= Number(deal.revisions_included ?? 0))
      throw new Error("All included revisions are used. Accept the work or open a dispute.");
    await admin.from("deals").update({ status: "under_review", auto_release_at: null, revisions_used: used + 1 }).eq("id", deal.id).eq("status", "delivered");
    await record(admin, notify, deal.id, context.userId, "Buyer asked for a revision before releasing funds", data.note);
    return { ok: true };
  });
