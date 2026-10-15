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
    const a = alloc[2]!; // same math as createMilestoneRelease with factor 0.7
    const s = (n: number) => roundMoney(n * 0.7, "BHD");
    const gross = s(a.gross), retention = s(a.retention), feeShare = s(a.feeShare), vat = s(a.vat);
    const net = roundMoney(gross - retention - feeShare - vat, "BHD");
    const refund = roundMoney(300 - gross, "BHD");
    expect([gross, refund]).toEqual([210, 90]);
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
