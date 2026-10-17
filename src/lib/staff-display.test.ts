import { describe, expect, it, vi } from "vitest";
import { submitStaffStatus } from "./staff-display";

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