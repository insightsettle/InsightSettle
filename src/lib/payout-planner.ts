/**
 * IDEA-001 payout planner (R/RD_Approved_Ideas.md). One line per payment with the EXPECTED channel and
 * arrival. Values are provisional (simulated provider) until providers answer T-061 D1/D4. Never says
 * "instant" above a channel's limit, never promises a time, never names a bank or provider.
 */
import { roundMoney } from "@/lib/money";

export type PayoutRule = { currency: string; instantMax: number | null };

/** Provisional per-transfer limits for the domestic instant channel, by payout currency. */
export const PROVISIONAL_PAYOUT_RULES: PayoutRule[] = [
  { currency: "BHD", instantMax: 3_000 },
  { currency: "SAR", instantMax: 20_000 },
  { currency: "AED", instantMax: 20_000 },
  { currency: "QAR", instantMax: 20_000 },
  { currency: "KWD", instantMax: 1_500 },
  { currency: "OMR", instantMax: 1_500 },
  { currency: "USD", instantMax: null },
];

export type PlannedPayout = {
  label: string;
  labelAr?: string;
  amount: number;
  currency: string;
  channel: "instant" | "bank" | "international";
  en: string;
  ar: string;
};

export function planPayout(label: string, amount: number, currency: string, rules = PROVISIONAL_PAYOUT_RULES): PlannedPayout {
  const rule = rules.find((r) => r.currency === currency);
  const a = roundMoney(amount, currency);
  if (!rule || rule.instantMax === null)
    return { label, amount: a, currency, channel: "international", en: "International transfer, expected in 1–3 business days", ar: "تحويل دولي، متوقع خلال 1–3 أيام عمل" };
  if (a <= rule.instantMax)
    return { label, amount: a, currency, channel: "instant", en: "Instant transfer expected within minutes", ar: "تحويل فوري متوقع خلال دقائق" };
  return { label, amount: a, currency, channel: "bank", en: "Bank transfer expected the next business day", ar: "تحويل بنكي متوقع يوم العمل التالي" };
}

/** Lines for a deal: one for a single release, or one per milestone plus the retention payout. */
export function planDealPayouts(input: {
  currency: string;
  supplierNet: number;
  amount: number;
  sellerShare: number;
  sellerVat: number;
  retentionPercent?: number;
  milestones?: { seq: number; title: string; amount: number }[];
}): PlannedPayout[] {
  const c = input.currency;
  const ms = input.milestones ?? [];
  if (!ms.length) return [{ ...planPayout("Release", input.supplierNet, c), labelAr: "الإفراج" }];
  const ret = (input.retentionPercent ?? 0) / 100;
  const lines = ms.map((m) => {
    const f = input.amount > 0 ? m.amount / input.amount : 0;
    const net = m.amount - roundMoney(m.amount * ret, c) - roundMoney(input.sellerShare * f, c) - roundMoney(input.sellerVat * f, c);
    return planPayout(`${m.seq}. ${m.title}`, net, c);
  });
  if (ret > 0) lines.push({ ...planPayout("Retention (after the defects period)", roundMoney(ms.reduce((s, m) => s + roundMoney(m.amount * ret, c), 0), c), c), labelAr: "المحتجزات (بعد فترة ضمان العيوب)" });
  return lines;
}
