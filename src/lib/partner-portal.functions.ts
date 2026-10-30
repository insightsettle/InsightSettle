/**
 * Partner page («واجهة الربط»): a verified business turns on the partner API, manages test keys and its webhook.
 * Keys and the webhook secret are shown once, when created; Insight stores only a hash of each key.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}
async function eligible(admin: any, userId: string) {
  const { data, error } = await admin.rpc("auction_is_verified_business", { uid: userId });
  if (error) throw error;
  return data === true;
}
async function myPartner(admin: any, userId: string) {
  const { data, error } = await admin.from("partner_accounts").select("id, name, status, webhook_url, webhook_secret, created_at").eq("owner_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export const getPartnerPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await db();
    const [isEligible, partner] = await Promise.all([eligible(admin, context.userId), myPartner(admin, context.userId)]);
    if (!partner) return { eligible: isEligible, partner: null, keys: [], events: [], deals: 0 };
    const [{ data: keys }, { data: events }, { count }] = await Promise.all([
      admin.from("partner_api_keys").select("id, mode, prefix, label, created_at, last_used_at, revoked_at").eq("partner_id", partner.id).order("created_at", { ascending: false }),
      admin.from("partner_webhook_events").select("id, type, status, attempts, last_status, last_error, created_at, delivered_at, payload").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(20),
      admin.from("deals").select("id", { count: "exact", head: true }).eq("partner_id", partner.id),
    ]);
    return {
      eligible: isEligible,
      partner: { id: partner.id, name: partner.name, status: partner.status, webhook_url: partner.webhook_url, has_secret: !!partner.webhook_secret, created_at: partner.created_at },
      keys: keys ?? [],
      events: (events ?? []).map((e: any) => ({ id: e.id, type: e.type, status: e.status, attempts: e.attempts, last_status: e.last_status, last_error: e.last_error, created_at: e.created_at, delivered_at: e.delivered_at, ref: e.payload?.data?.deal?.ref ?? null })),
      deals: count ?? 0,
    };
  });

export const enablePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { name: string }) => z.object({ name: z.string().trim().min(2).max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await db();
    if (!(await eligible(admin, context.userId))) throw new Error("The partner API is for verified business accounts. Complete your business verification first.");
    if (await myPartner(admin, context.userId)) throw new Error("The partner API is already on for this account.");
    const { newWebhookSecret } = await import("@/lib/partner-core.server");
    const secret = newWebhookSecret();
    const { error } = await admin.from("partner_accounts").insert({ owner_id: context.userId, name: data.name, webhook_secret: secret });
    if (error) throw error;
    return { webhookSecret: secret };
  });

export const createPartnerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { label?: string }) => z.object({ label: z.string().trim().max(60).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await db();
    const partner = await myPartner(admin, context.userId);
    if (!partner) throw new Error("Turn on the partner API first.");
    if (partner.status !== "active") throw new Error("This partner account is suspended.");
    const { MAX_ACTIVE_KEYS, newApiKey } = await import("@/lib/partner-core.server");
    const { count } = await admin.from("partner_api_keys").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).is("revoked_at", null);
    if ((count ?? 0) >= MAX_ACTIVE_KEYS) throw new Error(`You can have up to ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`);
    const k = newApiKey("test");
    const { error } = await admin.from("partner_api_keys").insert({ partner_id: partner.id, mode: "test", prefix: k.prefix, key_hash: k.hash, label: data.label || null, created_by: context.userId });
    if (error) throw error;
    return { key: k.key, prefix: k.prefix };
  });

export const revokePartnerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await db();
    const partner = await myPartner(admin, context.userId);
    if (!partner) throw new Error("Turn on the partner API first.");
    const { error } = await admin.from("partner_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", data.id).eq("partner_id", partner.id).is("revoked_at", null);
    if (error) throw error;
    return { ok: true };
  });

export const setPartnerWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { url: string | null }) => z.object({ url: z.string().trim().max(500).nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await db();
    const partner = await myPartner(admin, context.userId);
    if (!partner) throw new Error("Turn on the partner API first.");
    const url = data.url || null;
    const { isSafeWebhookUrl } = await import("@/lib/partner-core.server");
    if (url && !isSafeWebhookUrl(url)) throw new Error("Use a public https address on the standard port, for example https://shop.example.com/insight/webhooks.");
    const { error } = await admin.from("partner_accounts").update({ webhook_url: url, updated_at: new Date().toISOString() }).eq("id", partner.id);
    if (error) throw error;
    return { ok: true };
  });

export const rotateWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await db();
    const partner = await myPartner(admin, context.userId);
    if (!partner) throw new Error("Turn on the partner API first.");
    const { newWebhookSecret } = await import("@/lib/partner-core.server");
    const secret = newWebhookSecret();
    const { error } = await admin.from("partner_accounts").update({ webhook_secret: secret, updated_at: new Date().toISOString() }).eq("id", partner.id);
    if (error) throw error;
    return { webhookSecret: secret };
  });

export const sendPartnerTestEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await db();
    const partner = await myPartner(admin, context.userId);
    if (!partner) throw new Error("Turn on the partner API first.");
    if (!partner.webhook_url) throw new Error("Add your webhook address first.");
    const { emitPing, deliverPendingWebhooks } = await import("@/lib/partner-api.server");
    await emitPing(admin, partner.id);
    return deliverPendingWebhooks(admin, { partnerId: partner.id, limit: 5 });
  });

/** For a party on a deal created through a partner: the partner's name, and where the buyer goes back to. */
export const getDealPartner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string }) => z.object({ dealId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await db();
    const { data: deal } = await admin.from("deals").select("partner_id, partner_return_url, partner_mode, buyer_id, seller_id").eq("id", data.dealId).maybeSingle();
    if (!deal?.partner_id || (deal.buyer_id !== context.userId && deal.seller_id !== context.userId)) return null;
    const { data: partner } = await admin.from("partner_accounts").select("name").eq("id", deal.partner_id).maybeSingle();
    return { name: partner?.name ?? "", returnUrl: deal.buyer_id === context.userId ? deal.partner_return_url : null, mode: deal.partner_mode };
  });
