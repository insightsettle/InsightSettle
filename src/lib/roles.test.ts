import { describe, expect, it } from "vitest";

import { nextStepFor } from "@/lib/next-step";
import { arLam, feePayerLabel, rolesFor, to } from "@/lib/roles";

const base = { status: "pending_funding", termsAgreed: true, isBuyer: false, isSeller: true, bothJoined: true, canDecideTerms: false, shippingNeeded: false, shipped: false, autoRelease: false, frozen: false, hasMilestones: false, nextMilestoneToFund: null, deadline: null };

describe("role names by deal type", () => {
  it("uses the everyday pair for each kind of deal", () => {
    expect(rolesFor("goods").payee.ar).toBe("البائع");
    expect(rolesFor("services").payee.ar).toBe("مقدّم الخدمة");
    expect(rolesFor("contracting").payer.ar).toBe("المالك");
    expect(rolesFor("contracting").payee.ar).toBe("المقاول");
    expect(rolesFor("unknown").payer.ar).toBe("الدافع");
    expect(rolesFor(null).payee.ar).toBe("المستفيد");
  });

  it("fuses the Arabic lām correctly", () => {
    expect(arLam("المقاول")).toBe("للمقاول");
    expect(arLam("مقدّم الخدمة")).toBe("لمقدّم الخدمة");
    expect(to(rolesFor("goods").payee)).toEqual(["to the seller", "للبائع"]);
  });

  it("names who pays the fee in the deal's words", () => {
    expect(feePayerLabel("seller", rolesFor("contracting"))).toEqual(["Contractor pays the fee", "يدفعها المقاول"]);
    expect(feePayerLabel("buyer", rolesFor("freelance"))[1]).toBe("يدفعها العميل");
  });

  it("next step speaks the deal's language", () => {
    const s = nextStepFor({ ...base, roles: rolesFor("contracting") });
    expect(s?.title).toEqual(["Waiting for the owner to pay", "بانتظار دفع المالك"]);
    const g = nextStepFor({ ...base, isBuyer: true, isSeller: false, roles: rolesFor("goods") });
    expect(g?.body[1]).toContain("للبائع");
    expect(JSON.stringify(nextStepFor({ ...base, roles: rolesFor("services") }))).not.toContain("المورد");
  });
});
