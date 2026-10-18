import { describe, expect, it } from "vitest";
import { fundingLedger, ledgerBalance, payInQuote, splitFee } from "@/lib/fees";
import { allocateMilestones, milestoneFundingBreakdown, milestoneReleaseLedger } from "@/lib/milestones";
import { roundMoney } from "@/lib/money";

// DL-30512 shape: BHD 10,000 in four milestones, fee split, Saudi buyer (15%), Bahraini supplier (10%).
const b = splitFee({ amount: 10000, currency: "BHD", fee: 134.567, feePayer: "split", buyerCountry: "SA", supplierCountry: "BH" });
const amounts = [1000, 4000, 3000, 2000];

describe("per-milestone funding (D-43)", () => {
  it("each milestone carries its pro-rata fee share and the four add up to the whole deal exactly", () => {
    const parts = amounts.map((_, i) => milestoneFundingBreakdown(b, amounts, i));
    const sum = (k: "amount" | "buyerShare" | "buyerVat" | "sellerShare" | "sellerVat" | "buyerTotal" | "supplierNet") =>
      roundMoney(parts.reduce((s, p) => s + p[k], 0), "BHD");
    expect(sum("amount")).toBe(b.amount);
    expect(sum("buyerShare")).toBe(b.buyerShare);
    expect(sum("buyerVat")).toBe(b.buyerVat);
    expect(sum("sellerShare")).toBe(b.sellerShare);
    expect(sum("sellerVat")).toBe(b.sellerVat);
    expect(sum("buyerTotal")).toBe(b.buyerTotal);
    expect(sum("supplierNet")).toBe(b.supplierNet);
    expect(parts[1]!.buyerShare).toBe(roundMoney((b.buyerShare * 4000) / 10000, "BHD"));
  });

  it("the supplier share invoiced at funding equals the share deducted at release", () => {
    const alloc = allocateMilestones(b, amounts, 5);
    amounts.forEach((_, i) => {
      const f = milestoneFundingBreakdown(b, amounts, i);
      expect(f.sellerShare).toBe(alloc[i]!.feeShare);
      expect(f.sellerVat).toBe(alloc[i]!.vat);
    });
  });

  it("funding then release of one milestone balances per currency and leaves only the other milestones held", () => {
    const f = milestoneFundingBreakdown(b, amounts, 1);
    const q = payInQuote(f, "SAR", 10.078121, 10.178902);
    const a = allocateMilestones(b, amounts, 5)[1]!;
    const rows = [...fundingLedger(f, q), ...milestoneReleaseLedger("BHD", a)];
    expect(ledgerBalance(rows)).toEqual({ SAR: 0, BHD: 0 });
    const held = rows.filter((r) => r.account === "escrow_held").reduce((s, r) => s + r.credit - r.debit, 0);
    expect(roundMoney(held, "BHD")).toBe(0);
    expect(rows.find((r) => r.account === "escrow_retention")?.credit).toBe(200);
  });

  it("refuses a milestone outside the plan", () => {
    expect(() => milestoneFundingBreakdown(b, amounts, 4)).toThrow();
  });
});
