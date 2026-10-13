import { describe, expect, it } from "vitest";

import {
  dealFee,
  feeUsd,
  fundingBlockReason,
  fundingLedger,
  isValidGccIban,
  ledgerBalance,
  payInQuote,
  releaseLedger,
  splitFee,
} from "./fees";

describe("marginal USD fee bands", () => {
  it("never drops at the band edges 1,500 / 15,000 / 250,000 USD", () => {
    for (const edge of [1_500, 15_000, 250_000]) {
      expect(feeUsd(edge + 0.01)).toBeGreaterThanOrEqual(feeUsd(edge));
      expect(feeUsd(edge)).toBeGreaterThanOrEqual(feeUsd(edge - 0.01));
    }
    expect(feeUsd(1_500)).toBeCloseTo(45, 6);
    expect(feeUsd(15_000)).toBeCloseTo(45 + 337.5, 6);
    expect(feeUsd(250_000)).toBeCloseTo(382.5 + 2_350, 6);
  });
  it("applies the 15 USD minimum and 3,500 USD cap", () => {
    expect(feeUsd(100)).toBe(15);
    expect(feeUsd(500)).toBe(15);
    expect(feeUsd(10_000_000)).toBe(3_500);
  });
  it("is monotonic across a wide range", () => {
    let prev = 0;
    for (let a = 0; a <= 600_000; a += 250) {
      const f = feeUsd(a);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });
});

describe("fee in the deal currency", () => {
  it("rounds 3-decimal currencies to 3 decimals", () => {
    const usdPerBhd = 9.9734 / 3.75;
    const fee = dealFee(1_000, "BHD", usdPerBhd);
    expect(Math.round(fee * 1000)).toBe(fee * 1000);
    expect(fee).toBeCloseTo(feeUsd(1_000 * usdPerBhd) / usdPerBhd, 3);
  });
  it("splits 50/50: buyer pays share + own VAT, supplier gets amount − share − own VAT", () => {
    const b = splitFee({ amount: 1_000, currency: "BHD", fee: 26.297, feePayer: "split", buyerCountry: "SA", supplierCountry: "BH" });
    expect(b.buyerShare + b.sellerShare).toBeCloseTo(26.297, 6);
    expect(b.buyerVat).toBe(Math.round(b.buyerShare * 0.15 * 1000) / 1000);
    expect(b.sellerVat).toBe(Math.round(b.sellerShare * 0.1 * 1000) / 1000);
    expect(b.buyerTotal).toBeCloseTo(1_000 + b.buyerShare + b.buyerVat, 6);
    expect(b.supplierNet).toBeCloseTo(1_000 - b.sellerShare - b.sellerVat, 6);
  });
  it("buyer and seller payers put the whole fee on one side", () => {
    const buyer = splitFee({ amount: 100, currency: "SAR", fee: 10, feePayer: "buyer", buyerCountry: "SA", supplierCountry: "BH" });
    expect([buyer.buyerShare, buyer.sellerShare, buyer.supplierNet]).toEqual([10, 0, 100]);
    const seller = splitFee({ amount: 100, currency: "SAR", fee: 10, feePayer: "seller", buyerCountry: "SA", supplierCountry: "BH" });
    expect([seller.buyerShare, seller.sellerShare, seller.buyerTotal, seller.supplierNet]).toEqual([0, 10, 100, 89]);
  });
});

describe("ledger", () => {
  it("balances to zero per currency for funding plus release", () => {
    const b = splitFee({ amount: 1_000, currency: "BHD", fee: 26.297, feePayer: "split", buyerCountry: "SA", supplierCountry: "BH" });
    const q = payInQuote(b, "SAR", 9.9734, 10.078121);
    const rows = [...fundingLedger(b, q), ...releaseLedger(b)];
    expect(ledgerBalance(rows)).toEqual({ SAR: 0, BHD: 0 });
    expect(rows.some((r) => r.account === "vat_payable" && r.currency === "SAR")).toBe(true);
  });
});

describe("IBAN and funding rules", () => {
  it("validates GCC IBANs by length and mod-97", () => {
    expect(isValidGccIban("BH50DEMO00000000012345")).toBe(true);
    expect(isValidGccIban("BH51DEMO00000000012345")).toBe(false);
    expect(isValidGccIban("SA0380000000608010167519")).toBe(true);
    expect(isValidGccIban("SA03800000006080101675")).toBe(false);
  });
  it("refuses funding until the latest terms are accepted", () => {
    const base = { status: "pending_funding", bothJoined: true, termsStatus: "agreed", latestVersionAccepted: true, supplierPayoutOk: true };
    expect(fundingBlockReason(base)).toBeNull();
    expect(fundingBlockReason({ ...base, termsStatus: "pending" })).toMatch(/terms/);
    expect(fundingBlockReason({ ...base, latestVersionAccepted: false })).toMatch(/terms/);
    expect(fundingBlockReason({ ...base, supplierPayoutOk: false })).toMatch(/payout account/);
  });
});
