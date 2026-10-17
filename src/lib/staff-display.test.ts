import { describe, expect, it, vi } from "vitest";
import { splitDisplay, submitStaffStatus } from "./staff-display";

describe("C09-D21 status control", () => {
  it("sends Cancelled to staffAction cancel with the required reason", async () => {
    const cancel = vi.fn().mockResolvedValue({ ok: true });
    const generic = vi.fn();
    await submitStaffStatus({ dealId: "unfunded-deal", status: "cancelled", reason: "Fictional test cleanup" }, cancel, generic);
    expect(cancel).toHaveBeenCalledWith({ data: { action: "cancel", dealId: "unfunded-deal", note: "Fictional test cleanup" } });
    expect(generic).not.toHaveBeenCalled();
  });
  it("keeps non-cancel status changes on the existing setter", async () => {
    const cancel = vi.fn();
    const generic = vi.fn().mockResolvedValue({ ok: true });
    const vars = { dealId: "deal", status: "held", reason: "Existing staff action" };
    await submitStaffStatus(vars, cancel, generic);
    expect(generic).toHaveBeenCalledWith({ data: vars });
    expect(cancel).not.toHaveBeenCalled();
  });
  it("does not submit a missing reason", async () => {
    const cancel = vi.fn();
    const generic = vi.fn();
    await expect(submitStaffStatus({ dealId: "deal", status: "cancelled", reason: " " }, cancel, generic)).rejects.toThrow();
    expect(cancel).not.toHaveBeenCalled();
    expect(generic).not.toHaveBeenCalled();
  });
});

describe("decision gross allocation display", () => {
  it("shows 70/30 on BHD 1,000.000 with the remainder in the refund", () => {
    expect(splitDisplay(1000, 30, "BHD")).toEqual({ release: 700, refund: 300 });
    expect(splitDisplay(1.001, 30, "BHD")).toEqual({ release: 0.701, refund: 0.3 });
  });
});