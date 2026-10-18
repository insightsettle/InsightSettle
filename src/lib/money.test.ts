import { describe, expect, it } from "vitest";

import { minorUnitsFor, moneyInputStep, roundMoney, SUPPORTED_CURRENCIES } from "./money";

describe("currency rounding", () => {
  it("accepts SAR 48000 and BHD 1000.500 from the currency minimum step base", () => {
    for (const [currency, amount, expectedStep] of [["SAR", 48000, 0.01], ["BHD", 1000.500, 0.001]] as const) {
      const step = moneyInputStep(currency);
      expect(step).toBe(expectedStep);
      const steps = (amount - step) / step;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-8);
      const invalidSteps = (amount + step / 2 - step) / step;
      expect(Math.abs(invalidSteps - Math.round(invalidSteps))).toBeGreaterThan(0.49);
    }
  });
  it("uses three minor units for BHD/KWD/OMR and two for the other deal currencies", () => {
    expect(["BHD", "KWD", "OMR"].map(c => minorUnitsFor(c))).toEqual([3, 3, 3]);
    expect(["SAR", "USD", "AED", "QAR"].map(c => minorUnitsFor(c))).toEqual([2, 2, 2, 2]);
  });
  it("rounds BHD, KWD and OMR to 3 decimals", () => {
    expect(roundMoney(1.23456, "BHD")).toBe(1.235);
    expect(roundMoney(1.23449, "KWD")).toBe(1.234);
    expect(roundMoney(9.75292649, "OMR")).toBe(9.753);
  });
  it("rounds SAR and USD to 2 decimals", () => {
    expect(roundMoney(1.235, "SAR")).toBe(1.24);
    expect(roundMoney(10.004, "USD")).toBe(10);
  });
  it("supports only the six GCC currencies plus USD", () => {
    expect([...SUPPORTED_CURRENCIES].sort()).toEqual(["AED", "BHD", "KWD", "OMR", "QAR", "SAR", "USD"]);
  });
});
