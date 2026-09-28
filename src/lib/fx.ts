/**
 * Currency conversion model (sample data).
 * Deals can be priced in the supplier's currency while the buyer pays in SAR.
 * `baseRate` is the mid-market rate in SAR per 1 unit of the supplier currency.
 * The platform quotes the buyer a slightly higher rate; the difference is platform revenue
 * and is never shown to the customer.
 */
export const SPREAD = 0.0105;

export type FxCurrency = "AED" | "BHD" | "QAR" | "KWD" | "OMR" | "USD" | "EUR" | "GBP";

export const baseRates: Record<FxCurrency, number> = {
  AED: 1.021,
  BHD: 9.94563,
  QAR: 1.03,
  KWD: 12.2185,
  OMR: 9.74,
  USD: 3.75,
  EUR: 4.09,
  GBP: 4.78,
};

export const currencyNames: Record<FxCurrency, string> = {
  AED: "UAE dirham",
  BHD: "Bahraini dinar",
  QAR: "Qatari riyal",
  KWD: "Kuwaiti dinar",
  OMR: "Omani rial",
  USD: "US dollar",
  EUR: "Euro",
  GBP: "British pound",
};

export const fxCurrencies = Object.keys(baseRates) as FxCurrency[];

export type FxQuote = {
  currency: FxCurrency;
  /** Deal value in the supplier currency. */
  amountForeign: number;
  /** Mid-market rate, SAR per 1 unit. */
  baseRate: number;
  /** Rate quoted to the buyer, SAR per 1 unit. */
  customerRate: number;
  spread: number;
  /** What the platform pays at mid-market, in SAR. */
  baseCostSAR: number;
  /** What the buyer pays, in SAR. */
  customerChargeSAR: number;
  /** Platform revenue from the rate difference, in SAR. Internal only. */
  profitSAR: number;
};

export function quoteFx(amountForeign: number, currency: FxCurrency, spread = SPREAD): FxQuote {
  const baseRate = baseRates[currency];
  const customerRate = baseRate * (1 + spread);
  const baseCostSAR = amountForeign * baseRate;
  const customerChargeSAR = amountForeign * customerRate;
  return {
    currency,
    amountForeign,
    baseRate,
    customerRate,
    spread,
    baseCostSAR,
    customerChargeSAR,
    profitSAR: customerChargeSAR - baseCostSAR,
  };
}

export function formatForeign(amount: number, currency: FxCurrency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: ["BHD", "KWD", "OMR"].includes(currency) ? 3 : 2,
  }).format(amount);
}

export function formatRate(rate: number) {
  return rate.toLocaleString("en-GB", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
}
