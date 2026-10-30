/**
 * Partner API v1: database work behind /api/partner/v1 (keys, idempotency, deals, events, webhook delivery).
 * The partner account owner is the seller on every deal it creates; the buyer joins by the checkout link with the
 * invited email. A partner can update shipping, confirm delivery or cancel an unpaid deal. It can never release,
 * refund or decide a dispute: those follow Insight's rules only.
 */
import { createSchema, createTypedDealAs } from "@/lib/deal-milestones.functions";
import { confirmDeliveryAs, updateShippingAs } from "@/lib/deal-party.functions";
import {
  apiError, cancelSchema, createDealSchema, hashSecret, isSafeWebhookUrl, looksLikeApiKey, nextAttemptDelay,
  RATE_LIMIT_PER_MINUTE, requestHash, shippingSchema, signWebhook, toTypedDealInput, validationError, type PartnerError,
} from "@/lib/partner-core.server";

type Admin = any;
export type PartnerContext = {
  partner: { id: string; owner_id: string; name: string; status: string; webhook_url: string | null };
  key: { id: string; mode: "test" | "live" };
};
export type ApiResult = { status: number; body: unknown };

const ok = (status: number, body: unknown): ApiResult => ({ status, body });
const fail = (e: PartnerError & { issues?: unknown }): ApiResult => ({
  status: e.status, body: { error: { code: e.code, message: e.message, ...(e.issues ? { issues: e.issues } : {}) } },
});

