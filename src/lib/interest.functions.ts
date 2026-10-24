import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INTEREST_NOTICE_VERSION, INTEREST_REGISTER_ENABLED } from "@/lib/feature-flags";

const entry = z.object({
  fullName: z.string().trim().min(2).max(120),
  company: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(200),
  country: z.enum(["SA", "BH", "AE", "KW", "QA", "OM", "OTHER"]),
  role: z.enum(["buyer", "supplier", "auction_organiser", "contractor", "other"]),
  volume: z.enum(["lt_10k", "10k_50k", "50k_250k", "gt_250k"]).optional(),
  consent: z.literal(true),
});

export const interestRegisterStatus = createServerFn({ method: "GET" }).handler(async () => ({ enabled: INTEREST_REGISTER_ENABLED, notice: INTEREST_NOTICE_VERSION }));

/** Public: register interest. Refused while the feature flag is off. */
export const submitInterest = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => entry.parse(i))
  .handler(async ({ data }) => {
    if (!INTEREST_REGISTER_ENABLED) throw new Error("The interest register is not open yet.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("interest_register").upsert({
      full_name: data.fullName, company: data.company || null, email: data.email.toLowerCase(), country: data.country,
      role: data.role, monthly_volume_band: data.volume ?? null, notice_version: INTEREST_NOTICE_VERSION, consent_at: new Date().toISOString(),
    }, { onConflict: "email" });
    if (error) throw new Error("Could not save your registration. Please try again.");
    return { ok: true };
  });

export const listInterest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaffAccess } = await import("@/lib/staff-auth.server");
    const db = await requireStaffAccess(context);
    const { data, error } = await (db as any).from("interest_register").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return { enabled: INTEREST_REGISTER_ENABLED, rows: (data ?? []) as any[] };
  });

/** Staff: delete an entry on the person's request (PDPL). Audit-logged. */
export const deleteInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { requireStaffAccess } = await import("@/lib/staff-auth.server");
    const db = await requireStaffAccess(context, "support");
    const { error } = await (db as any).from("interest_register").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await (db as any).from("audit_logs").insert({ user_id: context.userId, action: "interest_deleted_on_request", entity: "interest_register", entity_id: data.id });
    return { ok: true };
  });
