import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { roundMoney } from "@/lib/money";

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
};

const QUOTE_MINUTES = 15;
const VAT_RATE = 0.15; // Saudi VAT on the Insight fee

export function feeFor(amount: number, rules: any[], currency = "SAR") {
  const rule = rules.find(
    (r) => amount >= Number(r.amount_from) && (r.amount_to == null || amount <= Number(r.amount_to)),
  );
  if (!rule) return 0;
  let fee = (amount * Number(rule.percent)) / 100;
  fee = Math.max(fee, Number(rule.min_fee ?? 0));
  if (rule.max_fee != null) fee = Math.min(fee, Number(rule.max_fee));
  return roundMoney(fee, currency);
}

/** Locks an exchange rate for 15 minutes. Customers only see the final rate. */
export const requestFxQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string }) => z.object({ dealId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<FxQuote> => {
    const { data: deal, error } = await context.supabase
      .from("deals")
      .select("id, amount, currency, buyer_id, fee_override_percent, fee_override_flat")
      .eq("id", data.dealId)
      .maybeSingle();
    if (error) throw error;
    if (!deal || deal.buyer_id !== context.userId) throw new Error("Only the buyer can request a quote.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const [{ data: rate }, { data: rules }] = await Promise.all([
      admin.from("fx_rates").select("*").eq("code", deal.currency).maybeSingle(),
      admin.from("fee_rules").select("*").order("sort_order"),
    ]);
    if (!rate || !rate.active) throw new Error("This currency is not available right now.");

    const source = Number(deal.amount);
    const providerRate = Number(rate.provider_rate);
    const customerRate = +(providerRate * (1 + Number(rate.spread))).toFixed(6);
    const providerAmount = roundMoney(source * providerRate, "SAR");
    const customerAmount = roundMoney(source * customerRate, "SAR");
    let fee = feeFor(customerAmount, rules ?? []);
    if (deal.fee_override_flat != null) fee = Number(deal.fee_override_flat);
    else if (deal.fee_override_percent != null)
      fee = roundMoney((customerAmount * Number(deal.fee_override_percent)) / 100, "SAR");
    const vat = roundMoney(fee * VAT_RATE, "SAR");
    const total = roundMoney(customerAmount + fee + vat, "SAR");

    const { data: q, error: qErr } = await admin
      .from("fx_quotes")
      .insert({
        deal_id: deal.id,
        source_currency: deal.currency,
        target_currency: "SAR",
        source_amount: source,
        provider_rate: providerRate,
        customer_rate: customerRate,
        provider_amount: providerAmount,
        customer_amount: customerAmount,
        fx_spread: roundMoney(customerAmount - providerAmount, "SAR"),
        fee,
        vat,
        total,
        expires_at: new Date(Date.now() + QUOTE_MINUTES * 60_000).toISOString(),
        created_by: context.userId,
      })
      .select("id, source_currency, target_currency, source_amount, customer_rate, customer_amount, fee, vat, total, expires_at")
      .single();
    if (qErr) throw qErr;
    return {
      ...q,
      source_amount: Number(q.source_amount),
      customer_rate: Number(q.customer_rate),
      customer_amount: Number(q.customer_amount),
      fee: Number(q.fee),
      vat: Number(q.vat),
      total: Number(q.total),
    };
  });
