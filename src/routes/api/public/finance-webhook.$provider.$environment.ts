import { createFileRoute } from "@tanstack/react-router";

/**
 * Provider webhook endpoint (one URL per provider and environment).
 * No adapter has a verified webhook specification yet, so every request is refused without being read or stored.
 * Signature verification will live in the provider's adapter once its official specification exists.
 */
export const Route = createFileRoute("/api/public/finance-webhook/$provider/$environment")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const valid = /^[a-z][a-z0-9_]{1,30}$/.test(params.provider) && ["sandbox", "production"].includes(params.environment);
        return new Response(JSON.stringify({ accepted: false, reason: valid ? "adapter_not_built" : "unknown_endpoint" }), {
          status: valid ? 501 : 404, headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
