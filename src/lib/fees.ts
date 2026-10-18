/**
 * The single Insight fee, VAT and ledger calculator (decision D-22, FR-052).
 * Pure functions: the server uses them to price quotes, releases, invoices and the ledger;
 * screens only display what the server returns.
 */
import { roundMoney } from "@/lib/money";

export type FeeBand = { from: number; to: number | null; percent: number };
export type FeeSchedule = { currency: "USD"; bands: FeeBand[]; minFee: number; maxFee: number | null };
export type FeePayer = "buyer" | "seller" | "split";

/** Provisional levels until the pricing workstream sets them. Percent as a number, e.g. 3 = 3%. */
export const PROVISIONAL_SCHEDULE: FeeSchedule = {
  currency: "USD",
  bands: [
    { from: 0, to: 1_500, percent: 3 },
    { from: 1_500, to: 6_000, percent: 2.5 },
    { from: 6_000, to: 250_000, percent: 1 },
    { from: 250_000, to: null, percent: 0.5 },
  ],
  minFee: 15,
  maxFee: 3_500,
};

/** VAT on the Insight fee by the paying party's country (provisional until legal review). */
export const VAT_RATES: Record<string, number> = { SA: 0.15, BH: 0.1, AE: 0.05, OM: 0.05, QA: 0, KW: 0, OTHER: 0 };

export function vatRateFor(country: string | null | undefined, table: Record<string, number> = VAT_RATES) {
  const code = normalizeCountry(country);
  return code && code in table ? table[code]! : 0.15;
}

const COUNTRY_NAMES: Record<string, string> = {
  "SAUDI ARABIA": "SA", BAHRAIN: "BH", "UNITED ARAB EMIRATES": "AE", UAE: "AE", OMAN: "OM", QATAR: "QA", KUWAIT: "KW", OTHER: "OTHER",
};
export function normalizeCountry(country: string | null | undefined) {
  if (!country) return null;
  const c = country.trim().toUpperCase();
  return c.length === 2 ? c : (COUNTRY_NAMES[c] ?? null);
}

/** Marginal band fee in USD: each band's percent applies only to the part inside it; then min and cap. */
export function feeUsd(amountUsd: number, schedule: FeeSchedule = PROVISIONAL_SCHEDULE) {
  let fee = 0;
  for (const b of [...schedule.bands].sort((a, z) => a.from - z.from)) {
    const top = b.to ?? Infinity;
    if (amountUsd <= b.from) break;
    fee += ((Math.min(amountUsd, top) - b.from) * b.percent) / 100;
  }
  fee = Math.max(fee, schedule.minFee);
  if (schedule.maxFee != null) fee = Math.min(fee, schedule.maxFee);
  return fee;
}

export type Override = { percent?: number | null; flat?: number | null };

/** Fee in the deal currency. usdPerUnit = USD value of 1 unit of the deal currency (provider rate). */
export function dealFee(amount: number, currency: string, usdPerUnit: number, schedule = PROVISIONAL_SCHEDULE, override: Override = {}) {
  if (override.flat != null) return roundMoney(override.flat, currency);
  if (override.percent != null) return roundMoney((amount * override.percent) / 100, currency);
  return roundMoney(feeUsd(amount * usdPerUnit, schedule) / usdPerUnit, currency);
}

export type FeeBreakdown = {
  currency: string;
  amount: number;
  fee: number;
  feePayer: FeePayer;
  buyerShare: number;
  sellerShare: number;
  buyerVatRate: number;
  sellerVatRate: number;
  buyerVat: number;
  sellerVat: number;
  /** What the buyer funds, in the deal currency. */
  buyerTotal: number;
  /** What the supplier receives on release, in the deal currency. */
  supplierNet: number;
};

export function splitFee(input: {
  amount: number;
  currency: string;
  fee: number;
  feePayer: FeePayer | string;
  buyerCountry: string | null | undefined;
  supplierCountry: string | null | undefined;
  vatTable?: Record<string, number>;
}): FeeBreakdown {
  const { amount, currency, fee } = input;
  const payer = (["buyer", "seller", "split"].includes(input.feePayer) ? input.feePayer : "buyer") as FeePayer;
  const buyerShare = payer === "buyer" ? fee : payer === "seller" ? 0 : roundMoney(fee / 2, currency);
  const sellerShare = roundMoney(fee - buyerShare, currency);
  const buyerVatRate = vatRateFor(input.buyerCountry, input.vatTable);
  const sellerVatRate = vatRateFor(input.supplierCountry, input.vatTable);
  const buyerVat = roundMoney(buyerShare * buyerVatRate, currency);
  const sellerVat = roundMoney(sellerShare * sellerVatRate, currency);
  return {
    currency, amount, fee, feePayer: payer, buyerShare, sellerShare, buyerVatRate, sellerVatRate, buyerVat, sellerVat,
    buyerTotal: roundMoney(amount + buyerShare + buyerVat, currency),
    supplierNet: roundMoney(amount - sellerShare - sellerVat, currency),
  };
}

export type PayInQuote = {
  payCurrency: string;
  providerRate: number;
  customerRate: number;
  /** Pay-in currency amounts. */
  escrowConversion: number;
  insightFee: number;
  vatPayable: number;
  fxSpread: number;
  total: number;
};

/** Converts the buyer's side into the pay-in currency (FX-B: the provider executes and keeps the spread). */
export function payInQuote(b: FeeBreakdown, payCurrency: string, providerRate: number, customerRate: number): PayInQuote {
  const total = roundMoney(b.buyerTotal * customerRate, payCurrency);
  const escrowConversion = roundMoney(b.amount * providerRate, payCurrency);
  const insightFee = roundMoney(b.buyerShare * providerRate, payCurrency);
  const vatPayable = roundMoney(b.buyerVat * providerRate, payCurrency);
  const fxSpread = roundMoney(total - escrowConversion - insightFee - vatPayable, payCurrency);
  return { payCurrency, providerRate, customerRate, escrowConversion, insightFee, vatPayable, fxSpread, total };
}

