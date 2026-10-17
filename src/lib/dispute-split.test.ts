import { describe, expect, it } from "vitest";
import { disputeSplit, fundingLedger, ledgerBalance, payInQuote, splitFee, type LedgerRow } from "./fees";
import { allocateMilestones, milestoneReleaseLedger } from "./milestones";
import { roundMoney } from "./money";

const b = splitFee({ amount: 1_000, currency: "BHD", fee: 27.82, feePayer: "split", buyerCountry: "SA", supplierCountry: "BH" });
const refundRows = (amt: number): LedgerRow[] =>
  amt > 0 ? [{ account: "escrow_held", debit: amt, credit: 0, currency: "BHD" }, { account: "buyer_refund_payable", debit: 0, credit: amt, currency: "BHD" }] : [];
const escrow = (rows: LedgerRow[]) => roundMoney(rows.filter((r) => r.account === "escrow_held").reduce((s, r) => s + r.credit - r.debit, 0), "BHD");

describe("C09-D15 dispute split on a whole deal", () => {
  it("70% supplier / 30% buyer on BHD 1,000.000", () => {
    const s = disputeSplit(b, 30);
    expect(s.refund).toBe(300);
    expect(s.releaseGross).toBe(700);
    expect(s.sellerShare).toBe(9.737); // 13.910 × 0.7
    expect(s.sellerVat).toBe(0.974); // 1.391 × 0.7
    expect(s.supplierNet).toBe(689.289);
    expect(s.supplierNet + s.sellerShare + s.sellerVat + s.refund).toBeCloseTo(1_000, 9);
    const q = payInQuote(b, "SAR", 9.9734, 10.078121);
    const rows = [...fundingLedger(b, q), ...s.ledger, ...refundRows(s.refund)];
    expect(escrow(rows)).toBe(0);
    expect(ledgerBalance(rows)).toEqual({ SAR: 0, BHD: 0 });
  });
  it("100/0 releases everything with the full fee share", () => {
    const s = disputeSplit(b, 0);
    expect([s.refund, s.releaseGross, s.supplierNet, s.sellerShare, s.sellerVat]).toEqual([0, 1_000, b.supplierNet, b.sellerShare, b.sellerVat]);
    expect(escrow([{ account: "escrow_held", debit: 0, credit: 1_000, currency: "BHD" }, ...s.ledger])).toBe(0);
  });
  it("0/100 refunds everything, no supplier fee", () => {
    const s = disputeSplit(b, 100);
    expect([s.refund, s.releaseGross, s.supplierNet, s.sellerShare, s.sellerVat]).toEqual([1_000, 0, 0, 0, 0]);
    expect(s.ledger).toEqual([]);
  });
});

describe("C09-D15 milestone-only dispute in a 4-milestone deal", () => {
  it("splits milestone 3 only; escrow for it nets to 0 and others are untouched", () => {
    const alloc = allocateMilestones(b, [100, 400, 300, 200], 5);
    const before = JSON.parse(JSON.stringify(alloc));
    const a = alloc[2];
    if (!a) throw new Error("Missing milestone 3");
    const s = (n: number) => roundMoney(n * 0.7, "BHD");
    const gross = s(a.gross), retention = a.retention, feeShare = s(a.feeShare), vat = s(a.vat);
    const net = roundMoney(gross - retention - feeShare - vat, "BHD");
    const refund = roundMoney(300 - gross, "BHD");
    expect([gross, refund]).toEqual([210, 90]);
    expect(retention).toBe(15);
    const rows = [
      { account: "provider_conversion", debit: 300, credit: 0, currency: "BHD" },
      { account: "escrow_held", debit: 0, credit: 300, currency: "BHD" },
      ...milestoneReleaseLedger("BHD", { gross, retention, feeShare, vat, net }),
      ...refundRows(refund),
    ];
    expect(escrow(rows)).toBe(0);
    expect(ledgerBalance(rows)).toEqual({ BHD: 0 });
    expect(alloc).toEqual(before);
    expect(alloc.map((x) => x.gross)).toEqual([100, 400, 300, 200]);
  });
});

describe("C09-D15 currency rounding", () => {
  it("70/30 on SAR 10,000.00 charges supplier fees on 7,000 only", () => {
    const base = splitFee({ amount: 10_000, currency: "SAR", fee: 250, feePayer: "split", buyerCountry: "SA", supplierCountry: "SA" });
    const result = disputeSplit(base, 30);
    expect([result.releaseGross, result.refund, result.sellerShare, result.sellerVat, result.supplierNet]).toEqual([7000, 3000, 87.5, 13.13, 6899.37]);
    expect(result.releaseGross + result.refund).toBe(10000);
    expect(ledgerBalance([...result.ledger, ...[
      { account: "escrow_held", debit: 0, credit: 10000, currency: "SAR" },
      { account: "provider_conversion", debit: 10000, credit: 0, currency: "SAR" },
      { account: "escrow_held", debit: 3000, credit: 0, currency: "SAR" },
      { account: "buyer_refund_payable", debit: 0, credit: 3000, currency: "SAR" },
    ]])).toEqual({ SAR: 0 });
  });
  it("assigns the half-minor-unit remainder to the refund", () => {
    const base = { ...b, amount: 1.001 };
    const result = disputeSplit(base, 50);
    expect([result.releaseGross, result.refund]).toEqual([0.501, 0.5]);
    expect(roundMoney(result.releaseGross + result.refund, "BHD")).toBe(1.001);
  });
});
