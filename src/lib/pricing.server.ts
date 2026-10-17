import {
  PROVISIONAL_SCHEDULE,
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

export const PAY_IN_CURRENCY = "SAR";

/** Loads the USD fee schedule, VAT table and the deal-currency rates (SAR per unit). */
export async function loadPricingInputs(admin: any, dealCurrency: string) {
  const [{ data: rules }, { data: vat }, { data: rates }] = await Promise.all([
    admin.from("fee_rules").select("*").eq("currency", "USD").order("amount_from"),
    admin.from("vat_rates").select("country_code, rate"),
    admin.from("fx_rates").select("code, provider_rate, spread, active").in("code", ["USD", dealCurrency]),
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
  const row = (code: string) => (rates ?? []).find((r: any) => r.code === code);
  const usd = row("USD");
  if (!usd) throw new Error("The USD rate is not configured.");
  const deal = dealCurrency === "SAR" ? { provider_rate: 1, spread: 0, active: true } : row(dealCurrency);
  if (!deal || deal.active === false) throw new Error("This currency is not available right now.");
  const providerRate = Number(deal.provider_rate); // SAR per 1 deal-currency unit
  const customerRate = dealCurrency === "SAR" ? 1 : +(providerRate * (1 + Number(deal.spread))).toFixed(6);
  const usdPerUnit = providerRate / Number(usd.provider_rate);
  return { schedule, vatTable, providerRate, customerRate, usdPerUnit };
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
export async function priceDeal(admin: any, deal: any): Promise<DealPricing> {
  const inputs = await loadPricingInputs(admin, deal.currency);
  const fee = dealFee(Number(deal.amount), deal.currency, inputs.usdPerUnit, inputs.schedule, deal.deal_type === 'auction' ? {} : {
    percent: deal.fee_override_percent == null ? null : Number(deal.fee_override_percent),
    flat: deal.fee_override_flat == null ? null : Number(deal.fee_override_flat),
  });
  const countries = await partyCountries(admin, deal);
  const breakdown = splitFee({
    amount: Number(deal.amount), currency: deal.currency, fee, feePayer: deal.deal_type === 'auction' ? 'buyer' : deal.fee_payer, ...countries, vatTable: inputs.vatTable,
  });
  const payIn = payInQuote(breakdown, PAY_IN_CURRENCY, inputs.providerRate, inputs.customerRate);
  return { breakdown, payIn, usdPerUnit: inputs.usdPerUnit, ...countries };
}

export function ledgerPreview(p: DealPricing) {
  return [...fundingLedger(p.breakdown, p.payIn), ...releaseLedger(p.breakdown)];
}
