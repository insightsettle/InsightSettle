/** Currency minor units (decimal places). Server code prefers fx_rates.minor_units when available. */
export const DEFAULT_MINOR_UNITS: Record<string, number> = {
  SAR: 2,
  USD: 2,
  AED: 2,
  QAR: 2,
  BHD: 3,
  KWD: 3,
  OMR: 3,
};

export function minorUnitsFor(currency: string, table?: Record<string, number>) {
  return table?.[currency] ?? DEFAULT_MINOR_UNITS[currency] ?? 2;
}

/** Rounds an amount to the currency's minor units (half away from zero). */
export function roundMoney(amount: number, currency: string, table?: Record<string, number>) {
  const f = 10 ** minorUnitsFor(currency, table);
  return (Math.sign(amount) * Math.round(Math.abs(amount) * f + 1e-9)) / f;
}

/** Supported deal currencies shown to users. */
export const SUPPORTED_CURRENCIES = ["SAR", "BHD", "AED", "QAR", "KWD", "OMR", "USD"] as const;
