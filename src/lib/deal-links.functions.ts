/**
 * Deal links: create, list, pause (seller); public view; start a deal from a link (buyer).
 * All reads and writes go through the service role; the browser never reads deal_links directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dealLinkSchema, linkCodeSchema, linkState, newLinkCode, type LinkState } from "@/lib/deal-links";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type MyDealLink = {
  id: string; code: string; title: string; dealType: string; amount: number; currency: string; feePayer: string;
  inspectionDays: number; deliveryDays: number; uses: number; maxUses: number | null; expiresAt: string | null;
  state: LinkState; createdAt: string; dealsStarted: number; dealsPaid: number;
};

export type PublicDealLink = {
  code: string; state: LinkState; dealType: string; title: string; description: string; amount: number; currency: string;
  quantity: number; feePayer: string; inspectionDays: number; deliveryDays: number; shippingRequired: boolean;
  supplierCountry: string | null; acceptanceCriteria: string; refundConditions: string; autoRelease: boolean;
  seller: { name: string; verified: boolean }; isOwner: boolean;
};

export const createDealLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.input<typeof dealLinkSchema>) => dealLinkSchema.parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: me } = await db.from("profiles").select("account_state").eq("id", context.userId).maybeSingle();
    if (!me || me.account_state !== "active") throw new Error("Your account cannot create deal links while suspended or restricted. Contact Insight support.");
    // Buyers can only pay a deal whose seller has a verified payout account in the deal currency (D-24).
    const { supplierPayoutOk } = await import("@/lib/deal-rules.server");
    if (!(await supplierPayoutOk(db, { seller_id: context.userId, currency: data.currency })))
      throw new Error(`Add a verified payout bank account in ${data.currency} (Account → Settlement bank account) before creating a link in this currency.`);
    const { count } = await db.from("deal_links").select("id", { count: "exact", head: true }).eq("owner_id", context.userId).eq("active", true);
    if ((count ?? 0) >= 50) throw new Error("You already have 50 active deal links. Pause one before creating another.");
    const shipping = data.dealType === "goods" ? data.shippingRequired : false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = newLinkCode();
      const { data: row, error } = await db.from("deal_links").insert({
        code, owner_id: context.userId, deal_type: data.dealType, title: data.title, description: data.description,
        amount: data.amount, currency: data.currency, quantity: data.quantity, fee_payer: data.feePayer,
        inspection_days: data.inspectionDays, delivery_days: data.deliveryDays, shipping_required: shipping,
        shipping_responsibility: shipping ? data.shippingResponsibility : "none", supplier_country: data.supplierCountry,
        acceptance_criteria: data.acceptanceCriteria, refund_conditions: data.refundConditions,
        cancellation_conditions: data.cancellationConditions, auto_release: data.autoRelease, max_uses: data.maxUses,
        expires_at: data.expiresInDays ? new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString() : null,
      }).select("code").single();
      if (!error) return { code: row.code as string };
      if (!/duplicate|unique/i.test(error.message)) throw new Error("The deal link could not be created. Please try again.");
    }
    throw new Error("The deal link could not be created. Please try again.");
  });

export const listMyDealLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyDealLink[]> => {
    const db = await admin();
    const { data, error } = await db.from("deal_links").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const ids = (data ?? []).map((l: any) => l.id);
    const { data: deals } = ids.length ? await db.from("deals").select("id,deal_link_id,status").in("deal_link_id", ids) : { data: [] };
    return (data ?? []).map((l: any) => {
      const mine = (deals ?? []).filter((d: any) => d.deal_link_id === l.id);
      return {
        id: l.id, code: l.code, title: l.title, dealType: l.deal_type, amount: Number(l.amount), currency: l.currency, feePayer: l.fee_payer,
        inspectionDays: l.inspection_days, deliveryDays: l.delivery_days, uses: l.uses, maxUses: l.max_uses, expiresAt: l.expires_at,
        state: linkState(l), createdAt: l.created_at, dealsStarted: mine.length,
        dealsPaid: mine.filter((d: any) => d.status !== "pending_funding" && d.status !== "rejected" && d.status !== "cancelled").length,
      };
    });
  });

export const setDealLinkActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; active: boolean }) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: row, error } = await db.from("deal_links").update({ active: data.active, updated_at: new Date().toISOString() })
      .eq("id", data.id).eq("owner_id", context.userId).select("id").maybeSingle();
    if (error || !row) throw new Error("This deal link could not be changed.");
    return { ok: true };
  });

/** Public: anyone with the link can see the offer. Only safe fields are returned. */
export const getPublicDealLink = createServerFn({ method: "GET" })
  .inputValidator((i: { code: string; viewerId?: string | null }) => z.object({ code: linkCodeSchema, viewerId: z.string().uuid().nullable().optional() }).parse(i))
  .handler(async ({ data }): Promise<PublicDealLink | null> => {
    const db = await admin();
    const { data: l } = await db.from("deal_links").select("*").eq("code", data.code).maybeSingle();
    if (!l) return null;
    const { data: p } = await db.from("profiles").select("full_name,verification_status").eq("id", l.owner_id).maybeSingle();
    const name = String(p?.full_name ?? "").trim();
    return {
      code: l.code, state: linkState(l), dealType: l.deal_type, title: l.title, description: l.description, amount: Number(l.amount),
      currency: l.currency, quantity: Number(l.quantity), feePayer: l.fee_payer, inspectionDays: l.inspection_days, deliveryDays: l.delivery_days,
      shippingRequired: l.shipping_required, supplierCountry: l.supplier_country, acceptanceCriteria: l.acceptance_criteria,
      refundConditions: l.refund_conditions, autoRelease: l.auto_release,
      seller: { name: name || "Insight member", verified: p?.verification_status === "verified" },
      isOwner: !!data.viewerId && data.viewerId === l.owner_id,
    };
  });

