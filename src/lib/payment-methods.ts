/**
 * Payment methods and their effect on the Insight fee (founder decision D-66, 25 Oct 2026).
 *
 * - The USD 3,500 fee cap applies only to bank transfer, where the provider cost is a small flat amount.
 *   Card payments (mada, credit card) pay the full 2.5% with no cap, so a large card payment never costs
 *   Insight more than it earns.
 * - Credit cards are not offered above SAR 50,000.
 * - A method is offered only if Insight keeps at least 0.5% of the deal value after the provider cost.
 *
 * Provider costs are Tap reference prices (C07, 24 Oct) until Insight has a written quote; staff can change
 * them here in one place.
 */
import type { FeeSchedule } from "@/lib/fees";

export const PAYMENT_METHODS = ["bank_transfer", "mada", "credit_card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const DEFAULT_METHOD: PaymentMethod = "mada";

export const METHOD_LABEL: Record<PaymentMethod, readonly [en: string, ar: string]> = {
  bank_transfer: ["Bank transfer", "تحويل بنكي"],
  mada: ["mada card", "بطاقة مدى"],
  credit_card: ["Credit card", "بطاقة ائتمانية"],
};

/** Provider cost per payment: percent of the amount plus a fixed SAR amount (Tap reference prices). */
export const PROVIDER_COST: Record<PaymentMethod, { percent: number; fixedSar: number }> = {
  bank_transfer: { percent: 0, fixedSar: 10 },
  mada: { percent: 1.75, fixedSar: 1 },
  credit_card: { percent: 2.75, fixedSar: 1 },
};

export const CREDIT_CARD_MAX_SAR = 50_000;
/** Insight must keep at least this share of the deal value after the provider cost. */
export const MIN_MARGIN = 0.005;

/** The fee cap applies only to bank transfer. */
export function scheduleForMethod(schedule: FeeSchedule, method: PaymentMethod): FeeSchedule {
  return method === "bank_transfer" ? schedule : { ...schedule, maxFee: null };
}

export function providerCostSar(amountSar: number, method: PaymentMethod) {
  const c = PROVIDER_COST[method];
  return (amountSar * c.percent) / 100 + c.fixedSar;
}

export type MethodCheck = {
  method: PaymentMethod;
  allowed: boolean;
  /** Insight fee for the whole deal in SAR (before VAT). */
  feeSar: number;
  /** Insight's share of the deal value left after the provider cost. */
  margin: number;
  reason: readonly [en: string, ar: string] | null;
};

/** Whether a method can be offered for a deal of this size and fee. */
export function checkMethod(method: PaymentMethod, amountSar: number, feeSar: number): MethodCheck {
  const margin = amountSar > 0 ? (feeSar - providerCostSar(amountSar, method)) / amountSar : 0;
  if (method === "credit_card" && amountSar > CREDIT_CARD_MAX_SAR)
    return { method, allowed: false, feeSar, margin, reason: ["Credit cards are available up to SAR 50,000. Use a bank transfer or mada.", "البطاقة الائتمانية متاحة حتى 50,000 ريال. استخدم التحويل البنكي أو مدى."] };
  if (margin < MIN_MARGIN)
    return { method, allowed: false, feeSar, margin, reason: ["This payment method is not available for this amount. Choose another method.", "طريقة الدفع هذه غير متاحة لهذا المبلغ. اختر طريقة أخرى."] };
  return { method, allowed: true, feeSar, margin, reason: null };
}
