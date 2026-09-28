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

/*
 * Rates and fee rules are shared platform data stored on the server
 * (fx_rates / fee_rules). Only the dispute policy is still kept locally.
 */
const KEY = "insight.platform-settings.v1";

function readDispute(): DisputePolicy {
  if (typeof window === "undefined") return defaultSettings.dispute;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PlatformSettings>) : {};
    return { ...defaultSettings.dispute, ...parsed.dispute };
  } catch {
    return defaultSettings.dispute;
  }
}

function toRule(r: any): FeeRule {
  const percent = Number(r.percent) / 100;
  const min = Number(r.min_fee ?? 0);
  const mode: FeeMode = percent === 0 ? "flat" : min > 0 ? "higher_of" : "percent";
  return {
    id: r.id,
    label: r.label,
    from: Math.floor(Number(r.amount_from)),
    to: r.amount_to == null ? null : Number(r.amount_to),
    mode,
    percent,
    flat: mode === "flat" ? Number(r.max_fee ?? r.min_fee ?? 0) : min,
  };
}

function fromRule(rule: FeeRule, i: number) {
  return {
    ...(rule.id && rule.id.length === 36 ? { id: rule.id } : {}),
    label: rule.label,
    amount_from: rule.from,
    amount_to: rule.to,
    percent: rule.mode === "flat" ? 0 : +(rule.percent * 100).toFixed(4),
    min_fee: rule.mode === "percent" ? 0 : rule.flat,
    max_fee: rule.mode === "flat" ? rule.flat : null,
    sort_order: i + 1,
  };
}

const listeners = new Set<() => void>();
let current: PlatformSettings = defaultSettings;
let loaded = false;

async function load() {
  const { supabase } = await import("@/integrations/supabase/client");
  const [rates, fees] = await Promise.all([
    supabase.from("fx_rates").select("*").neq("code", "SAR").order("code"),
    supabase.from("fee_rules").select("*").order("sort_order"),
  ]);
  current = {
    rates: rates.data?.length
      ? rates.data.map((r: any) => ({
          code: r.code,
          name: r.name,
          baseRate: Number(r.provider_rate),
          spread: Number(r.spread),
          updatedAt: String(r.updated_at).slice(0, 10),
        }))
      : defaultSettings.rates,
    fees: fees.data?.length ? fees.data.map(toRule) : defaultSettings.fees,
    dispute: readDispute(),
  };
  loaded = true;
  listeners.forEach((l) => l());
}

async function persist(prev: PlatformSettings, next: PlatformSettings) {
  const { supabase } = await import("@/integrations/supabase/client");
  const db = supabase as any;
  if (next.rates !== prev.rates) {
    const removed = prev.rates.filter((p) => !next.rates.some((n) => n.code === p.code));
    if (removed.length) await db.from("fx_rates").delete().in("code", removed.map((r) => r.code));
    await db.from("fx_rates").upsert(
      next.rates.map((r) => ({ code: r.code, name: r.name, provider_rate: r.baseRate, spread: r.spread })),
    );
  }
  if (next.fees !== prev.fees) {
    const keep = next.fees.map((f) => f.id);
    const removed = prev.fees.filter((p) => !keep.includes(p.id) && p.id.length === 36);
    if (removed.length) await db.from("fee_rules").delete().in("id", removed.map((r) => r.id));
    const rows = next.fees.map(fromRule);
    const existing = rows.filter((r: any) => r.id);
    const fresh = rows.filter((r: any) => !r.id);
    if (existing.length) await db.from("fee_rules").upsert(existing);
    if (fresh.length) await db.from("fee_rules").insert(fresh);
    await load();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPrev: PlatformSettings | null = null;

function commit(next: PlatformSettings) {
  const prev = current;
  current = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ dispute: next.dispute }));
    } catch {
      /* storage unavailable */
    }
  }
  listeners.forEach((l) => l());
  pendingPrev = pendingPrev ?? prev;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const base = pendingPrev ?? prev;
    pendingPrev = null;
    void persist(base, current);
  }, 600);
}

/** Reactive access to the shared platform settings. */
export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(current);

  useEffect(() => {
    const listener = () => setSettings(current);
    listeners.add(listener);
    if (!loaded) void load();
    else setSettings(current);
    return () => listeners.delete(listener) as unknown as void;
  }, []);

  const update = useCallback((patch: Partial<PlatformSettings>) => {
    commit({ ...current, ...patch });
  }, []);

  const reset = useCallback(() => commit({ ...current, dispute: defaultSettings.dispute }), []);

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
