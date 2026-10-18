import { createFileRoute } from "@tanstack/react-router";

/**
 * Mobile API v1 (Flutter client). Every action calls the same server function the web app uses, so the
 * rules, prices, quotes, ledger and notifications are identical on web and mobile.
 *
 * Auth: `Authorization: Bearer <Supabase access token>` of the signed-in party. The server functions'
 * own middleware validates the token, so this route never trusts a user id from the body.
 * Reads that row-level security already protects (deals, milestones, transactions, invoices,
 * notifications) are made by the app directly through Supabase with the same token.
 *
 * POST /api/v1/<action> with a JSON body; GET /api/v1/health.
 * Errors: 401 when the token is missing or invalid, 400 with { error } for a refused action.
 */

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });

type Handler = (data: any) => Promise<unknown>;

async function actions(): Promise<Record<string, Handler>> {
  const [party, milestones, payments, fx, ops, invites] = await Promise.all([
    import("@/lib/deal-party.functions"),
    import("@/lib/deal-milestones.functions"),
    import("@/lib/payments.functions"),
    import("@/lib/fx-quotes.functions"),
    import("@/lib/operations.functions"),
    import("@/lib/invites.functions"),
  ]);
  const call = (fn: any): Handler => (data) => fn({ data });
  return {
    // Terms
    "accept-terms": call(party.acceptTerms),
    "request-terms-change": call(party.requestTermsChange),
    "reject-terms": call(party.rejectTerms),
    // Pricing, quote and funding (whole deal or next milestone)
    "deal-pricing": call(fx.getDealPricing),
    quote: call(fx.requestFxQuote),
    fund: call(payments.startDealFunding),
    // Goods and services delivery
    "update-shipping": call(party.updateShipping),
    "confirm-delivery": call(party.confirmDelivery),
    "request-revision": call(party.requestRevision),
    release: call(payments.requestFundsRelease),
    // Milestones
    "submit-milestone": call(milestones.submitMilestone),
    "approve-milestone": call(milestones.approveMilestone),
    "milestone-revision": call(milestones.requestMilestoneRevision),
    // Disputes, deals, invitations
    "open-dispute": call(ops.openDisputeCase),
    "create-deal": call(milestones.createTypedDeal),
    "join-deal": call(invites.acceptDealInvite),
  };
}

const API_V1_ACTIONS = [
  "accept-terms", "request-terms-change", "reject-terms", "deal-pricing", "quote", "fund", "update-shipping",
  "confirm-delivery", "request-revision", "release", "submit-milestone", "approve-milestone", "milestone-revision",
  "open-dispute", "create-deal", "join-deal",
] as const;

function errorResponse(e: unknown) {
  const message = e instanceof Error ? e.message : "The action could not be completed.";
  if (/^Unauthorized/.test(message)) return json({ error: "Sign in required." }, 401);
  // zod validation errors arrive as a JSON list of issues.
  if (message.startsWith("[")) {
    try {
      const issues = JSON.parse(message) as { path?: (string | number)[]; message?: string }[];
      return json({ error: "Some details are missing or invalid.", issues: issues.map((i) => ({ path: (i.path ?? []).join("."), message: i.message })) }, 400);
    } catch {
      /* fall through */
    }
  }
  return json({ error: message }, 400);
}

export const Route = createFileRoute("/api/v1/$action")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        if (params.action !== "health") return json({ error: "Not found." }, 404);
        return json({ ok: true, version: 1, actions: API_V1_ACTIONS });
      },
      POST: async ({ request, params }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!/^Bearer\s+\S+\.\S+\.\S+$/.test(auth)) return json({ error: "Sign in required." }, 401);
        const table = await actions();
        const handler = table[params.action];
        if (!handler) return json({ error: "Unknown action." }, 404);
        let body: unknown = {};
        try {
          const text = await request.text();
          body = text ? JSON.parse(text) : {};
        } catch {
          return json({ error: "The request body must be JSON." }, 400);
        }
        try {
          const result = await handler(body);
          return json({ ok: true, result: result ?? null });
        } catch (e) {
          return errorResponse(e);
        }
      },
    },
  },
});
