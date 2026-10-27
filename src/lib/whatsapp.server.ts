/**
 * Sends (or, until configured, only logs) WhatsApp deal updates to users who opted in.
 * Never throws: an in-app notification must not fail because WhatsApp did.
 */
import { cloudApiPayload, dealUrl, normalizeGulfPhone, renderDealUpdate, whatsappConfig } from "@/lib/whatsapp";

type Admin = { from: (t: string) => any };

export async function queueWhatsApp(admin: Admin, input: { userIds: string[]; dealId?: string | null; dealRef?: string | null; title: string; event?: string }) {
  try {
    if (!input.userIds.length) return;
    const { data: people } = await admin.from("profiles").select("id, phone, whatsapp_opt_in").in("id", input.userIds);
    const cfg = whatsappConfig(process.env as Record<string, string | undefined>);
    const origin = process.env["PUBLIC_SITE_URL"] || "https://insightsettle.com";
    const { translateText } = await import("@/lib/locale");
    const titleAr = translateText(input.title);
    const msg = renderDealUpdate({ titleAr, titleEn: input.title, dealRef: input.dealRef ?? null, url: dealUrl(origin, input.dealRef) });
    for (const p of people ?? []) {
      if (!p.whatsapp_opt_in) continue;
      const to = normalizeGulfPhone(p.phone);
      const base = { user_id: p.id, deal_id: input.dealId ?? null, event: input.event ?? "deal", phone_last4: to ? to.slice(-4) : null, body: msg.body, template: cfg.template, params: msg.params };
      if (!to) { await admin.from("whatsapp_outbox").insert({ ...base, status: "skipped", error: "No valid Gulf mobile number on the account" }); continue; }
      if (!cfg.enabled) { await admin.from("whatsapp_outbox").insert({ ...base, status: "disabled", error: "WhatsApp sending is not configured yet" }); continue; }
      try {
        const res = await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(cloudApiPayload(to, cfg, msg.params)),
          signal: AbortSignal.timeout(8000),
        });
        const json: any = await res.json().catch(() => ({}));
        if (res.ok) await admin.from("whatsapp_outbox").insert({ ...base, status: "sent", provider_message_id: json?.messages?.[0]?.id ?? null, sent_at: new Date().toISOString() });
        else await admin.from("whatsapp_outbox").insert({ ...base, status: "failed", error: String(json?.error?.message ?? res.status).slice(0, 300) });
      } catch (e) {
        await admin.from("whatsapp_outbox").insert({ ...base, status: "failed", error: String((e as Error).message).slice(0, 300) });
      }
    }
  } catch { /* never block the in-app notification */ }
}
