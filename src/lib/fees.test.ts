import { describe, expect, it } from "vitest";

import {
  dealFee,
  feeUsd,
  fundingBlockReason,
  fundingLedger,
  isValidGccIban,
  ledgerBalance,
  payInQuote,
  crossRate,
  releaseLedger,
  splitFee,
  BANDED_SCHEDULE_V03 as V03,
} from "./fees";

describe("marginal USD fee bands", () => {
  it("never drops at the band edges 1,500 / 6,000 / 250,000 USD (table P1, D-48)", () => {
    for (const edge of [1_500, 6_000, 250_000]) {
      expect(feeUsd(edge + 0.01, V03)).toBeGreaterThanOrEqual(feeUsd(edge, V03));
      expect(feeUsd(edge, V03)).toBeGreaterThanOrEqual(feeUsd(edge - 0.01, V03));
    }
    expect(feeUsd(1_500, V03)).toBeCloseTo(45, 6);
    expect(feeUsd(6_000, V03)).toBeCloseTo(45 + 112.5, 6);
    expect(feeUsd(10_000, V03)).toBeCloseTo(197.5, 6);
    expect(feeUsd(250_000, V03)).toBeCloseTo(157.5 + 2_440, 6);
  });
  it("applies the 15 USD minimum and 3,500 USD cap", () => {
    expect(feeUsd(100, V03)).toBe(15);
    expect(feeUsd(500, V03)).toBe(15);
    expect(feeUsd(10_000_000, V03)).toBe(3_500);
  });
  it("is monotonic across a wide range", () => {
    let prev = 0;
    for (let a = 0; a <= 600_000; a += 250) {
      const f = feeUsd(a, V03);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });
});

describe("fee in the deal currency", () => {
  it("rounds 3-decimal currencies to 3 decimals", () => {
    const usdPerBhd = 9.9734 / 3.75;
    const fee = dealFee(1_000, "BHD", usdPerBhd, V03);
    expect(Math.round(fee * 1000)).toBe(fee * 1000);
    expect(fee).toBeCloseTo(feeUsd(1_000 * usdPerBhd, V03) / usdPerBhd, 3);
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

describe("pay-in currency cross rates (C09-D19)", () => {
  const r = { SAR: { code: "SAR", rate: 1, spread: 0 }, BHD: { code: "BHD", rate: 9.9734, spread: 0.0105 }, KWD: { code: "KWD", rate: 12.09375, spread: 0.01 }, AED: { code: "AED", rate: 1.021102, spread: 0.008 } };
  it("keeps the BHD→SAR rate used by T1", () => {
    expect(crossRate(r.BHD, r.SAR)).toEqual({ providerRate: 9.9734, customerRate: 10.078121 });
  });
  it("same currency means no conversion and no spread", () => {
    expect(crossRate(r.KWD, r.KWD)).toEqual({ providerRate: 1, customerRate: 1 });
  });
  it("crosses KWD→AED through SAR with the larger spread (T11)", () => {
    const x = crossRate(r.KWD, r.AED);
    expect(x.providerRate).toBeCloseTo(12.09375 / 1.021102, 6);
    expect(x.customerRate).toBeCloseTo(x.providerRate * 1.01, 5);
    const b = splitFee({ amount: 1_000, currency: "KWD", fee: 25, feePayer: "split", buyerCountry: "AE", supplierCountry: "KW" });
    const q = payInQuote(b, "AED", x.providerRate, x.customerRate);
    expect(q.payCurrency).toBe("AED");
    expect(q.escrowConversion + q.insightFee + q.vatPayable + q.fxSpread).toBeCloseTo(q.total, 2);
    expect(ledgerBalance([...fundingLedger(b, q), ...releaseLedger(b)])).toEqual({ AED: 0, KWD: 0 });
  });
  it("prices the C07 v0.3 vector BHD 1,000.000 → fee BHD 27.820", () => {
    expect(dealFee(1_000, "BHD", 9.9734 / 3.75, V03)).toBe(27.82);
  });
});

describe("flat 2.5% schedule (D-64)", () => {
  it("keeps the earlier USD 15 minimum and USD 3,500 cap for history", async () => {
    const { feeUsd: f, USD_SCHEDULE_D64: P } = await import("./fees");
    expect(f(100, P)).toBe(15);
    expect(f(1_000, P)).toBeCloseTo(25, 6);
    expect(f(10_000, P)).toBeCloseTo(250, 6);
    expect(f(200_000, P)).toBe(3_500);
  });
  it("D-69: charges 2.5% with the BHD 6 minimum and BHD 1,300 cap", async () => {
    const { feeUsd: f, dealFee: d, PROVISIONAL_SCHEDULE: P } = await import("./fees");
    expect(P.currency).toBe("BHD");
    expect(f(100, P)).toBe(6);
    expect(f(4_000, P)).toBeCloseTo(100, 6);
    expect(f(100_000, P)).toBe(1_300);
    // A SAR deal: 1 SAR = 0.376/3.75 BHD. SAR 1,000,000 hits the cap: BHD 1,300 in SAR.
    const bhdPerSar = 1 / 9.9734;
    expect(d(1_000_000, "SAR", bhdPerSar, P)).toBeCloseTo(1_300 / bhdPerSar, 1);
    expect(d(100, "BHD", 1, P)).toBe(6);
  });
});
