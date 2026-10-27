/**
 * WhatsApp deal updates (founder, 27 Oct). Pure helpers, shared by the server and tests.
 * Messages never name the payment provider and never include amounts owed to Insight.
 */
export const WHATSAPP_TEMPLATE_DEFAULT = "insight_deal_update";

/** Normalises a Gulf mobile number to digits with country code (Meta's `to` format), or null. */
export function normalizeGulfPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (/^05\d{8}$/.test(d)) d = "966" + d.slice(1);            // Saudi Arabia 05xxxxxxxx
  else if (/^5\d{8}$/.test(d)) d = "966" + d;                  // Saudi Arabia 5xxxxxxxx
  else if (/^[36]\d{7}$/.test(d)) d = "973" + d;               // Bahrain 3xxxxxxx / 6xxxxxxx
  const ok = /^(9665\d{8}|973[36]\d{7}|9715\d{8}|965[569]\d{7}|974[3567]\d{7}|968[79]\d{7})$/.test(d);
  return ok ? d : null;
}

export function dealUrl(origin: string, ref: string | null | undefined) {
  return ref ? `${origin.replace(/\/$/, "")}/deals/${ref}` : origin.replace(/\/$/, "");
}

/** The text logged for every message and the three template parameters: title, deal reference, link. */
export function renderDealUpdate(input: { titleAr: string; titleEn: string; dealRef: string | null; url: string }) {
  const ref = input.dealRef ?? "";
  const body = `إنسايت: ${input.titleAr}${ref ? ` — ${ref}` : ""}\n${input.url}\n\nInsight: ${input.titleEn}${ref ? ` — ${ref}` : ""}`;
  return { body, params: [input.titleAr, ref || "—", input.url] };
}

export type WhatsAppConfig = { enabled: boolean; token: string | undefined; phoneNumberId: string | undefined; template: string; language: string; apiVersion: string };
export function whatsappConfig(env: Record<string, string | undefined>): WhatsAppConfig {
  const token = env["WHATSAPP_TOKEN"], phoneNumberId = env["WHATSAPP_PHONE_NUMBER_ID"];
  return {
    enabled: env["WHATSAPP_ENABLED"] === "true" && !!token && !!phoneNumberId,
    token, phoneNumberId,
    template: env["WHATSAPP_TEMPLATE"] || WHATSAPP_TEMPLATE_DEFAULT,
    language: env["WHATSAPP_TEMPLATE_LANG"] || "ar",
    apiVersion: env["WHATSAPP_API_VERSION"] || "v21.0",
  };
}

/** Meta WhatsApp Cloud API template message body (business-initiated messages must use an approved template). */
export function cloudApiPayload(to: string, cfg: WhatsAppConfig, params: string[]) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: cfg.template,
      language: { code: cfg.language },
      components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: text.slice(0, 900) })) }],
    },
  };
}
