/**
 * Deal types and milestone escrow rules (Batch C). Pure functions shared by the form, the server and tests.
 */
import { roundMoney, minorUnitsFor as minorUnits } from "@/lib/money";
import type { FeeBreakdown } from "@/lib/fees";

export const DEAL_TYPES = ["goods", "services", "contracting", "freelance"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const DEAL_TYPE_DEFAULTS: Record<DealType, { inspectionDays: number; shipping: boolean; milestones: "none" | "optional" | "required"; revisions: number }> = {
  goods: { inspectionDays: 5, shipping: true, milestones: "none", revisions: 0 },
  services: { inspectionDays: 5, shipping: false, milestones: "optional", revisions: 0 },
  contracting: { inspectionDays: 5, shipping: false, milestones: "required", revisions: 0 },
  freelance: { inspectionDays: 3, shipping: false, milestones: "optional", revisions: 2 },
};

export type MilestoneInput = {
  title: string;
  description?: string | null | undefined;
  amount: number;
  dueDate?: string | null | undefined;
  evidenceRequired?: string | null | undefined;
  kind?: "advance" | "work" | undefined;
};

export const MAX_ADVANCE_PERCENT = 20;

/** Returns an error message, or null when the milestone plan is valid. */
export function validateMilestones(dealAmount: number, currency: string, list: MilestoneInput[], dealType: DealType) {
  if (dealType === "goods" && list.length) return "Goods deals do not use milestones.";
  if (dealType === "contracting" && list.length === 0) return "Contracting deals need milestones.";
  if (list.length === 0) return null;
  if (list.length < 2 || list.length > 20) return "Use between 2 and 20 milestones.";
  const scale = 10 ** minorUnits(currency);
  const toMinor = (n: number) => Math.round(n * scale);
  for (const m of list) {
    if (!m.title?.trim()) return "Every milestone needs a title.";
    if (!(m.amount > 0)) return "Every milestone needs an amount above zero.";
    if (Math.abs(toMinor(m.amount) - m.amount * scale) > 1e-6)
      return `Milestone amounts can have at most ${minorUnits(currency)} decimals.`;
  }
  const sum = list.reduce((s, m) => s + toMinor(m.amount), 0);
  if (sum !== toMinor(dealAmount)) return "Milestone amounts must add up exactly to the deal amount.";
  const advances = list.map((m, i) => ({ m, i })).filter((x) => x.m.kind === "advance");
  if (advances.length > 1) return "Only one advance payment milestone is allowed.";
  if (advances.length === 1) {
    if (dealType !== "contracting") return "An advance payment is only available for contracting deals.";
    if (advances[0]!.i !== 0) return "The advance payment must be the first milestone.";
    if (toMinor(advances[0]!.m.amount) > toMinor((dealAmount * MAX_ADVANCE_PERCENT) / 100))
      return "The advance payment can be at most 20% of the deal amount.";
  }
  return null;
}

export type MilestoneAllocation = {
  seq: number;
  gross: number;
  retention: number;
  feeShare: number;
  vat: number;
  net: number;
};

/**
 * Fee is computed once on the whole deal (batch B calculator) and the supplier's fee share and VAT are allocated
 * pro rata to milestones; the last milestone takes the rounding remainder so the totals match exactly.
 * Retention is withheld from each milestone release.
 */
export function allocateMilestones(b: FeeBreakdown, amounts: number[], retentionPercent: number): MilestoneAllocation[] {
  const c = b.currency;
  let feeLeft = b.sellerShare;
  let vatLeft = b.sellerVat;
  return amounts.map((gross, i) => {
    const last = i === amounts.length - 1;
    const feeShare = last ? roundMoney(feeLeft, c) : roundMoney((b.sellerShare * gross) / b.amount, c);
    const vat = last ? roundMoney(vatLeft, c) : roundMoney((b.sellerVat * gross) / b.amount, c);
    feeLeft = roundMoney(feeLeft - feeShare, c);
    vatLeft = roundMoney(vatLeft - vat, c);
    const retention = roundMoney((gross * retentionPercent) / 100, c);
    return { seq: i + 1, gross, retention, feeShare, vat, net: roundMoney(gross - retention - feeShare - vat, c) };
  });
}

/** Ledger rows for one milestone release, balanced in the deal currency; retention goes to its own sub-account. */
export function milestoneReleaseLedger(currency: string, a: Omit<MilestoneAllocation, "seq">) {
  return [
    { account: "escrow_held", debit: a.gross, credit: 0, currency },
    { account: "supplier_payable", debit: 0, credit: a.net, currency },
    { account: "escrow_retention", debit: 0, credit: a.retention, currency },
    { account: "insight_fee_revenue", debit: 0, credit: a.feeShare, currency },
    { account: "vat_payable", debit: 0, credit: a.vat, currency },
  ].filter((r) => r.debit !== 0 || r.credit !== 0);
}

export function retentionReleaseLedger(currency: string, amount: number) {
  return [
    { account: "escrow_retention", debit: amount, credit: 0, currency },
    { account: "supplier_payable", debit: 0, credit: amount, currency },
  ];
}

/** Five-step escrow stepper index (0 Agree … 4 Release). */
export function escrowStep(status: string, termsStatus: string) {
  if (status === "pending_funding") return termsStatus === "agreed" ? 1 : 0;
  if (status === "held" || status === "in_progress") return 2;
  if (status === "delivered" || status === "under_review" || status === "disputed") return 3;
  return 4;
}
