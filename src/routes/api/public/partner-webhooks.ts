import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Scheduled job (every minute): sends partner webhook events that are due, with retries
 * (1 min, 5 min, 30 min, 2 h, 6 h, 24 h, then failed). Called only by the scheduled job (cron secret required).
 */
export const Route = createFileRoute("/api/public/partner-webhooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const [{ supabaseAdmin }, { deliverPendingWebhooks }] = await Promise.all([
            import("@/integrations/supabase/client.server"),
            import("@/lib/partner-api.server"),
          ]);
          const result = await deliverPendingWebhooks(supabaseAdmin as any, { limit: 50 });
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("partner webhook job failed", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
