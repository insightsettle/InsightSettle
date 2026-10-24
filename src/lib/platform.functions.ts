import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { platformSettingsSchema, SUPPORT_STATUSES } from "./platform-switches";

const reason = z.string().trim().min(3).max(2000);

async function staff(context: { supabase: any; userId: string }, adminOnly = false) {
  const { requireStaffAccess } = await import("./staff-auth.server");
  if (adminOnly) {
    const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || data !== true) throw new Error("Admin only");
  }
  return (await requireStaffAccess(context)) as any;
}
async function checked(p: PromiseLike<any>) { const r = await p; if (r.error) throw r.error; return r.data; }

export const readPlatformSettings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await staff(context, true);
  const row = await checked(db.from("platform_settings").select("new_deals_enabled,auctions_enabled,notice_active,notice_tone,notice_en,notice_ar,updated_at").eq("id", true).single());
  return row as z.infer<typeof platformSettingsSchema> & { updated_at: string };
});

export const savePlatformSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ settings: platformSettingsSchema, reason }).parse(i))
  .handler(async ({ context, data }) => {
    const db = await staff(context, true);
    await checked(db.rpc("staff_save_platform_settings", { _actor: context.userId, _settings: data.settings, _reason: data.reason }));
    return { ok: true };
  });

export const listSupportRequests = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ status: z.enum(["open", "all", ...SUPPORT_STATUSES]).default("open") }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    const db = await staff(context);
    let q = db.from("support_requests").select("id,email,source,status,assignee_id,staff_note,created_at,updated_at").order("created_at", { ascending: false }).limit(200);
    if (data.status === "open") q = q.neq("status", "resolved");
    else if (data.status !== "all") q = q.eq("status", data.status);
    const rows = (await checked(q)) as any[];
    const roles = (await checked(db.from("user_roles").select("user_id,role").in("role", ["admin", "staff"]))) as { user_id: string }[];
    const ids = [...new Set(roles.map((r) => r.user_id))];
    const people = ids.length ? ((await checked(db.from("profiles").select("id,full_name").in("id", ids))) as { id: string; full_name: string | null }[]) : [];
    return {
      requests: rows,
      staff: people.map((p) => ({ id: p.id, name: p.full_name || "Staff" })),
    };
  });

export const updateSupportRequest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(SUPPORT_STATUSES), assigneeId: z.string().uuid().nullable(), note: z.string().max(4000), reason }).parse(i))
  .handler(async ({ context, data }) => {
    const db = await staff(context);
    await checked(db.rpc("staff_update_support_request", { _actor: context.userId, _id: data.id, _status: data.status, _assignee: data.assigneeId, _note: data.note, _reason: data.reason }));
    return { ok: true };
  });
