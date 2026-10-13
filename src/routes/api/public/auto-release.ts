import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Hourly job: runs the automatic release after the inspection period, then lets the
 * simulated payment provider confirm any simulated transaction still processing.
 * Called only by the scheduled job (cron secret required).
 */
export const Route = createFileRoute("/api/public/auto-release")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const [{ supabaseAdmin }, notify, { sweepSimulatedTransactions }] = await Promise.all([
            import("@/integrations/supabase/client.server"),
            import("@/lib/notify.server"),
            import("@/lib/settlement.server"),
          ]);
          const admin = supabaseAdmin as any;
          const { data: started, error } = await admin.rpc("run_auto_release");
          if (error) throw error;
          // Let the job's rows age past the sweep's minimum age before confirming.
          await new Promise((r) => setTimeout(r, 11_000));
          const confirmed = await sweepSimulatedTransactions(admin, notify);
          return Response.json({ ok: true, started: started ?? 0, confirmed });
        } catch (e) {
          console.error("auto-release job failed", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
