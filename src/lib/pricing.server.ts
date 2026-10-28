import { auctionFee, auctionSettingsSchema } from "@/lib/auction-fees";
import { checkMethod, DEFAULT_METHOD, PAYMENT_METHODS, scheduleForMethod, type MethodCheck, type PaymentMethod } from "@/lib/payment-methods";
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
  const codes = Array.from(new Set(["USD", "BHD", "SAR", dealCurrency, payCurrency]));
  const [{ data: rules }, { data: vat }, { data: rates }] = await Promise.all([
    admin.from("fee_rules").select("*").in("currency", ["BHD", "USD"]).order("amount_from"),
    admin.from("vat_rates").select("country_code, rate"),
    admin.from("fx_rates").select("code, provider_rate, spread, active").in("code", codes),
  ]);
  // BHD rules win when present (D-69: launch from Bahrain); USD rules remain as a fallback.
  const base: "BHD" | "USD" = (rules ?? []).some((r: any) => r.currency === "BHD") ? "BHD" : "USD";
  const live = (rules ?? []).filter((r: any) => r.currency === base);
  const schedule: FeeSchedule = live.length
    ? {
        currency: base,
        bands: live.map((r: any) => ({ from: Number(r.amount_from), to: r.amount_to == null ? null : Number(r.amount_to), percent: Number(r.percent) })),
        minFee: Math.max(...live.map((r: any) => Number(r.min_fee ?? 0))),
        maxFee: live.some((r: any) => r.max_fee != null) ? Math.min(...live.filter((r: any) => r.max_fee != null).map((r: any) => Number(r.max_fee))) : null,
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
  // Value of one deal-currency unit in the schedule currency, for the minimum and the cap.
  const baseRow = row(schedule.currency);
  if (!baseRow) throw new Error(`The ${schedule.currency} rate is not configured.`);
  const basePerUnit = Number(deal.provider_rate) / Number(baseRow.provider_rate);
  return { schedule, vatTable, providerRate, customerRate, usdPerUnit, basePerUnit, sarPerUnit: Number(deal.provider_rate), payCurrency };
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

export type DealPricing = {
  breakdown: FeeBreakdown; payIn: PayInQuote; usdPerUnit: number; buyerCountry: string; supplierCountry: string;
  /** The payment method this price is for (D-66), and which methods can be offered for this deal. */
  method: PaymentMethod; methods: MethodCheck[];
  /** Sandbox route per method (routing_mode=price_book_sandbox); one provider serves pay-in and payout. */
  routes?: Partial<Record<PaymentMethod, import("@/lib/finance/price-book").RouteResult>>;
  routingMode?: "simulated_only" | "price_book_sandbox";
};

/** Resolves one provider per method for this deal, or null when routing_mode is simulated_only. */
async function dealRoutes(admin: any, deal: any, countries: { buyerCountry: string; supplierCountry: string }, payCurrency: string, amountSar: number) {
  const { data: settings } = await admin.from("platform_settings").select("routing_mode").eq("id", true).maybeSingle();
  if (settings?.routing_mode !== "price_book_sandbox") return null;
  const { effectiveConfig, resolveRoute, holdingDaysFor } = await import("@/lib/finance/price-book");
  const { data: records } = await admin.from("finance_records").select("id,kind,subject_id,payload,created_at")
    .in("kind", ["approval", "price_book_proposal", "routing_table_proposal", "provider_profile_proposal", "provider_jobs_proposal", "provider_limits_proposal"]).order("created_at").limit(2000);
  const { book, table, providers } = effectiveConfig(records ?? []);
  // Deals funded before routing existed were paid through the simulated provider and stay with it.
  const { data: route } = deal.id ? await admin.from("deal_routes").select("provider,rule_version").eq("deal_id", deal.id).maybeSingle() : { data: null };
  const { count: funded } = route || !deal.id ? { count: 0 } : await admin.from("deal_transactions").select("id", { count: "exact", head: true })
    .eq("deal_id", deal.id).eq("kind", "funding").in("status", ["pending", "processing", "succeeded"]);
  const locked = route ? { provider: route.provider, version: route.rule_version ?? "locked" }
    : (funded ?? 0) > 0 ? { provider: "manual", version: "pre-routing" } : null;
  return Object.fromEntries(PAYMENT_METHODS.map((m) => [m, resolveRoute(book, table, {
    dealType: deal.deal_type ?? "goods", payerCountry: countries.buyerCountry, payInCurrency: payCurrency, method: m,
    payeeCountry: countries.supplierCountry, payoutCurrency: deal.currency, amountSar, holdingDays: holdingDaysFor(deal),
  }, locked, providers)])) as NonNullable<DealPricing["routes"]>;
}

/** The one place a deal is priced. The fee depends on the payment method: the cap applies to bank transfer only (D-66). */
export async function priceDeal(admin: any, deal: any, payCurrency?: string | null, requested?: PaymentMethod): Promise<DealPricing> {
  const countries = await partyCountries(admin, deal);
  const inputs = await loadPricingInputs(admin, deal.currency, payCurrency || defaultPayCurrency(countries.buyerCountry));
  const auctionSettings = deal.deal_type === 'auction' ? await admin.from('auction_fee_settings').select('*').eq('id',true).single() : null;
  if (auctionSettings?.error) throw auctionSettings.error;
  const auction = deal.deal_type === 'auction' ? auctionSettingsSchema.parse(auctionSettings?.data) : null;
  const override = {
    percent: deal.fee_override_percent == null ? null : Number(deal.fee_override_percent),
    flat: deal.fee_override_flat == null ? null : Number(deal.fee_override_flat),
  };
  const feeFor = (m: PaymentMethod) => {
    const schedule = scheduleForMethod(inputs.schedule, m);
    return auction
      ? auctionFee(Number(deal.amount), deal.currency, inputs.usdPerUnit, schedule, m === 'bank_transfer' ? auction : { ...auction, max_usd: null }, inputs.basePerUnit)
      : dealFee(Number(deal.amount), deal.currency, inputs.basePerUnit, schedule, override);
  };
  const amountSar = Number(deal.amount) * inputs.sarPerUnit;
  const routes = await dealRoutes(admin, deal, countries, inputs.payCurrency, amountSar);
  const methods = PAYMENT_METHODS.map((m) => checkMethod(m, amountSar, feeFor(m) * inputs.sarPerUnit, routes ? (routes[m]?.provider ? routes[m]!.costSar : null) : undefined));
  // No method chosen yet: the default when it is offered, else the first offered method (auctions at 1% are often bank transfer only, D-71).
  const method: PaymentMethod = requested ?? (methods.find((x) => x.method === DEFAULT_METHOD && x.allowed) ?? methods.find((x) => x.allowed))?.method ?? DEFAULT_METHOD;
  const fee = feeFor(method);
  const breakdown = splitFee({
    amount: Number(deal.amount), currency: deal.currency, fee, feePayer: deal.deal_type === 'auction' ? 'buyer' : deal.fee_payer, ...countries, vatTable: inputs.vatTable,
  });
  const payIn = payInQuote(breakdown, inputs.payCurrency, inputs.providerRate, inputs.customerRate);
  return { breakdown, payIn, usdPerUnit: inputs.usdPerUnit, ...countries, method, methods, routingMode: routes ? "price_book_sandbox" : "simulated_only", ...(routes ? { routes } : {}) };
}

export function ledgerPreview(p: DealPricing) {
  return [...fundingLedger(p.breakdown, p.payIn), ...releaseLedger(p.breakdown)];
}
