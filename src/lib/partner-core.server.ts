/**
 * Partner API v1: shared, side-effect-free pieces (validation, mapping, signing, URL rules, retry schedule).
 * The partner creates a deal from its own server and sends the buyer to Insight to accept the terms and pay.
 * Insight's rules decide every payout; a partner can never move money.
 */
import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const PARTNER_API_VERSION = "v1";
export const RATE_LIMIT_PER_MINUTE = 120;
export const MAX_ACTIVE_KEYS = 5;
/** Seconds to wait before the next delivery attempt, by attempts already made. After the last one the event is marked failed. */
export const WEBHOOK_BACKOFF_SECONDS = [60, 300, 1800, 7200, 21600, 86400] as const;

export const CURRENCIES = ["BHD", "SAR", "AED", "QAR", "KWD", "OMR", "USD"] as const;

const metadataSchema = z
  .record(z.string().min(1).max(40), z.union([z.string().max(500), z.number(), z.boolean()]))
  .refine((m) => Object.keys(m).length <= 20, "metadata can hold at most 20 keys.");

const partnerMilestone = z.object({
  title: z.string().trim().min(1).max(160),
  amount: z.number().positive().max(100_000_000),
  description: z.string().trim().max(1000).optional(),
  due_date: z.string().max(20).optional(),
  evidence_required: z.string().trim().max(500).optional(),
  kind: z.enum(["advance", "work"]).optional(),
});

export const createDealSchema = z.object({
  reference: z.string().trim().min(1).max(100),
  type: z.enum(["goods", "services", "freelance", "contracting"]).default("goods"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).default(""),
  amount: z.number().positive().max(100_000_000),
  currency: z.enum(CURRENCIES).default("BHD"),
  quantity: z.number().positive().max(1_000_000).default(1),
  buyer: z.object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().max(120).optional() }),
  fee_payer: z.enum(["buyer", "seller", "split"]).default("buyer"),
  inspection_days: z.number().int().min(1).max(30).default(3),
  shipping: z.object({ required: z.boolean().default(true), by: z.enum(["seller", "buyer"]).default("seller") }).default({ required: true, by: "seller" }),
  seller_country: z.string().trim().toUpperCase().max(10).optional(),
  delivery_country: z.string().trim().toUpperCase().max(10).optional(),
  due_date: z.string().max(20).optional(),
  acceptance_criteria: z.string().max(3000).default(""),
  refund_conditions: z.string().max(3000).default(""),
  cancellation_conditions: z.string().max(3000).default(""),
  auto_release: z.boolean().default(true),
  revisions_included: z.number().int().min(0).max(20).default(1),
  retention_percent: z.number().min(0).max(10).default(0),
  defects_liability_days: z.number().int().min(0).max(365).default(0),
  funding_mode: z.enum(["upfront", "per_milestone"]).default("upfront"),
  milestones: z.array(partnerMilestone).max(20).default([]),
  return_url: z.string().url().max(500).refine((u) => u.startsWith("https://"), "return_url must use https.").optional(),
  metadata: metadataSchema.default({}),
});
export type CreateDealInput = z.output<typeof createDealSchema>;

export const shippingSchema = z.object({
  carrier: z.string().trim().max(120).default(""),
  tracking: z.string().trim().max(120).default(""),
  status: z.enum(["preparing", "shipped", "in_transit", "out_for_delivery"]),
  eta: z.string().max(20).optional(),
});

export const cancelSchema = z.object({ reason: z.string().trim().min(3).max(500) });

/** Maps the partner's request onto the same input the web app uses to create a deal (the partner is the seller). */
export function toTypedDealInput(input: CreateDealInput, sellerCountry: string | null) {
  const goods = input.type === "goods";
  const shipping = goods && input.shipping.required;
  return {
    dealType: input.type,
    title: input.title,
    description: input.description,
    amount: input.amount,
    currency: input.currency,
    role: "seller" as const,
    counterpartyEmail: input.buyer.email,
    dueAt: input.due_date ?? null,
    feePayer: input.fee_payer,
    inspectionDays: input.inspection_days,
    shippingRequired: shipping,
    quantity: input.quantity,
    supplierCountry: input.seller_country ?? sellerCountry ?? null,
    deliveryCountry: input.delivery_country ?? null,
    shippingResponsibility: (shipping ? input.shipping.by : "none") as "seller" | "buyer" | "none",
    acceptanceCriteria: input.acceptance_criteria,
    refundConditions: input.refund_conditions,
    cancellationConditions: input.cancellation_conditions,
    autoRelease: input.auto_release,
    revisionsIncluded: input.type === "freelance" ? input.revisions_included : 0,
    retentionPercent: input.type === "contracting" ? input.retention_percent : 0,
    defectsLiabilityDays: input.type === "contracting" ? input.defects_liability_days : 0,
    fundingMode: goods ? ("upfront" as const) : input.funding_mode,
    milestones: goods ? [] : input.milestones.map((m) => ({
      title: m.title, amount: m.amount, description: m.description ?? null, dueDate: m.due_date ?? null,
      evidenceRequired: m.evidence_required ?? null, ...(m.kind ? { kind: m.kind } : {}),
    })),
  };
}

export function newApiKey(mode: "test" | "live" = "test") {
  const key = `ins_${mode}_${randomBytes(32).toString("base64url")}`;
  return { key, prefix: key.slice(0, 16), hash: hashSecret(key) };
}
export function newWebhookSecret() {
  return `whsec_${randomBytes(32).toString("base64url")}`;
}
export function hashSecret(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
export function looksLikeApiKey(value: string) {
  return /^ins_(test|live)_[A-Za-z0-9_-]{43}$/.test(value);
}
export function requestHash(method: string, path: string, body: string) {
  return hashSecret(`${method.toUpperCase()} ${path}\n${body}`);
}

/** `Insight-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`. */
export function signWebhook(secret: string, timestamp: number, rawBody: string) {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${v1}`;
}
/** What a partner runs on its side; also used in the tests and the docs. Rejects signatures older than `toleranceSec`. */
export function verifyWebhook(secret: string, header: string, rawBody: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(parts["t"]);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > toleranceSec || !parts["v1"]) return false;
  const expected = Buffer.from(signWebhook(secret, t, rawBody).split("v1=")[1]!, "hex");
  const given = Buffer.from(parts["v1"], "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Webhook URLs: https on the default port, a public host name (no IP literal, no local or internal names). */
export function isSafeWebhookUrl(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:" || u.port !== "" || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost") || host === "localhost") return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[") || host.includes(":")) return false;
  return raw.length <= 500;
}

/** After `attemptsMade` failed attempts: seconds until the next try, or null when the event should be marked failed. */
export function nextAttemptDelay(attemptsMade: number): number | null {
  return attemptsMade >= 1 && attemptsMade <= WEBHOOK_BACKOFF_SECONDS.length ? WEBHOOK_BACKOFF_SECONDS[attemptsMade - 1]! : null;
}

export type PartnerError = { status: number; code: string; message: string };
export const apiError = (status: number, code: string, message: string): PartnerError => ({ status, code, message });

/** Zod issues → one readable 400 with the field paths. */
export function validationError(e: z.ZodError) {
  return { status: 400, code: "invalid_request", message: "Some fields are missing or invalid.", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
}
