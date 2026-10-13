import { describe, expect, it } from "vitest";
import { splitFee } from "@/lib/fees";
import { allocateMilestones, milestoneReleaseLedger, retentionReleaseLedger, validateMilestones } from "@/lib/milestones";
import { ledgerBalance } from "@/lib/fees";

const plan = [
  { title: "Mobilisation advance", amount: 1000, kind: "advance" as const },
  { title: "Partitions & ceilings", amount: 4000 },
  { title: "MEP works", amount: 3000 },
  { title: "Finishes & handover", amount: 2000 },
];

describe("milestone plan", () => {
  it("accepts 4 milestones summing to BHD 10,000.000", () => {
    expect(validateMilestones(10000, "BHD", plan, "contracting")).toBeNull();
  });
  it("rejects a sum that is off by one fils", () => {
    const p = plan.map((m, i) => (i === 3 ? { ...m, amount: 1999.999 } : m));
    expect(validateMilestones(10000, "BHD", p, "contracting")).toMatch(/add up exactly/);
  });
  it("rejects fewer than 2 or more than 20", () => {
    expect(validateMilestones(100, "SAR", [{ title: "a", amount: 100 }], "services")).toMatch(/2 and 20/);
    const many = Array.from({ length: 21 }, (_, i) => ({ title: `m${i}`, amount: 1 }));
    expect(validateMilestones(21, "SAR", many, "services")).toMatch(/2 and 20/);
  });
  it("requires milestones for contracting and caps the advance at 20%", () => {
    expect(validateMilestones(100, "SAR", [], "contracting")).toMatch(/need milestones/);
    expect(validateMilestones(100, "SAR", [{ title: "adv", amount: 21, kind: "advance" }, { title: "b", amount: 79 }], "contracting")).toMatch(/20%/);
  });
});

describe("milestone allocation", () => {
  const b = splitFee({ amount: 10000, currency: "BHD", fee: 101.234, feePayer: "split", buyerCountry: "SA", supplierCountry: "BH" });
  const a = allocateMilestones(b, [1000, 4000, 3000, 2000], 5);
  it("allocates the supplier fee share and VAT exactly", () => {
    const fee = a.reduce((s, x) => s + x.feeShare, 0);
    const vat = a.reduce((s, x) => s + x.vat, 0);
    expect(Math.round(fee * 1000)).toBe(Math.round(b.sellerShare * 1000));
    expect(Math.round(vat * 1000)).toBe(Math.round(b.sellerVat * 1000));
  });
  it("withholds 5% retention per milestone", () => {
    expect(a.map((x) => x.retention)).toEqual([50, 200, 150, 100]);
  });
  it("balances each milestone release and the retention release", () => {
    for (const x of a) expect(ledgerBalance(milestoneReleaseLedger("BHD", x))).toEqual({ BHD: 0 });
    expect(ledgerBalance(retentionReleaseLedger("BHD", 500))).toEqual({ BHD: 0 });
  });
});
