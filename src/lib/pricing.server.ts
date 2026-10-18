import {
  COUNTRY_CURRENCY,
  PROVISIONAL_SCHEDULE,
  crossRate,
  normalizeCountry,
  VAT_RATES,
  dealFee,
  fundingLedger,
  payInQuote,
  releaseLedger,
  splitFee,
  type FeeBreakdown,
  type FeeSchedule,
  type PayInQuote,
} from "@/lib/fees";

/** Fallback pay-in currency when the buyer's country has no active currency (C09-D19). */
export const PAY_IN_CURRENCY = "SAR";

/** The buyer pays in their own country's currency by default; SAR otherwise. */
export function defaultPayCurrency(buyerCountry: string | null | undefined) {
  const code = normalizeCountry(buyerCountry);
  return (code && COUNTRY_CURRENCY[code]) || PAY_IN_CURRENCY;
}

/**
 * Loads the USD fee schedule, the VAT table and the rates for converting the deal currency into the
 * pay-in currency. fx_rates holds SAR per 1 unit of each currency; any pair is crossed through SAR.
 * The provider's spread is applied once per conversion: the larger of the two currencies' spreads
 * (provisional until provider price lists, T-061). Same currency: rate 1, no spread.
 */
export async function loadPricingInputs(admin: any, dealCurrency: string, payCurrency: string = PAY_IN_CURRENCY) {
  const codes = Array.from(new Set(["USD", "SAR", dealCurrency, payCurrency]));
  const [{ data: rules }, { data: vat }, { data: rates }] = await Promise.all([
    admin.from("fee_rules").select("*").eq("currency", "USD").order("amount_from"),
    admin.from("vat_rates").select("country_code, rate"),
    admin.from("fx_rates").select("code, provider_rate, spread, active").in("code", codes),
  ]);
  const schedule: FeeSchedule = rules?.length
    ? {
        currency: "USD",
        bands: rules.map((r: any) => ({ from: Number(r.amount_from), to: r.amount_to == null ? null : Number(r.amount_to), percent: Number(r.percent) })),
        minFee: Math.max(...rules.map((r: any) => Number(r.min_fee ?? 0))),
        maxFee: rules.some((r: any) => r.max_fee != null) ? Math.min(...rules.filter((r: any) => r.max_fee != null).map((r: any) => Number(r.max_fee))) : null,
      }
    : PROVISIONAL_SCHEDULE;
  const vatTable: Record<string, number> = vat?.length
    ? Object.fromEntries(vat.map((v: any) => [v.country_code, Number(v.rate)]))
    : VAT_RATES;
  const row = (code: string) =>
    code === "SAR" ? { provider_rate: 1, spread: 0, active: true } : (rates ?? []).find((r: any) => r.code === code);
  const usd = row("USD");
  if (!usd) throw new Error("The USD rate is not configured.");
  const deal = row(dealCurrency);
  if (!deal || deal.active === false) throw new Error("This currency is not available right now.");
  const pay = row(payCurrency);
  if (!pay || pay.active === false) throw new Error("This pay-in currency is not available right now.");
  const { providerRate, customerRate } = crossRate(
    { code: dealCurrency, rate: Number(deal.provider_rate), spread: Number(deal.spread) },
    { code: payCurrency, rate: Number(pay.provider_rate), spread: Number(pay.spread) },
  );
  const usdPerUnit = Number(deal.provider_rate) / Number(usd.provider_rate);
  return { schedule, vatTable, providerRate, customerRate, usdPerUnit, payCurrency };
}

async function partyCountries(admin: any, deal: any) {
  const ids = [deal.buyer_id, deal.seller_id].filter(Boolean);
  const { data } = ids.length ? await admin.from("profiles").select("id, country").in("id", ids) : { data: [] };
  const c = (id: string | null) => (data ?? []).find((p: any) => p.id === id)?.country ?? null;
  return {
    buyerCountry: c(deal.buyer_id) ?? deal.delivery_country ?? "SA",
    supplierCountry: c(deal.seller_id) ?? deal.supplier_country ?? "SA",
  };
}

export type DealPricing = { breakdown: FeeBreakdown; payIn: PayInQuote; usdPerUnit: number; buyerCountry: string; supplierCountry: string };

/** The one place a deal is priced. */
export async function priceDeal(admin: any, deal: any, payCurrency?: string | null): Promise<DealPricing> {
  const countries = await partyCountries(admin, deal);
  const inputs = await loadPricingInputs(admin, deal.currency, payCurrency || defaultPayCurrency(countries.buyerCountry));
  const fee = dealFee(Number(deal.amount), deal.currency, inputs.usdPerUnit, inputs.schedule, deal.deal_type === 'auction' ? {} : {
    percent: deal.fee_override_percent == null ? null : Number(deal.fee_override_percent),
    flat: deal.fee_override_flat == null ? null : Number(deal.fee_override_flat),
  });
  const breakdown = splitFee({
    amount: Number(deal.amount), currency: deal.currency, fee, feePayer: deal.deal_type === 'auction' ? 'buyer' : deal.fee_payer, ...countries, vatTable: inputs.vatTable,
  });
  const payIn = payInQuote(breakdown, inputs.payCurrency, inputs.providerRate, inputs.customerRate);
  return { breakdown, payIn, usdPerUnit: inputs.usdPerUnit, ...countries };
}

export function ledgerPreview(p: DealPricing) {
  return [...fundingLedger(p.breakdown, p.payIn), ...releaseLedger(p.breakdown)];
}
