import { describe, expect, it } from "vitest";
import { planDealPayouts, planPayout } from "./payout-planner";

describe("IDEA-001 payout planner", () => {
  it("BHD 3,500 is not described as instant", () => {
    const p = planPayout("Release", 3_500, "BHD");
    expect(p.channel).toBe("bank");
    expect(p.en.toLowerCase()).not.toContain("instant");
    expect(p.ar).not.toContain("فوري");
  });
  it("BHD 2,000 shows instant expected", () => {
    const p = planPayout("Release", 2_000, "BHD");
    expect(p.channel).toBe("instant");
    expect(p.en).toContain("expected");
    expect(p.ar).toContain("متوقع");
  });
  it("one line per milestone plus retention, never naming a bank", () => {
    const lines = planDealPayouts({ currency: "BHD", supplierNet: 0, amount: 10_000, sellerShare: 68.33, sellerVat: 6.833, retentionPercent: 5,
      milestones: [{ seq: 1, title: "Advance", amount: 1_000 }, { seq: 2, title: "Works", amount: 4_000 }, { seq: 3, title: "MEP", amount: 3_000 }, { seq: 4, title: "Handover", amount: 2_000 }] });
    expect(lines).toHaveLength(5);
    expect(lines[0]!.amount).toBeCloseTo(942.484, 3);
    expect(lines[1]!.channel).toBe("bank");
    for (const l of lines) expect(`${l.en} ${l.ar}`).not.toMatch(/bank of|BisB|NBB|Fawri|sarie/i);
  });
});
