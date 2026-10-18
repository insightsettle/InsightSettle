import { describe, expect, it } from "vitest";
import { nextStepFor, type NextStepInput } from "@/lib/next-step";

const base: NextStepInput = { status: "pending_funding", termsAgreed: false, isBuyer: true, isSeller: false, bothJoined: true, canDecideTerms: true, shippingNeeded: true, shipped: false, autoRelease: true, frozen: false, hasMilestones: false, nextMilestoneToFund: null, deadline: ["20 Oct, 6pm", "20 أكتوبر، 6 م"] };

describe("next step on a deal page", () => {
  it("asks the reviewing party to accept the terms", () => {
    const s = nextStepFor(base)!;
    expect(s.mine).toBe(true);
    expect(s.primary?.action).toBe("accept-terms");
  });
  it("the creator waits while the other party reviews", () => {
    expect(nextStepFor({ ...base, canDecideTerms: false })!.mine).toBe(false);
  });
  it("buyer pays once terms are agreed; supplier waits", () => {
    expect(nextStepFor({ ...base, termsAgreed: true })!.primary?.action).toBe("scroll-pay");
    expect(nextStepFor({ ...base, termsAgreed: true, isBuyer: false, isSeller: true })!.primary).toBeUndefined();
    expect(nextStepFor({ ...base, termsAgreed: true, nextMilestoneToFund: 1 })!.title[0]).toContain("milestone 1");
  });
  it("supplier ships before confirming delivery", () => {
    const seller = { ...base, status: "held", termsAgreed: true, isBuyer: false, isSeller: true };
    expect(nextStepFor(seller)!.primary?.action).toBe("scroll-ship");
    expect(nextStepFor({ ...seller, shipped: true })!.primary?.action).toBe("deliver");
    expect(nextStepFor({ ...seller, shippingNeeded: false })!.primary?.action).toBe("deliver");
  });
  it("buyer inspects and confirms, with the auto-release note and a dispute way out", () => {
    const s = nextStepFor({ ...base, status: "delivered", termsAgreed: true })!;
    expect(s.primary?.action).toBe("release");
    expect(s.secondary?.action).toBe("scroll-dispute");
    expect(s.note).toBeDefined();
    expect(nextStepFor({ ...base, status: "delivered", termsAgreed: true, autoRelease: false })!.note).toBeUndefined();
  });
  it("never offers money actions on frozen, disputed or closed deals, nor to non-parties", () => {
    for (const st of ["disputed", "released", "completed", "refunded", "cancelled"]) expect(nextStepFor({ ...base, status: st, termsAgreed: true })!.primary).toBeUndefined();
    expect(nextStepFor({ ...base, status: "delivered", termsAgreed: true, frozen: true })!.primary).toBeUndefined();
    expect(nextStepFor({ ...base, isBuyer: false, isSeller: false })).toBeNull();
  });
});