/** Buyer: start (or reopen) a deal from a link. The seller's offer becomes terms version 1; the buyer accepts them on the deal page. */
export const startDealFromLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string }) => z.object({ code: linkCodeSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: l } = await db.from("deal_links").select("*").eq("code", data.code).maybeSingle();
    if (!l) throw new Error("This deal link is not valid.");
    if (l.owner_id === context.userId) throw new Error("This is your own deal link. Share it with the buyer.");
    const { data: me } = await db.from("profiles").select("account_state").eq("id", context.userId).maybeSingle();
    if (!me || me.account_state !== "active") throw new Error("Your account cannot start deals while suspended or restricted. Contact Insight support.");
    // A buyer who opens the same link again within a day gets the deal they already started (no duplicates).
    const { data: existing } = await db.from("deals").select("ref").eq("deal_link_id", l.id).eq("buyer_id", context.userId)
      .eq("status", "pending_funding").gt("created_at", new Date(Date.now() - 86_400_000).toISOString()).limit(1).maybeSingle();
    if (existing) return { ref: existing.ref as string, reused: true };
    const state = linkState(l);
    if (state !== "open") throw new Error(state === "expired" ? "This deal link has expired." : state === "sold_out" ? "This offer is no longer available." : "The seller has paused this deal link.");
    // Claim one use atomically.
    const { data: claimed } = await db.from("deal_links").update({ uses: l.uses + 1, updated_at: new Date().toISOString() })
      .eq("id", l.id).eq("uses", l.uses).select("id").maybeSingle();
    if (!claimed) throw new Error("Many buyers opened this link at once. Please try again.");
    const due = new Date(Date.now() + l.delivery_days * 86_400_000).toISOString().slice(0, 10);
    const { data: deal, error } = await db.from("deals").insert({
      deal_type: l.deal_type, title: l.title, description: l.description, amount: l.amount, currency: l.currency,
      created_by: l.owner_id, seller_id: l.owner_id, buyer_id: context.userId, deal_link_id: l.id,
      due_at: due, fee_payer: l.fee_payer, inspection_days: l.inspection_days,
      shipping_status: l.shipping_required ? "preparing" : "not_required", shipping_responsibility: l.shipping_responsibility,
      status: "pending_funding", terms_status: "pending", terms_version: 1,
      quantity: l.quantity, unit_price: Number(l.amount) / Number(l.quantity),
      supplier_country: l.supplier_country, delivery_country: null,
      acceptance_criteria: l.acceptance_criteria || null, refund_conditions: l.refund_conditions || null,
      cancellation_conditions: l.cancellation_conditions || null, auto_release_enabled: l.auto_release,
      revisions_included: 0, retention_percent: 0, defects_liability_days: 0, funding_mode: "upfront",
    }).select("*").single();
    if (error) {
      await db.from("deal_links").update({ uses: l.uses }).eq("id", l.id).eq("uses", l.uses + 1);
      throw new Error("The deal could not be started. Please try again.");
    }
    const { snapshotOf } = await import("@/lib/deal-milestones.functions");
    await db.from("deal_term_versions").insert({ deal_id: deal.id, version: 1, snapshot: snapshotOf(deal, []), note: "Terms from the seller's deal link", created_by: l.owner_id });
    await db.from("deal_events").insert([
      { deal_id: deal.id, actor_id: l.owner_id, title: "Deal created from the seller's deal link", note: `Link ${l.code} · type: ${l.deal_type} · fee: ${l.fee_payer} · inspection period: ${l.inspection_days} day(s)` },
      { deal_id: deal.id, actor_id: context.userId, title: "Buyer joined through the deal link — review and accept the terms" },
    ]);
    const { notifyUsers } = await import("@/lib/notify.server");
    await notifyUsers(db, { dealId: deal.id, dealRef: deal.ref, title: "A buyer started a deal from your deal link", body: l.title, kind: "deal", recipients: [l.owner_id] });
    return { ref: deal.ref as string, reused: false };
  });
