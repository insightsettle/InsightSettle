/**
 * Editable platform settings (demo prototype).
 * Stored in the browser so Insight staff can tune currency rates, fee rules,
 * and dispute policy without a backend. All values are sample data.
 */
import { useCallback, useEffect, useState } from "react";

export type RateRow = {
  code: string;
  name: string;
  /** Mid-market rate, SAR per 1 unit. */
  baseRate: number;
  /** Margin added on top of the base rate for the customer quote. */
  spread: number;
  updatedAt: string;
};

export type FeeMode = "percent" | "flat" | "higher_of";

export type FeeRule = {
  id: string;
  label: string;
  /** Deal value band in SAR. `to: null` means no upper bound. */
  from: number;
  to: number | null;
  mode: FeeMode;
  /** Percentage as a fraction, e.g. 0.03 = 3%. */
  percent: number;
  /** Fixed amount in SAR. */
  flat: number;
};

export type DisputePolicy = {
  /** Days the AI mediation window stays open before escalation. */
  aiWindowDays: number;
  /** External arbitrator fee in SAR. */
  arbitratorFee: number;
  /** Who pays the arbitrator fee. */
  arbitratorFeePayer: "buyer" | "seller" | "losing_party" | "split";
  autoEscalate: boolean;
};

export type PlatformSettings = {
  rates: RateRow[];
  fees: FeeRule[];
  dispute: DisputePolicy;
};

const today = () => new Date().toISOString().slice(0, 10);

export const defaultSettings: PlatformSettings = {
  rates: [
    { code: "BHD", name: "Bahraini dinar", baseRate: 9.94563, spread: 0.0105, updatedAt: today() },
    { code: "USD", name: "US dollar", baseRate: 3.75, spread: 0.0105, updatedAt: today() },
    { code: "EUR", name: "Euro", baseRate: 4.09, spread: 0.0125, updatedAt: today() },
    { code: "GBP", name: "British pound", baseRate: 4.78, spread: 0.0125, updatedAt: today() },
    { code: "AED", name: "UAE dirham", baseRate: 1.021, spread: 0.009, updatedAt: today() },
    { code: "KWD", name: "Kuwaiti dinar", baseRate: 12.2185, spread: 0.0105, updatedAt: today() },
    { code: "EGP", name: "Egyptian pound", baseRate: 0.078, spread: 0.018, updatedAt: today() },
  ],
  fees: [
    {
      id: "tier-1",
      label: "Up to SAR 1,000",
      from: 0,
      to: 1000,
      mode: "higher_of",
      percent: 0.035,
      flat: 15,
    },
    {
      id: "tier-2",
      label: "SAR 1,001 – 50,000",
      from: 1000,
      to: 50000,
      mode: "percent",
      percent: 0.025,
      flat: 0,
    },
    {
      id: "tier-3",
      label: "SAR 50,001 – 1,000,000",
      from: 50000,
      to: 1000000,
      mode: "percent",
      percent: 0.018,
      flat: 0,
    },
    {
      id: "tier-4",
      label: "Above SAR 1,000,000",
      from: 1000000,
      to: null,
      mode: "flat",
      percent: 0.009,
      flat: 12000,
    },
  ],
  dispute: {
    aiWindowDays: 3,
    arbitratorFee: 1500,
    arbitratorFeePayer: "buyer",
    autoEscalate: true,
  },
};

const KEY = "insight.platform-settings.v1";

function read(): PlatformSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<PlatformSettings>;
    return {
      rates: parsed.rates?.length ? parsed.rates : defaultSettings.rates,
      fees: parsed.fees?.length ? parsed.fees : defaultSettings.fees,
      dispute: { ...defaultSettings.dispute, ...parsed.dispute },
    };
  } catch {
    return defaultSettings;
  }
}

const listeners = new Set<() => void>();
let current: PlatformSettings | null = null;

function snapshot() {
  if (!current) current = read();
  return current;
}

function commit(next: PlatformSettings) {
  current = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — keep in-memory only */
    }
  }
  listeners.forEach((l) => l());
}

/** Reactive access to the editable platform settings. */
export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);

  useEffect(() => {
    setSettings(snapshot());
    const listener = () => setSettings(snapshot());
    listeners.add(listener);
    return () => listeners.delete(listener) as unknown as void;
  }, []);

  const update = useCallback((patch: Partial<PlatformSettings>) => {
    commit({ ...snapshot(), ...patch });
  }, []);

  const reset = useCallback(() => commit(defaultSettings), []);

  return { settings, update, reset };
}

/* ----------------------------- fee engine ----------------------------- */

export function feeForRule(amount: number, rule: FeeRule) {
  const byPercent = amount * rule.percent;
  if (rule.mode === "percent") return byPercent;
  if (rule.mode === "flat") return rule.flat;
  return Math.max(byPercent, rule.flat);
}

export function computeFee(amount: number, rules: FeeRule[]) {
  const sorted = [...rules].sort((a, b) => a.from - b.from);
  const rule =
    sorted.find((r) => amount > r.from && (r.to === null || amount <= r.to)) ??
    sorted.find((r) => amount <= (r.to ?? Infinity)) ??
    sorted[sorted.length - 1];
  if (!rule) return { fee: 0, rule: null as FeeRule | null, effectiveRate: 0 };
  const fee = Math.round(feeForRule(amount, rule) * 100) / 100;
  return { fee, rule, effectiveRate: amount > 0 ? fee / amount : 0 };
}

export const feeModeLabels: Record<FeeMode, string> = {
  percent: "Percentage",
  flat: "Fixed amount",
  higher_of: "Higher of percentage or amount",
};

/* --------------------------- currency helpers -------------------------- */

export function customerRate(row: RateRow) {
  return row.baseRate * (1 + row.spread);
}

export function rateQuote(row: RateRow, amountForeign: number) {
  const rate = customerRate(row);
  const baseCost = amountForeign * row.baseRate;
  const charge = amountForeign * rate;
  return { rate, baseCost, charge, profit: charge - baseCost };
}

export function daysSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}
