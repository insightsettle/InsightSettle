import { describe, expect, it } from "vitest";
import { levelAllows, levelFromRoles, rolesForLevel, STAFF_LEVELS } from "./staff-levels";

describe("staff permission levels", () => {
  it("derives levels from roles, narrowing roles win over plain staff", () => {
    expect(levelFromRoles(["admin"])).toBe("admin");
    expect(levelFromRoles(["staff"])).toBe("operations");
    expect(levelFromRoles(["staff", "support"])).toBe("support");
    expect(levelFromRoles(["staff", "finance"])).toBe("finance");
    expect(levelFromRoles(["staff", "compliance"])).toBe("viewer");
    expect(levelFromRoles(["support"])).toBeNull();
    expect(levelFromRoles([])).toBeNull();
  });
  it("round-trips every level through its role rows", () => {
    for (const l of STAFF_LEVELS) expect(levelFromRoles(rolesForLevel(l))).toBe(l);
    expect(rolesForLevel("none")).toEqual([]);
  });
  it("grants capabilities by level", () => {
    const table = STAFF_LEVELS.map((l) => [l, (["read", "support", "finance", "admin"] as const).map((c) => levelAllows(l, c))]);
    expect(table).toEqual([
      ["admin", [true, true, true, true]],
      ["operations", [true, true, true, false]],
      ["support", [true, true, false, false]],
      ["finance", [true, false, true, false]],
      ["viewer", [true, false, false, false]],
    ]);
    expect(levelAllows(null, "read")).toBe(false);
  });
});
