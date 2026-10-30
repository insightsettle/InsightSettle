import { createFileRoute } from "@tanstack/react-router";

/**
 * Partner API v1 (server to server). Auth: `Authorization: Bearer ins_test_...` from the partner page.
 *
 *   GET  /api/partner/v1/health                 no key needed
 *   GET  /api/partner/v1/me
 *   POST /api/partner/v1/deals                  Idempotency-Key header required
 *   GET  /api/partner/v1/deals?reference=&limit=&starting_after=
 *   GET  /api/partner/v1/deals/{ref}
 *   POST /api/partner/v1/deals/{ref}/shipping
 *   POST /api/partner/v1/deals/{ref}/deliver
 *   POST /api/partner/v1/deals/{ref}/cancel
 *   GET  /api/partner/v1/events?limit=&starting_after=
 *   POST /api/partner/v1/webhook/test
 *
 * Errors: { error: { code, message, issues? } } with the matching HTTP status. No CORS: browsers must not hold keys.
 */
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Insight-Api": "partner-v1", ...extra } });

async function handle(request: Request, splat: string | undefined) {
  const url = new URL(request.url);
  const parts = (splat ?? "").split("/").filter(Boolean);
  const method = request.method.toUpperCase();
  if (method === "GET" && parts.length === 1 && parts[0] === "health") return json({ ok: true, api: "partner", version: "v1" });

  const [{ supabaseAdmin }, api] = await Promise.all([import("@/integrations/supabase/client.server"), import("@/lib/partner-api.server")]);
  const admin = supabaseAdmin as any;
  const auth = await api.authenticatePartner(admin, request.headers.get("authorization"));
  if ("status" in auth) return json(auth.body, auth.status);
  const ctx = auth;
  const path = "/" + parts.join("/");
  if (await api.isRateLimited(admin, ctx.partner.id)) {
    await api.logRequest(admin, ctx, method, path, 429);
    return json({ error: { code: "rate_limited", message: "Too many requests. Wait a minute and try again." } }, 429, { "Retry-After": "60" });
  }
  const origin = url.origin;
  const body = method === "POST" ? await request.text() : "";
  let result: { status: number; body: unknown };
  try {
    if (method === "GET" && path === "/me") {
      result = { status: 200, body: { partner: { id: ctx.partner.id, name: ctx.partner.name, webhook_url: ctx.partner.webhook_url }, key: { mode: ctx.key.mode } } };
    } else if (path === "/deals" && method === "POST") {
      result = await api.createPartnerDeal(admin, ctx, body, request.headers.get("idempotency-key"), origin);
    } else if (path === "/deals" && method === "GET") {
      result = await api.listPartnerDeals(admin, ctx, url, origin);
    } else if (parts[0] === "deals" && parts.length === 2 && method === "GET") {
      result = await api.getPartnerDeal(admin, ctx, decodeURIComponent(parts[1]!), origin);
    } else if (parts[0] === "deals" && parts.length === 3 && method === "POST") {
      const ref = decodeURIComponent(parts[1]!);
      result = parts[2] === "shipping" ? await api.updatePartnerShipping(admin, ctx, ref, body, origin)
        : parts[2] === "deliver" ? await api.confirmPartnerDelivery(admin, ctx, ref, origin)
        : parts[2] === "cancel" ? await api.cancelPartnerDeal(admin, ctx, ref, body, origin)
        : { status: 404, body: { error: { code: "not_found", message: "Unknown endpoint." } } };
    } else if (path === "/events" && method === "GET") {
      result = await api.listPartnerEvents(admin, ctx, url);
    } else if (path === "/webhook/test" && method === "POST") {
      result = await api.sendTestEvent(admin, ctx);
    } else {
      result = { status: 404, body: { error: { code: "not_found", message: "Unknown endpoint." } } };
    }
  } catch (e) {
    console.error("partner api error", path, e);
    result = { status: 500, body: { error: { code: "server_error", message: "Something went wrong on Insight's side. Try again." } } };
  }
  await api.logRequest(admin, ctx, method, path, result.status);
  // Changes made through the API are announced right away; changes made in the app go out with the next scheduled run.
  if (method === "POST" && result.status < 300) await api.deliverPendingWebhooks(admin, { partnerId: ctx.partner.id, limit: 10 }).catch(() => undefined);
  return json(result.body, result.status);
}

export const Route = createFileRoute("/api/partner/v1/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handle(request, (params as { _splat?: string })._splat),
      POST: async ({ request, params }) => handle(request, (params as { _splat?: string })._splat),
    },
  },
});