export async function authenticatePartner(admin: Admin, authorization: string | null): Promise<PartnerContext | ApiResult> {
  const m = /^Bearer\s+(\S+)$/.exec(authorization ?? "");
  if (!m || !looksLikeApiKey(m[1]!)) return fail(apiError(401, "unauthorized", "Send your API key as: Authorization: Bearer ins_test_..."));
  const { data: key, error } = await admin.from("partner_api_keys")
    .select("id, mode, revoked_at, partner:partner_accounts(id, owner_id, name, status, webhook_url)")
    .eq("key_hash", hashSecret(m[1]!)).maybeSingle();
  if (error) throw error;
  if (!key || key.revoked_at || !key.partner) return fail(apiError(401, "unauthorized", "This API key is not valid or was revoked."));
  if (key.partner.status !== "active") return fail(apiError(403, "partner_suspended", "This partner account is suspended. Contact Insight."));
  if (key.mode === "live") return fail(apiError(403, "live_not_available", "Live keys are not available yet. Use a test key."));
  void admin.from("partner_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id).then(() => undefined);
  return { partner: key.partner, key: { id: key.id, mode: key.mode } };
}

export async function isRateLimited(admin: Admin, partnerId: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin.from("partner_request_log").select("id", { count: "exact", head: true }).eq("partner_id", partnerId).gte("created_at", since);
  return (count ?? 0) >= RATE_LIMIT_PER_MINUTE;
}

export async function logRequest(admin: Admin, ctx: PartnerContext, method: string, path: string, status: number) {
  await admin.from("partner_request_log").insert({ partner_id: ctx.partner.id, key_id: ctx.key.id, method, path: path.slice(0, 300), status });
}

export function dealView(d: any, milestones: any[], origin: string) {
  return {
    id: d.id, ref: d.ref, reference: d.partner_reference, mode: d.partner_mode, type: d.deal_type,
    status: d.status, terms_status: d.terms_status, shipping_status: d.shipping_status,
    title: d.title, amount: Number(d.amount), currency: d.currency, fee_payer: d.fee_payer, inspection_days: d.inspection_days,
    buyer: { email: d.counterparty_email, joined: !!d.buyer_id },
    checkout_url: `${origin}/invite/${d.invite_token}`,
    deal_url: `${origin}/deals/${d.ref}`,
    shipping: { carrier: d.shipping_carrier ?? null, tracking: d.shipping_tracking ?? null, shipped_at: d.shipped_at ?? null },
    delivered_at: d.delivered_at ?? null, auto_release_at: d.auto_release_at ?? null, released_at: d.released_at ?? null,
    milestones: milestones.sort((a, b) => a.seq - b.seq).map((x) => ({ seq: x.seq, title: x.title, amount: Number(x.amount), status: x.status })),
    metadata: d.partner_metadata ?? {}, created_at: d.created_at,
  };
}

async function loadOwnedDeal(admin: Admin, ctx: PartnerContext, ref: string) {
  const { data: deal, error } = await admin.from("deals").select("*").eq("ref", ref).eq("partner_id", ctx.partner.id).maybeSingle();
  if (error) throw error;
  return deal;
}
async function milestonesOf(admin: Admin, dealId: string) {
  const { data } = await admin.from("deal_milestones").select("seq, title, amount, status").eq("deal_id", dealId);
  return data ?? [];
}

export async function createPartnerDeal(admin: Admin, ctx: PartnerContext, rawBody: string, idemKey: string | null, origin: string): Promise<ApiResult> {
  if (!idemKey || idemKey.length < 8 || idemKey.length > 120) return fail(apiError(400, "idempotency_key_required", "Send a unique Idempotency-Key header (8 to 120 characters) with every POST /deals."));
  const hash = requestHash("POST", "/deals", rawBody);
  const { data: prior } = await admin.from("partner_idempotency").select("request_hash, status, response").eq("partner_id", ctx.partner.id).eq("idem_key", idemKey).maybeSingle();
  if (prior) {
    if (prior.request_hash !== hash) return fail(apiError(409, "idempotency_conflict", "This Idempotency-Key was already used with a different request."));
    return ok(prior.status, prior.response);
  }
  let json: unknown;
  try { json = rawBody ? JSON.parse(rawBody) : {}; } catch { return fail(apiError(400, "invalid_json", "The request body must be JSON.")); }
  const parsed = createDealSchema.safeParse(json);
  if (!parsed.success) return fail(validationError(parsed.error));
  const input = parsed.data;

  const [{ data: owner }, { data: authUser }] = await Promise.all([
    admin.from("profiles").select("account_state, country").eq("id", ctx.partner.owner_id).maybeSingle(),
    admin.auth.admin.getUserById(ctx.partner.owner_id),
  ]);
  if (!owner || owner.account_state !== "active") return fail(apiError(403, "account_restricted", "The partner's Insight account cannot create deals right now."));
  if ((authUser?.user?.email ?? "").toLowerCase() === input.buyer.email) return fail(apiError(400, "buyer_is_seller", "The buyer email is the partner's own account."));
  const { data: existing } = await admin.from("deals").select("ref").eq("partner_id", ctx.partner.id).eq("partner_reference", input.reference).maybeSingle();
  if (existing) return fail(apiError(409, "duplicate_reference", `A deal with this reference already exists (${existing.ref}).`));

  const typed = createSchema.safeParse(toTypedDealInput(input, owner.country ?? null));
  if (!typed.success) return fail(validationError(typed.error));
  let created: { id: string; ref: string };
  try {
    created = await createTypedDealAs(ctx.partner.owner_id, typed.data, {
      partner_id: ctx.partner.id, partner_reference: input.reference, partner_metadata: input.metadata,
      partner_return_url: input.return_url ?? null, partner_mode: ctx.key.mode,
    });
  } catch (e) {
    return fail(apiError(400, "deal_rejected", e instanceof Error ? e.message : "The deal could not be created."));
  }
  await admin.from("deal_events").insert({ deal_id: created.id, actor_id: ctx.partner.owner_id, title: `Created through ${ctx.partner.name} (partner API)`, note: `Partner reference: ${input.reference}` });
  const deal = await loadOwnedDeal(admin, ctx, created.ref);
  const body = { deal: dealView(deal, await milestonesOf(admin, deal.id), origin) };
  await admin.from("partner_idempotency").insert({ partner_id: ctx.partner.id, idem_key: idemKey, request_hash: hash, status: 201, response: body });
  return ok(201, body);
}

export async function getPartnerDeal(admin: Admin, ctx: PartnerContext, ref: string, origin: string): Promise<ApiResult> {
  const deal = await loadOwnedDeal(admin, ctx, ref);
  if (!deal) return fail(apiError(404, "not_found", "No deal with this reference for your account."));
  return ok(200, { deal: dealView(deal, await milestonesOf(admin, deal.id), origin) });
}

export async function listPartnerDeals(admin: Admin, ctx: PartnerContext, url: URL, origin: string): Promise<ApiResult> {
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 100);
  let q = admin.from("deals").select("*").eq("partner_id", ctx.partner.id).order("created_at", { ascending: false }).limit(limit + 1);
  const reference = url.searchParams.get("reference");
  if (reference) q = q.eq("partner_reference", reference);
  const after = url.searchParams.get("starting_after");
  if (after) {
    const { data: cursor } = await admin.from("deals").select("created_at").eq("partner_id", ctx.partner.id).eq("ref", after).maybeSingle();
    if (!cursor) return fail(apiError(400, "invalid_cursor", "starting_after must be a deal ref from an earlier page."));
    q = q.lt("created_at", cursor.created_at);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as any[];
  return ok(200, { data: rows.slice(0, limit).map((d) => dealView(d, [], origin)), has_more: rows.length > limit });
}

async function partyAction(admin: Admin, ctx: PartnerContext, ref: string, origin: string, run: (deal: any) => Promise<unknown>): Promise<ApiResult> {
  const deal = await loadOwnedDeal(admin, ctx, ref);
  if (!deal) return fail(apiError(404, "not_found", "No deal with this reference for your account."));
  try { await run(deal); } catch (e) { return fail(apiError(409, "not_allowed", e instanceof Error ? e.message : "This action is not allowed now.")); }
  return getPartnerDeal(admin, ctx, ref, origin);
}

export async function updatePartnerShipping(admin: Admin, ctx: PartnerContext, ref: string, rawBody: string, origin: string) {
  let json: unknown;
  try { json = rawBody ? JSON.parse(rawBody) : {}; } catch { return fail(apiError(400, "invalid_json", "The request body must be JSON.")); }
  const parsed = shippingSchema.safeParse(json);
  if (!parsed.success) return fail(validationError(parsed.error));
  const s = parsed.data;
  return partyAction(admin, ctx, ref, origin, (deal) => updateShippingAs(ctx.partner.owner_id, { dealId: deal.id, carrier: s.carrier, tracking: s.tracking, status: s.status, eta: s.eta ?? null }));
}

export async function confirmPartnerDelivery(admin: Admin, ctx: PartnerContext, ref: string, origin: string) {
  return partyAction(admin, ctx, ref, origin, (deal) => confirmDeliveryAs(ctx.partner.owner_id, { dealId: deal.id }));
}

export async function cancelPartnerDeal(admin: Admin, ctx: PartnerContext, ref: string, rawBody: string, origin: string) {
  let json: unknown;
  try { json = rawBody ? JSON.parse(rawBody) : {}; } catch { return fail(apiError(400, "invalid_json", "The request body must be JSON.")); }
  const parsed = cancelSchema.safeParse(json);
  if (!parsed.success) return fail(validationError(parsed.error));
  return partyAction(admin, ctx, ref, origin, async (deal) => {
    if (deal.status !== "pending_funding") throw new Error("Only a deal that has not been paid can be cancelled through the API.");
    const { count } = await admin.from("deal_transactions").select("id", { count: "exact", head: true }).eq("deal_id", deal.id).eq("kind", "funding").in("status", ["pending", "processing", "succeeded"]);
    if ((count ?? 0) > 0) throw new Error("A payment has started on this deal, so it cannot be cancelled through the API.");
    const { data: updated, error } = await admin.from("deals").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", deal.id).eq("status", "pending_funding").select("id");
    if (error) throw error;
    if (!updated?.length) throw new Error("The deal changed while cancelling. Read it again.");
    await admin.from("deal_events").insert({ deal_id: deal.id, actor_id: ctx.partner.owner_id, title: `Cancelled by ${ctx.partner.name} before payment (partner API)`, note: parsed.data.reason });
    const notify = await import("@/lib/notify.server");
    await notify.notifyDealParties(admin, deal.id, { title: "Deal cancelled before payment", body: parsed.data.reason, kind: "deal" });
  });
}

export async function listPartnerEvents(admin: Admin, ctx: PartnerContext, url: URL): Promise<ApiResult> {
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 100);
  let q = admin.from("partner_webhook_events").select("id, type, payload, status, attempts, last_status, delivered_at, created_at")
    .eq("partner_id", ctx.partner.id).order("created_at", { ascending: false }).limit(limit + 1);
  const after = url.searchParams.get("starting_after");
  if (after) {
    const { data: cursor } = await admin.from("partner_webhook_events").select("created_at").eq("partner_id", ctx.partner.id).eq("id", after).maybeSingle();
    if (!cursor) return fail(apiError(400, "invalid_cursor", "starting_after must be an event id from an earlier page."));
    q = q.lt("created_at", cursor.created_at);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as any[];
  return ok(200, {
    data: rows.slice(0, limit).map((e) => ({ ...e.payload, delivery: { status: e.status, attempts: e.attempts, last_status: e.last_status, delivered_at: e.delivered_at } })),
    has_more: rows.length > limit,
  });
}

export async function emitPing(admin: Admin, partnerId: string) {
  const { error } = await admin.rpc("partner_emit", { _partner: partnerId, _deal: null, _type: "ping", _data: { message: "Test event from Insight. Your endpoint is reachable." } });
  if (error) throw error;
}

export async function sendTestEvent(admin: Admin, ctx: PartnerContext): Promise<ApiResult> {
  if (!ctx.partner.webhook_url) return fail(apiError(409, "no_webhook_url", "Set a webhook URL in your Insight partner page first."));
  await emitPing(admin, ctx.partner.id);
  const result = await deliverPendingWebhooks(admin, { partnerId: ctx.partner.id, limit: 5 });
  return ok(200, { sent: true, delivery: result });
}

/** Sends due events. Claims each event first so two runs never send the same attempt. */
export async function deliverPendingWebhooks(admin: Admin, opts: { partnerId?: string; limit?: number } = {}) {
  const now = new Date();
  let q = admin.from("partner_webhook_events").select("id, partner_id, payload, attempts")
    .eq("status", "pending").lte("next_attempt_at", now.toISOString()).order("created_at", { ascending: true }).limit(opts.limit ?? 25);
  if (opts.partnerId) q = q.eq("partner_id", opts.partnerId);
  const { data: due, error } = await q;
  if (error) throw error;
  const partners = new Map<string, any>();
  let delivered = 0, retried = 0, failed = 0, skipped = 0;
  for (const ev of (due ?? []) as any[]) {
    const lease = new Date(Date.now() + 120_000).toISOString();
    const { data: claimed } = await admin.from("partner_webhook_events").update({ next_attempt_at: lease })
      .eq("id", ev.id).eq("status", "pending").lte("next_attempt_at", now.toISOString()).select("id");
    if (!claimed?.length) continue;
    if (!partners.has(ev.partner_id)) {
      const { data: p } = await admin.from("partner_accounts").select("webhook_url, webhook_secret, status").eq("id", ev.partner_id).maybeSingle();
      partners.set(ev.partner_id, p);
    }
    const p = partners.get(ev.partner_id);
    if (!p?.webhook_url || !p.webhook_secret || p.status !== "active" || !isSafeWebhookUrl(p.webhook_url)) {
      await admin.from("partner_webhook_events").update({ status: "skipped", last_error: "No webhook URL set" }).eq("id", ev.id);
      skipped++; continue;
    }
    const body = JSON.stringify(ev.payload);
    const ts = Math.floor(Date.now() / 1000);
    let status = 0; let errText: string | null = null;
    try {
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(p.webhook_url, {
        method: "POST", redirect: "manual", signal: ctrl.signal,
        headers: { "content-type": "application/json", "user-agent": "Insight-Webhooks/1", "insight-signature": signWebhook(p.webhook_secret, ts, body), "insight-event-id": ev.id, "insight-event-type": ev.payload?.type ?? "" },
        body,
      });
      clearTimeout(timer); status = res.status;
    } catch (e) { errText = e instanceof Error ? e.message.slice(0, 200) : "Request failed"; }
    const attempts = Number(ev.attempts) + 1;
    if (status >= 200 && status < 300) {
      await admin.from("partner_webhook_events").update({ status: "delivered", attempts, last_status: status, last_error: null, delivered_at: new Date().toISOString() }).eq("id", ev.id);
      delivered++;
    } else {
      const delay = nextAttemptDelay(attempts);
      await admin.from("partner_webhook_events").update(delay == null
        ? { status: "failed", attempts, last_status: status || null, last_error: errText ?? `HTTP ${status}` }
        : { attempts, last_status: status || null, last_error: errText ?? `HTTP ${status}`, next_attempt_at: new Date(Date.now() + delay * 1000).toISOString() }).eq("id", ev.id);
      if (delay == null) failed++; else retried++;
    }
  }
  return { delivered, retried, failed, skipped };
}
