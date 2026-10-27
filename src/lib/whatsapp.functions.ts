import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeGulfPhone } from "@/lib/whatsapp";

/** The signed-in user's WhatsApp preference. The phone is shown masked. */
export const getWhatsAppPreference = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("profiles").select("phone, whatsapp_opt_in").eq("id", context.userId).maybeSingle();
    const to = normalizeGulfPhone(data?.phone);
    return { optIn: !!data?.whatsapp_opt_in, phoneOk: !!to, phoneMasked: to ? `+${to.slice(0, 3)} ••• ${to.slice(-4)}` : null };
  });

export const setWhatsAppPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { optIn: boolean }) => z.object({ optIn: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: p } = await db.from("profiles").select("phone").eq("id", context.userId).maybeSingle();
    if (data.optIn && !normalizeGulfPhone(p?.phone)) throw new Error("Add a Gulf mobile number to your account first.");
    const { error } = await db.from("profiles").update({ whatsapp_opt_in: data.optIn, whatsapp_opt_in_at: data.optIn ? new Date().toISOString() : null }).eq("id", context.userId);
    if (error) throw new Error("Your preference could not be saved.");
    return { ok: true };
  });
