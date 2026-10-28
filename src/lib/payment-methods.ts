/**
 * Payment methods and their effect on the Insight fee (founder decision D-66, 25 Oct 2026).
 *
 * - The fee cap (BHD 1,500 since D-71; BHD 1,300 under D-69; earlier USD 3,500) applies only to bank transfer, where the provider cost is a small flat amount.
 *   Card payments (mada, credit card) pay the full 3% with no cap, so a large card payment never costs
 *   Insight more than it earns.
 * - Credit cards are not offered above SAR 50,000.
 * - A method is offered only if Insight keeps at least 0.5% of the deal value after the provider cost.
 *
 * Provider costs are a temporary optimistic AFS assumption (D-71) until Insight has a written quote; staff can change
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

/** Simulated provider cost per payment (routing_mode=simulated_only). Real candidates live in the versioned price book (src/lib/finance/price-book.ts). */
/** D-71 (founder, 28 Oct 2026): temporary optimistic AFS assumption until AFS sends its prices: debit card (mada/BENEFIT)
 *  0.8% + BHD 0.1, credit card 1.9% + BHD 0.1, bank transfer BHD 0.5 flat (BHD 0.1 ≈ SAR 1, BHD 0.5 ≈ SAR 5).
 *  Earlier Tap reference prices: bank SAR 10, mada 1.75% + SAR 1, credit card 2.75% + SAR 1. */
export const PROVIDER_COST: Record<PaymentMethod, { percent: number; fixedSar: number }> = {
  bank_transfer: { percent: 0, fixedSar: 5 },
  mada: { percent: 0.8, fixedSar: 1 },
  credit_card: { percent: 1.9, fixedSar: 1 },
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

/**
 * Whether a method can be offered for a deal of this size and fee.
 * `routedCostSar` (routing_mode=price_book_sandbox): the routed provider's price-book cost; null = no route for this deal.
 * Omitted = today's behaviour with the simulated provider's PROVIDER_COST.
 */
export function checkMethod(method: PaymentMethod, amountSar: number, feeSar: number, routedCostSar?: number | null): MethodCheck {
  const cost = routedCostSar === undefined ? providerCostSar(amountSar, method) : routedCostSar;
  const margin = amountSar > 0 && cost != null ? (feeSar - cost) / amountSar : 0;
  if (method === "credit_card" && amountSar > CREDIT_CARD_MAX_SAR)
    return { method, allowed: false, feeSar, margin, reason: ["Credit cards are available up to about BHD 5,000 (SAR 50,000) per deal. Use a bank transfer or mada.", "البطاقة الائتمانية متاحة حتى نحو 5,000 دينار بحريني (50,000 ريال) للصفقة. استخدم التحويل البنكي أو مدى."] };
  if (cost == null || margin < MIN_MARGIN)
    return { method, allowed: false, feeSar, margin, reason: ["This payment method is not available for this amount. Choose another method.", "طريقة الدفع هذه غير متاحة لهذا المبلغ. اختر طريقة أخرى."] };
  return { method, allowed: true, feeSar, margin, reason: null };
}
