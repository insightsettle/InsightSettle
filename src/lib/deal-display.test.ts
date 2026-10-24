import { describe, expect, it } from "vitest";
import { paymentEventNote, quoteAmountLine } from "./deal-display";
import { roundMoney } from "./money";

describe("D22 displayed quote reconciliation", () => {
  it("reconciles T1 BHD 1,000 funding in SAR without changing fee or VAT", () => {
    const quote = { total: 10239.34, fee: 138.73, vat: 20.81, target_currency: "SAR" };
    expect(quoteAmountLine(quote)).toBe(10079.8);
    expect(roundMoney(quoteAmountLine(quote) + quote.fee + quote.vat, "SAR")).toBe(10239.34);
  });
  it("keeps three minor units when quoting BHD", () => {
    const quote = { total: 1015.997, fee: 13.910, vat: 2.087, target_currency: "BHD" };
    expect(quoteAmountLine(quote)).toBe(1000);
    expect(roundMoney(quoteAmountLine(quote) + quote.fee + quote.vat, "BHD")).toBe(1015.997);
  });
});

describe("milestone payment event classification", () => {
  it("uses the matching transaction kind without changing actual refund events", () => {
    const transactions = [{ kind: "funding", provider_ref: "SIM-FUND" }, { kind: "refund", provider_ref: "SIM-REFUND" }];
    expect(paymentEventNote("Milestone refund · SIM-FUND", transactions)).toEqual(["Milestone funding · SIM-FUND", "تمويل المرحلة · SIM-FUND"]);
    expect(paymentEventNote("Milestone refund · SIM-REFUND", transactions)).toBeNull();
    expect(paymentEventNote("Milestone refund · SIM-UNKNOWN", transactions)).toBeNull();
  });
});