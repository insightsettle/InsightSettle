import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenSchema = z.object({ token: z.string().min(8).max(80) });

/** Joins the signed-in user to a deal through its invitation token. */
export const acceptDealInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: deal, error } = await supabaseAdmin
      .from("deals")
      .select("*")
      .eq("invite_token", data.token)
      .maybeSingle();
    if (error) throw error;
    if (!deal) return { ok: false as const, reason: "not_found" as const };

    if (deal.buyer_id === context.userId || deal.seller_id === context.userId) {
      return { ok: true as const, ref: deal.ref };
    }
    if (deal.buyer_id && deal.seller_id) {
      return { ok: false as const, reason: "already_joined" as const };
    }

    const patch = deal.buyer_id ? { seller_id: context.userId } : { buyer_id: context.userId };
    const { error: updateError } = await supabaseAdmin
      .from("deals")
      .update(patch)
      .eq("id", deal.id);
    if (updateError) throw updateError;

    await supabaseAdmin.from("deal_events").insert({
      deal_id: deal.id,
      actor_id: context.userId,
      title: "Invitation accepted — both parties are now on the deal",
    });

    return { ok: true as const, ref: deal.ref };
  });
