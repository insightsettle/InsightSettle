import { describe, expect, it } from "vitest";
import { feeUsd, PROVISIONAL_SCHEDULE } from "./fees";
import { checkMethod, CREDIT_CARD_MAX_SAR, MIN_MARGIN, providerCostSar, scheduleForMethod } from "./payment-methods";

// The schedule is in BHD (D-69): 1 BHD = 9.9734 SAR.
const SAR_PER_BHD = 9.9734;
const sarFee = (amountSar: number, m: "bank_transfer" | "mada" | "credit_card") => feeUsd(amountSar / SAR_PER_BHD, scheduleForMethod(PROVISIONAL_SCHEDULE, m)) * SAR_PER_BHD;

describe("payment methods (D-66)", () => {
  it("caps the fee only for bank transfer", () => {
    expect(sarFee(1_000_000, "bank_transfer")).toBeCloseTo(1_300 * SAR_PER_BHD, 2);
    expect(sarFee(1_000_000, "mada")).toBeCloseTo(25_000, 2);
  });
  it("SAR 550,000: bank keeps about SAR 12,955; mada about SAR 4,124; credit card refused", () => {
    const bank = checkMethod("bank_transfer", 550_000, sarFee(550_000, "bank_transfer"));
    const mada = checkMethod("mada", 550_000, sarFee(550_000, "mada"));
    const credit = checkMethod("credit_card", 550_000, sarFee(550_000, "credit_card"));
    expect(bank.allowed).toBe(true);
    expect(bank.feeSar - providerCostSar(550_000, "bank_transfer")).toBeCloseTo(1_300 * SAR_PER_BHD - 10, 0);
    expect(mada.allowed).toBe(true);
    expect(mada.feeSar - providerCostSar(550_000, "mada")).toBeCloseTo(4_124, 0);
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
