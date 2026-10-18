import { describe, expect, it } from "vitest";
import { identityDisplayState, showCustomerPrompts } from "./account-display";

describe("customer-only account presentation", () => {
  it("never asks staff for customer details, even after access finishes loading", () => {
    expect(showCustomerPrompts(true, false)).toBe(false);
    expect(showCustomerPrompts(true, true)).toBe(false);
    expect(showCustomerPrompts(false, true)).toBe(false);
    expect(showCustomerPrompts(false, false)).toBe(true);
  });
  it("rejected identity is actionable rather than pending review", () => {
    expect(identityDisplayState("rejected", [{ status: "rejected" }])).toBe("todo");
    expect(identityDisplayState("pending", [{ status: "pending" }])).toBe("pending");
    expect(identityDisplayState("verified", [{ status: "approved" }])).toBe("done");
  });
});