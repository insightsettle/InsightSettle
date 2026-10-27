import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FeeBreakdown, LedgerRow, PayInQuote } from "@/lib/fees";
import { PAYMENT_METHODS, type MethodCheck, type PaymentMethod } from "@/lib/payment-methods";

export type FxQuote = {
  id: string;
  source_currency: string;
  target_currency: string;
  source_amount: number;
  customer_rate: number;
  customer_amount: number;
  fee: number;
  vat: number;
  total: number;
  expires_at: string;
  breakdown: FeeBreakdown;
  payIn: PayInQuote;
  /** Per-milestone funding: the milestone this quote funds (breakdown above is that milestone's share). */
  milestone?: { id: string; seq: number; title: string; amount: number };
  /** The payment method this quote is for; funding must use it (D-66). */
  method: PaymentMethod;
};

type QuoteMilestone = { id: string; seq: number; title: string; amount: number; breakdown: FeeBreakdown };

export type DealPricingView = {
  breakdown: FeeBreakdown;
  payIn: PayInQuote;
  ledger: LedgerRow[];
  /** From the buyer's used quote once the deal is funded; otherwise a live preview. */
  locked: boolean;
  method: PaymentMethod;
  methods: MethodCheck[];
};

const QUOTE_MINUTES = 15;

/** Currencies the buyer may pay in (C09-D19). Omitted = the buyer's country currency, else SAR. */
export const PAY_CURRENCIES = ["SAR", "AED", "BHD", "KWD", "QAR", "OMR", "USD"] as const;
const quoteInput = z.object({ dealId: z.string().uuid(), payCurrency: z.enum(PAY_CURRENCIES).optional(), method: z.enum(PAYMENT_METHODS).optional() });
type QuoteInput = { dealId: string; payCurrency?: string | undefined; method?: string | undefined };

/** Locks an exchange rate for 15 minutes. Every deal is funded from a quote (SAR deals at rate 1). */
/** What a customer may see of a price: no provider names, provider costs or Insight's margin (founder, 27 Oct). */
function customerMethods(methods: any[] | undefined) {
  return (methods ?? []).map(({ margin: _m, ...m }: any) => m);
}
function customerPricing<T extends Record<string, any>>(p: T) {
  const { routes: _r, routingMode: _rm, ...rest } = p as any;
  return { ...rest, methods: customerMethods(rest.methods) } as T;
}

