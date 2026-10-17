import { describe, expect, it } from "vitest";

import { minorUnitsFor, roundMoney, SUPPORTED_CURRENCIES } from "./money";

describe("currency rounding", () => {
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
