/**
 * Single staff authorisation check used by every staff-only server function.
 * Reads need any staff level; writes name the capability they need (support, finance or admin).
 */
import { CAPABILITY_DENIED, levelAllows, levelFromRoles, STAFF_ROLE_NAMES, type StaffCapability, type StaffLevel } from "@/lib/staff-levels";


export const STAFF_ROLES = ["admin", "staff"] as const;

type StaffCtx = { supabase: any; userId: string; claims?: any };

/** True when the signed-in user holds a staff role. */
export async function isStaffUser(ctx: StaffCtx): Promise<boolean> {
  for (const role of STAFF_ROLES) {
    const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: role });
    if (error) throw error;
    if (data === true) return true;
  }
  return false;
}

/** The caller's staff level, or null when not staff. */
export async function staffLevelFor(ctx: StaffCtx): Promise<StaffLevel | null> {
  const roles: string[] = [];
  for (const role of STAFF_ROLE_NAMES) {
    const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: role });
    if (error) throw error;
    if (data === true) roles.push(role);
  }
  return levelFromRoles(roles);
}

/** Throws unless the caller is staff with the capability. Returns the privileged client for staff work. */
export async function requireStaffAccess(ctx: StaffCtx, capability: StaffCapability = "read") {
  if (!(await isStaffUser(ctx))) throw new Error("Forbidden");
  if (capability !== "read") {
    const level = await staffLevelFor(ctx);
    if (!levelAllows(level, capability)) throw new Error(CAPABILITY_DENIED[capability]);
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
