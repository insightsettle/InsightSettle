import { describe, expect, it } from "vitest";
import { feeUsd, PROVISIONAL_SCHEDULE } from "./fees";
import { checkMethod, CREDIT_CARD_MAX_SAR, MIN_MARGIN, providerCostSar, scheduleForMethod } from "./payment-methods";

// The schedule is in BHD (D-69): 1 BHD = 9.9734 SAR.
const SAR_PER_BHD = 9.9734;
const sarFee = (amountSar: number, m: "bank_transfer" | "mada" | "credit_card") => feeUsd(amountSar / SAR_PER_BHD, scheduleForMethod(PROVISIONAL_SCHEDULE, m)) * SAR_PER_BHD;

describe("payment methods (D-66)", () => {
  it("caps the fee only for bank transfer", () => {
    expect(sarFee(1_000_000, "bank_transfer")).toBeCloseTo(1_500 * SAR_PER_BHD, 2);
    expect(sarFee(1_000_000, "mada")).toBeCloseTo(30_000, 2);
  });
  it("SAR 550,000 at 3% (D-71): bank keeps about SAR 14,950; mada about SAR 6,874; credit card refused", () => {
    const bank = checkMethod("bank_transfer", 550_000, sarFee(550_000, "bank_transfer"));
    const mada = checkMethod("mada", 550_000, sarFee(550_000, "mada"));
    const credit = checkMethod("credit_card", 550_000, sarFee(550_000, "credit_card"));
    expect(bank.allowed).toBe(true);
    expect(bank.feeSar - providerCostSar(550_000, "bank_transfer")).toBeCloseTo(1_500 * SAR_PER_BHD - 10, 0);
    expect(mada.allowed).toBe(true);
    expect(mada.feeSar - providerCostSar(550_000, "mada")).toBeCloseTo(6_874, 0);
    expect(credit.allowed).toBe(false);
  });
  it("never offers a method below the minimum margin", () => {
    for (const amount of [500, 5_000, 20_000, 49_000, 200_000, 2_000_000])
      for (const m of ["bank_transfer", "mada", "credit_card"] as const) {
        const c = checkMethod(m, amount, sarFee(amount, m));
        if (c.allowed) expect(c.margin).toBeGreaterThanOrEqual(MIN_MARGIN);
      }
    expect(checkMethod("credit_card", CREDIT_CARD_MAX_SAR + 1, 1e9).allowed).toBe(false);
  });
});

describe("credit card under D-71", () => {
  it("stays below the 0.5% minimum margin at 3% once the minimum fee no longer applies", () => {
    for (const amount of [10_000, 20_000, 49_000]) expect(checkMethod("credit_card", amount, sarFee(amount, "credit_card")).allowed).toBe(false);
  });
});
