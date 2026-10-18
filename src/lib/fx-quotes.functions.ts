import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FeeBreakdown, LedgerRow, PayInQuote } from "@/lib/fees";

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
};

export type DealPricingView = {
  breakdown: FeeBreakdown;
  payIn: PayInQuote;
  ledger: LedgerRow[];
  /** From the buyer's used quote once the deal is funded; otherwise a live preview. */
  locked: boolean;
};

const QUOTE_MINUTES = 15;

/** Currencies the buyer may pay in (C09-D19). Omitted = the buyer's country currency, else SAR. */
export const PAY_CURRENCIES = ["SAR", "AED", "BHD", "KWD", "QAR", "OMR", "USD"] as const;
const quoteInput = z.object({ dealId: z.string().uuid(), payCurrency: z.enum(PAY_CURRENCIES).optional() });

/** Locks an exchange rate for 15 minutes. Every deal is funded from a quote (SAR deals at rate 1). */
export const requestFxQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string; payCurrency?: string | undefined }) => quoteInput.parse(input))
  .handler(async ({ data, context }): Promise<FxQuote> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: deal, error } = await admin.from("deals").select("*").eq("id", data.dealId).maybeSingle();
    if (error) throw error;
    if (!deal || deal.buyer_id !== context.userId) throw new Error("Only the buyer can request a quote.");
    if (deal.status !== "pending_funding") throw new Error("This deal is not waiting for funding.");

    const { priceDeal } = await import("@/lib/pricing.server");
    const p = await priceDeal(admin, deal, data.payCurrency);
    const { data: q, error: qErr } = await admin
      .from("fx_quotes")
      .insert({
        deal_id: deal.id,
        source_currency: deal.currency,
        target_currency: p.payIn.payCurrency,
        source_amount: Number(deal.amount),
        provider_rate: p.payIn.providerRate,
        customer_rate: p.payIn.customerRate,
        provider_amount: p.payIn.escrowConversion,
        customer_amount: p.payIn.escrowConversion + p.payIn.fxSpread,
        fx_spread: p.payIn.fxSpread,
        fee: p.payIn.insightFee,
        vat: p.payIn.vatPayable,
        total: p.payIn.total,
        breakdown: { ...p, terms_version: deal.terms_version },
        expires_at: new Date(Date.now() + QUOTE_MINUTES * 60_000).toISOString(),
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (qErr) throw qErr;
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
      breakdown: p.breakdown,
      payIn: p.payIn,
    };
  });

/** Fee, VAT and ledger view for a party or staff — the same numbers everywhere. */
export const getDealPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string; payCurrency?: string | undefined }) => quoteInput.parse(input))
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
      .maybeSingle();
    if (fund?.fx_quote_id) {
      const { data: q } = await admin.from("fx_quotes").select("breakdown").eq("id", fund.fx_quote_id).maybeSingle();
      if (q?.breakdown?.breakdown) return { ...q.breakdown, ledger: ledgerPreview(q.breakdown), locked: true };
    }
    const p = await priceDeal(admin, deal, data.payCurrency);
    return { breakdown: p.breakdown, payIn: p.payIn, ledger: ledgerPreview(p), locked: false };
  });
