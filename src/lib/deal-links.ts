/**
 * Deal links (founder, 27 Oct): a seller creates an offer once and shares one link on WhatsApp, Instagram
 * or anywhere. Each buyer who opens it and continues gets their own deal with the seller's terms; the buyer
 * then reviews and accepts the terms on the deal page as usual. Nothing is paid before both agree.
 */
import { z } from "zod";

export const LINK_DEAL_TYPES = ["goods", "services", "freelance"] as const;
export const LINK_CURRENCIES = ["SAR", "BHD", "AED", "QAR", "KWD", "OMR", "USD"] as const;

export const dealLinkSchema = z.object({
  dealType: z.enum(LINK_DEAL_TYPES),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(3000).default(""),
  amount: z.number().positive().max(10_000_000),
  currency: z.enum(LINK_CURRENCIES),
  quantity: z.number().positive().max(1_000_000).default(1),
  feePayer: z.enum(["buyer", "seller", "split"]).default("buyer"),
  inspectionDays: z.number().int().min(1).max(30).default(3),
  deliveryDays: z.number().int().min(1).max(180).default(7),
  shippingRequired: z.boolean().default(true),
  shippingResponsibility: z.enum(["seller", "buyer", "none"]).default("seller"),
  supplierCountry: z.string().max(10).nullable().default("SA"),
  acceptanceCriteria: z.string().trim().max(3000).default(""),
  refundConditions: z.string().trim().max(3000).default(""),
  cancellationConditions: z.string().trim().max(3000).default(""),
  autoRelease: z.boolean().default(true),
  maxUses: z.number().int().min(1).max(10_000).nullable().default(null),
  expiresInDays: z.number().int().min(1).max(365).nullable().default(30),
});
export type DealLinkInput = z.input<typeof dealLinkSchema>;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i: easy to read aloud
/** Short, unguessable public code (10 characters from a 31-character alphabet ≈ 49 bits). */
export function newLinkCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const bytes = random(10);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const linkCodeSchema = z.string().regex(/^[a-z0-9]{8,16}$/);

export type LinkState = "open" | "paused" | "expired" | "sold_out";
export function linkState(l: { active: boolean; expires_at: string | null; max_uses: number | null; uses: number }, now = new Date()): LinkState {
  if (!l.active) return "paused";
  if (l.expires_at && new Date(l.expires_at) <= now) return "expired";
  if (l.max_uses != null && l.uses >= l.max_uses) return "sold_out";
  return "open";
}
export const LINK_STATE_TEXT: Record<LinkState, readonly [string, string]> = {
  open: ["Open", "متاح"],
  paused: ["Paused by the seller", "أوقفه البائع"],
  expired: ["Expired", "انتهت صلاحيته"],
  sold_out: ["No longer available", "لم يعد متاحاً"],
};

export function dealLinkUrl(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/d/${code}`;
}

/** Text for sharing a link (WhatsApp or anywhere). Never names the payment provider. */
export function shareText(lang: "ar" | "en", title: string, amountText: string, url: string) {
  return lang === "ar"
    ? `${title} — ${amountText}\nادفع بأمان عبر إنسايت: يبقى المبلغ محفوظاً حتى تستلم وتتأكد.\n${url}`
    : `${title} — ${amountText}\nPay safely with Insight: the amount stays held until you receive and check.\n${url}`;
}
export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
