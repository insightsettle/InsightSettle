import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Notifies the other party (and the Insight team when asked) about something
 * that happened on a deal: a new message, a status change, an arbitration request.
 */
export const notifyDealActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { dealId: string; title: string; body?: string | null; alertStaff?: boolean }) =>
      z
        .object({
          dealId: z.string().uuid(),
          title: z.string().min(3).max(160),
          body: z.string().max(600).nullable().optional(),
          alertStaff: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: deal, error } = await context.supabase
      .from("deals")
      .select("id, ref, buyer_id, seller_id")
      .eq("id", data.dealId)
      .maybeSingle();
    if (error) throw error;
    if (!deal) return { delivered: 0 };
    if (deal.buyer_id !== context.userId && deal.seller_id !== context.userId)
      throw new Error("Forbidden");

    const [{ supabaseAdmin }, notify] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/notify.server"),
    ]);
    const admin = supabaseAdmin as any;

    const result = await notify.notifyUsers(admin, {
      dealId: deal.id,
      title: data.title,
      body: data.body ?? null,
      recipients: [deal.buyer_id, deal.seller_id],
      excludeUserId: context.userId,
    });

    if (data.alertStaff) {
      const staff = await notify.staffUserIds(admin);
      await notify.notifyUsers(admin, {
        dealId: deal.id,
        title: `${data.title} — ${deal.ref}`,
        body: data.body ?? null,
        kind: "staff",
        recipients: staff,
      });
    }
    return result;
  });
