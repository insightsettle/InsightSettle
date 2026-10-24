import { describe, expect, it } from "vitest";
import { equalMilestoneAmounts, retentionFormValues } from "./milestone-editor";

describe("milestone form conveniences", () => {
  it("puts SAR 5,000 rounding in the third milestone", () => {
    expect(equalMilestoneAmounts(5000, 3, "SAR")).toEqual(["1666.66", "1666.66", "1666.68"]);
  });
  it("keeps BHD three-decimal precision", () => {
    expect(equalMilestoneAmounts(1000.500, 3, "BHD")).toEqual(["333.500", "333.500", "333.500"]);
  });
  it("keeps zero amounts empty", () => {
    expect(equalMilestoneAmounts(0.01, 3, "SAR")).toEqual(["", "", "0.01"]);
  });
  it("sends no retention or defects period when No is selected", () => {
    expect(retentionFormValues(false, "5", "90")).toEqual({ retentionPercent: 0, defectsLiabilityDays: 0 });
  });
  it("uses existing 5% and 90-day defaults when Yes is selected", () => {
    expect(retentionFormValues(true, "5", "90")).toEqual({ retentionPercent: 5, defectsLiabilityDays: 90 });
  });
});