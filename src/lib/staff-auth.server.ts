/**
 * Single staff authorisation check used by every staff-only server function.
 */

// Set to true together with restoring MfaGate in the console route (SRS SEC-1, decision D-19)
export const STAFF_MFA_REQUIRED = false;

export const STAFF_ROLES = ["admin", "staff"] as const;

type StaffCtx = { supabase: any; userId: string; claims?: any };

/** True when the signed-in user holds a staff role (and, if required, signed in with a second factor). */
export async function isStaffUser(ctx: StaffCtx): Promise<boolean> {
  for (const role of STAFF_ROLES) {
    const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: role });
    if (error) throw error;
    if (data === true) return true;
  }
  return false;
}

/** Throws unless the caller is staff. Returns the privileged client for staff work. */
export async function requireStaffAccess(ctx: StaffCtx) {
  if (!(await isStaffUser(ctx))) throw new Error("Forbidden");
  if (STAFF_MFA_REQUIRED && ctx.claims?.aal !== "aal2")
    throw new Error("Complete two-step verification to use staff actions.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
