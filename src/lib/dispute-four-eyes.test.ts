import { describe, expect, it } from "vitest";
import { fourEyesStep } from "./dispute-four-eyes";

describe("four-eyes dispute decisions", () => {
  it("the first decision is only a proposal", () => {
    expect(fourEyesStep({}, "staff-a", "partial_settlement", 70)).toEqual({ kind: "propose", pct: 70 });
  });
  it("the proposer cannot approve their own decision; a repeat revises the proposal", () => {
    expect(fourEyesStep({ proposed_by: "staff-a", proposed_outcome: "partial_settlement", proposed_buyer_percent: 70 }, "staff-a", "partial_settlement", 70).kind).toBe("propose");
  });
  it("a second staff member applies the same decision", () => {
    expect(fourEyesStep({ proposed_by: "staff-a", proposed_outcome: "partial_settlement", proposed_buyer_percent: "70" }, "staff-b", "partial_settlement", 70)).toEqual({ kind: "approve", pct: 70 });
  });
  it("a different outcome from the second staff member is refused", () => {
    expect(fourEyesStep({ proposed_by: "staff-a", proposed_outcome: "partial_settlement", proposed_buyer_percent: 70 }, "staff-b", "full_refund").kind).toBe("mismatch");
  });
});