/**
 * Cross rate from the deal currency into the pay-in currency (C09-D19). `rate` = SAR per 1 unit.
 * providerRate = pay-in units per 1 deal unit; the customer rate adds the larger of the two spreads.
 */
export function crossRate(deal: { code: string; rate: number; spread: number }, pay: { code: string; rate: number; spread: number }) {
  if (deal.code === pay.code) return { providerRate: 1, customerRate: 1 };
  const providerRate = +(deal.rate / pay.rate).toFixed(6);
  const spread = Math.max(deal.code === "SAR" ? 0 : deal.spread, pay.code === "SAR" ? 0 : pay.spread);
  return { providerRate, customerRate: +(providerRate * (1 + spread)).toFixed(6) };
}

export type LedgerRow = { account: string; debit: number; credit: number; currency: string };

export function fundingLedger(b: FeeBreakdown, q: PayInQuote): LedgerRow[] {
  const p = q.payCurrency;
  return [
    { account: "provider_clearing", debit: q.total, credit: 0, currency: p },
    { account: "provider_fx_spread", debit: 0, credit: q.fxSpread, currency: p },
    { account: "escrow_conversion", debit: 0, credit: q.escrowConversion, currency: p },
    { account: "insight_fee_revenue", debit: 0, credit: q.insightFee, currency: p },
    { account: "vat_payable", debit: 0, credit: q.vatPayable, currency: p },
    // Held funds, in the deal currency only.
    { account: "provider_conversion", debit: b.amount, credit: 0, currency: b.currency },
    { account: "escrow_held", debit: 0, credit: b.amount, currency: b.currency },
  ].filter((r) => r.debit !== 0 || r.credit !== 0);
}

export function releaseLedger(b: FeeBreakdown): LedgerRow[] {
  const c = b.currency;
  return [
    { account: "escrow_held", debit: b.amount, credit: 0, currency: c },
    { account: "supplier_payable", debit: 0, credit: b.supplierNet, currency: c },
    { account: "insight_fee_revenue", debit: 0, credit: b.sellerShare, currency: c },
    { account: "vat_payable", debit: 0, credit: b.sellerVat, currency: c },
  ].filter((r) => r.debit !== 0 || r.credit !== 0);
}

/** Debit minus credit per currency; every value must be 0 for a balanced deal. */
export function ledgerBalance(rows: LedgerRow[]) {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.currency] = roundMoney((out[r.currency] ?? 0) + r.debit - r.credit, r.currency);
  return out;
}

/** Validates a GCC IBAN: country length + mod-97. */
export const GCC_IBAN_LENGTHS: Record<string, number> = { SA: 24, AE: 23, BH: 22, QA: 29, KW: 30, OM: 23 };
export function isValidGccIban(raw: string) {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  const len = GCC_IBAN_LENGTHS[iban.slice(0, 2)];
  if (!len || iban.length !== len || !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

/** Payout currency for each GCC country. */
export const COUNTRY_CURRENCY: Record<string, string> = { SA: "SAR", BH: "BHD", AE: "AED", OM: "OMR", QA: "QAR", KW: "KWD" };

export function fundingBlockReason(input: {
  status: string;
  bothJoined: boolean;
  termsStatus: string;
  latestVersionAccepted: boolean;
  supplierPayoutOk: boolean;
}) {
  if (input.status !== "pending_funding") return "This deal is not waiting for funding.";
  if (!input.bothJoined) return "Both parties must join the deal before it can be funded.";
  if (input.termsStatus !== "agreed" || !input.latestVersionAccepted)
    return "The latest terms version must be accepted by both parties before funding.";
  if (!input.supplierPayoutOk)
    return "The supplier needs a verified payout account in the deal currency before this deal can be funded.";
  return null;
}

/**
 * C09-D15: dispute split on a whole deal. The supplier gets only its share of the held amount, less its
 * fee share and VAT pro rata; the buyer gets the rest back. Escrow is debited once per part and nets to 0.
 */
export function disputeSplit(b: FeeBreakdown, buyerPercent: number) {
  const c = b.currency;
  const gross = roundMoney((b.amount * (100 - buyerPercent)) / 100, c);
  const refund = roundMoney(b.amount - gross, c);
  return { refund, ...releasePortion(b, gross) };
}

/** Release of `gross` out of the held amount, with the supplier fee share and VAT pro rata. */
export function releasePortion(b: FeeBreakdown, gross: number) {
  const c = b.currency;
  const f = b.amount > 0 ? gross / b.amount : 0;
  const sellerShare = f >= 1 ? b.sellerShare : roundMoney(b.sellerShare * f, c);
  const sellerVat = f >= 1 ? b.sellerVat : roundMoney(b.sellerVat * f, c);
  const supplierNet = roundMoney(gross - sellerShare - sellerVat, c);
  const ledger: LedgerRow[] = [
    { account: "escrow_held", debit: gross, credit: 0, currency: c },
    { account: "supplier_payable", debit: 0, credit: supplierNet, currency: c },
    { account: "insight_fee_revenue", debit: 0, credit: sellerShare, currency: c },
    { account: "vat_payable", debit: 0, credit: sellerVat, currency: c },
  ].filter((r) => r.debit !== 0 || r.credit !== 0);
  return { releaseGross: gross, sellerShare, sellerVat, supplierNet, ledger };
}
