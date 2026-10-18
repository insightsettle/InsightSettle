/** Four-eyes rule for staff dispute decisions (CL-10, C05 v0.2 §7). Pure, so it is unit-tested. */
export type FourEyesStep = { kind: "propose"; pct: number } | { kind: "approve"; pct: number } | { kind: "mismatch"; pct: number };

export function decisionPercent(outcome: string, buyerPercent?: number | null) {
  return outcome === "full_refund" ? 100 : outcome === "full_release" ? 0 : Math.min(100, Math.max(0, Number(buyerPercent ?? 50)));
}

export function fourEyesStep(
  dispute: { proposed_by?: string | null; proposed_outcome?: string | null; proposed_buyer_percent?: number | string | null },
  staffId: string,
  outcome: string,
  buyerPercent?: number | null,
): FourEyesStep {
  const pct = decisionPercent(outcome, buyerPercent);
  // No proposal yet, or the proposer revises their own proposal: record it, move no money.
  if (!dispute.proposed_by || dispute.proposed_by === staffId) return { kind: "propose", pct };
  const same = dispute.proposed_outcome === outcome && Number(dispute.proposed_buyer_percent) === pct;
  return { kind: same ? "approve" : "mismatch", pct };
}
