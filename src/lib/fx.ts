/** Currency spread model (sample data). Rates are SAR per 1 unit of foreign currency. */
export const SPREAD = 0.0125;

export type FxCurrency = "USD" | "EUR" | "GBP" | "AED" | "EGP";

export const baseRates: Record<FxCurrency, number> = {
  USD: 3.75,
  EUR: 4.09,
  GBP: 4.78,
  AED: 1.021,
  EGP: 0.078,
};

export const fxCurrencies = Object.keys(baseRates) as FxCurrency[];

export type FxQuote = {
  currency: FxCurrency;
  /** Mid-market rate, SAR per 1 unit. */
  baseRate: number;
  /** Rate offered to the customer, SAR per 1 unit. */
  customerRate: number;
  spread: number;
  /** Deal value in SAR. */
  amountSAR: number;
  /** Foreign amount at mid-market. */
  baseCost: number;
  /** Foreign amount actually charged to the customer. */
  customerCharge: number;
  /** Platform revenue from the spread, in SAR. */
  profitSAR: number;
};

export function quoteFx(amountSAR: number, currency: FxCurrency, spread = SPREAD): FxQuote {
  const baseRate = baseRates[currency];
  const customerRate = baseRate * (1 - spread);
  const baseCost = amountSAR / baseRate;
  const customerCharge = amountSAR / customerRate;
  const profitSAR = (customerCharge - baseCost) * baseRate;
  return {
    currency,
    baseRate,
    customerRate,
    spread,
    amountSAR,
    baseCost,
    customerCharge,
    profitSAR,
  };
}

export function formatForeign(amount: number, currency: FxCurrency) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatRate(rate: number) {
  return rate.toLocaleString("en-GB", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