export const requestFxQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: QuoteInput) => quoteInput.parse(input))
  .handler(async ({ data, context }): Promise<FxQuote> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: deal, error } = await admin.from("deals").select("*").eq("id", data.dealId).maybeSingle();
    if (error) throw error;
    if (!deal || deal.buyer_id !== context.userId) throw new Error("Only the buyer can request a quote.");
    const perMilestone = deal.funding_mode === "per_milestone";
    if (!perMilestone && deal.status !== "pending_funding") throw new Error("This deal is not waiting for funding.");

    const { priceDeal } = await import("@/lib/pricing.server");
    const p = await priceDeal(admin, deal, data.payCurrency, data.method);
    const check = p.methods.find((m) => m.method === p.method);
    if (!check?.allowed) throw new Error(check?.reason?.[0] ?? "This payment method is not available for this deal.");
    let milestone: QuoteMilestone | null = null;
    if (perMilestone) {
      // The next milestone is charged its pro-rata share of the whole-deal fee, locked by the first funding,
      // converted at today's rate (D-43, C07 rule 8).
      const { milestoneFundingGuard, getDealPricingLocked } = await import("@/lib/deal-rules.server");
      const blocked = await milestoneFundingGuard(admin, deal);
      if (blocked) throw new Error(blocked);
      const { nextUnfundedMilestone } = await import("@/lib/milestones.server");
      const next = await nextUnfundedMilestone(admin, deal.id);
      if (!next) throw new Error("Every milestone is already funded.");
      const { milestoneFundingBreakdown } = await import("@/lib/milestones");
      const { payInQuote } = await import("@/lib/fees");
      const dealBreakdown = deal.status === "pending_funding" ? p.breakdown : await getDealPricingLocked(admin, deal);
      const mb = milestoneFundingBreakdown(dealBreakdown, next.amounts, next.index);
      const payIn = payInQuote(mb, p.payIn.payCurrency, p.payIn.providerRate, p.payIn.customerRate);
      milestone = { id: next.milestone.id, seq: next.milestone.seq, title: next.milestone.title, amount: mb.amount, breakdown: mb };
      p.breakdown = dealBreakdown;
      p.payIn = payIn;
    }
    const shown = milestone?.breakdown ?? p.breakdown;
    const { data: q, error: qErr } = await admin
      .from("fx_quotes")
      .insert({
        deal_id: deal.id,
        source_currency: deal.currency,
        target_currency: p.payIn.payCurrency,
        source_amount: shown.amount,
        provider_rate: p.payIn.providerRate,
        customer_rate: p.payIn.customerRate,
        provider_amount: p.payIn.escrowConversion,
        customer_amount: p.payIn.escrowConversion + p.payIn.fxSpread,
        fx_spread: p.payIn.fxSpread,
        fee: p.payIn.insightFee,
        vat: p.payIn.vatPayable,
        total: p.payIn.total,
        // Customers can read fx_quotes: never store provider names, provider costs or Insight's margin here.
        breakdown: { ...customerPricing(p), terms_version: deal.terms_version, ...(milestone ? { milestone } : {}) },
        expires_at: new Date(Date.now() + QUOTE_MINUTES * 60_000).toISOString(),
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (qErr) throw qErr;
    // One deal = one provider: the route is recorded privately (service role only) and locked onto the deal at funding.
    const route = p.routes?.[p.method];
    const { error: rErr } = await admin.from("fx_quote_routes").insert({
      fx_quote_id: q.id, deal_id: deal.id,
      provider: route?.provider ?? "manual",
      rule_version: p.routes ? `${route?.version}${route?.ruleId ? `/${route.ruleId}` : ""}` : "simulated_only",
      reasons: route ? { reasons: route.reasons, rejected: route.rejected, unverified: route.unverified } : { reasons: ["routing_mode_simulated_only"] },
    });
    if (rErr) {
      await admin.from("fx_quotes").delete().eq("id", q.id);
      throw new Error(/must match/.test(rErr.message) ? "This deal's payment route is fixed. Please contact Insight support." : "The quote could not be created. Please try again.");
    }
    return {
      id: q.id,
      source_currency: q.source_currency,
      target_currency: q.target_currency,
      source_amount: Number(q.source_amount),
      customer_rate: Number(q.customer_rate),
      customer_amount: Number(q.customer_amount),
      fee: Number(q.fee),
      vat: Number(q.vat),
      total: Number(q.total),
      expires_at: q.expires_at,
      breakdown: shown,
      payIn: p.payIn,
      ...(milestone ? { milestone: { id: milestone.id, seq: milestone.seq, title: milestone.title, amount: milestone.amount } } : {}),
      method: p.method,
    };
  });

/** Fee, VAT and ledger view for a party or staff — the same numbers everywhere. */
export const getDealPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: QuoteInput) => quoteInput.parse(input))
  .handler(async ({ data, context }): Promise<DealPricingView> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: deal } = await admin.from("deals").select("*").eq("id", data.dealId).maybeSingle();
    if (!deal) throw new Error("Deal not found.");
    if (deal.buyer_id !== context.userId && deal.seller_id !== context.userId) {
      const { isStaffUser } = await import("@/lib/staff-auth.server");
      if (!(await isStaffUser(context))) throw new Error("You are not a party to this deal.");
    }
    const { ledgerPreview, priceDeal } = await import("@/lib/pricing.server");
    const { data: fund } = await admin
      .from("deal_transactions")
      .select("fx_quote_id")
      .eq("deal_id", deal.id)
      .eq("kind", "funding")
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fund?.fx_quote_id) {
      const { data: q } = await admin.from("fx_quotes").select("breakdown").eq("id", fund.fx_quote_id).maybeSingle();
      if (q?.breakdown?.breakdown) return { methods: [], method: "mada", ...customerPricing(q.breakdown), ledger: ledgerPreview(q.breakdown), locked: true };
    }
    const p = await priceDeal(admin, deal, data.payCurrency, data.method);
    return { breakdown: p.breakdown, payIn: p.payIn, ledger: ledgerPreview(p), locked: false, method: p.method, methods: customerMethods(p.methods) };
  });
