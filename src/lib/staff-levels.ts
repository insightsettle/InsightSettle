/**
 * Staff permission levels. Levels are stored as app_role rows in user_roles:
 *   admin      → admin (or super_admin)            full control incl. team, fees, platform settings
 *   operations → staff                              support + finance work (default for existing staff)
 *   support    → staff + support                    customer and deal help, KYC review, support inbox
 *   finance    → staff + finance                    money decisions: disputes, releases, refunds, fees per deal
 *   viewer     → staff + compliance                 read-only
 * A narrowing role (support / finance / compliance) always wins over plain staff.
 */
export const STAFF_LEVELS = ["admin", "operations", "support", "finance", "viewer"] as const;
export type StaffLevel = (typeof STAFF_LEVELS)[number];
export type StaffCapability = "read" | "support" | "finance" | "admin";

export const STAFF_LEVEL_LABEL: Record<StaffLevel | "none", readonly [string, string]> = {
  none: ["No team access", "بدون صلاحية فريق"],
  admin: ["Admin (full control)", "مدير (تحكم كامل)"],
  operations: ["Operations (support + finance)", "عمليات (دعم + مالية)"],
  support: ["Support", "دعم العملاء"],
  finance: ["Finance", "المالية"],
  viewer: ["View only", "اطلاع فقط"],
};

/** Derive a user's level from their role names; null = not staff. */
export function levelFromRoles(roles: readonly string[]): StaffLevel | null {
  const has = (r: string) => roles.includes(r);
  if (has("admin") || has("super_admin")) return "admin";
  if (!has("staff")) return null;
  if (has("compliance")) return "viewer";
  if (has("support") && has("finance")) return "operations";
  if (has("support")) return "support";
  if (has("finance")) return "finance";
  return "operations";
}

/** Role rows that represent a level (used when an admin changes someone's level). */
export function rolesForLevel(level: StaffLevel | "none"): string[] {
  switch (level) {
    case "admin": return ["admin", "staff"];
    case "operations": return ["staff"];
    case "support": return ["staff", "support"];
    case "finance": return ["staff", "finance"];
    case "viewer": return ["staff", "compliance"];
    default: return [];
  }
}

export const STAFF_ROLE_NAMES = ["admin", "super_admin", "staff", "support", "finance", "compliance"] as const;

export function levelAllows(level: StaffLevel | null, cap: StaffCapability): boolean {
  if (!level) return false;
  if (level === "admin") return true;
  if (cap === "read") return true;
  if (cap === "admin") return false;
  if (level === "operations") return true;
  if (level === "support") return cap === "support";
  if (level === "finance") return cap === "finance";
  return false; // viewer
}

export const CAPABILITY_DENIED: Record<StaffCapability, string> = {
  read: "Staff access required.",
  support: "Your team level cannot change customer or deal records. Ask an admin or a support/operations colleague.",
  finance: "Your team level cannot take money actions. Ask an admin or a finance/operations colleague.",
  admin: "Only an admin can do this.",
};
