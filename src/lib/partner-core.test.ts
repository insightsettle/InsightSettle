import { describe, expect, it } from "vitest";
import {
  createDealSchema, hashSecret, isSafeWebhookUrl, looksLikeApiKey, newApiKey, newWebhookSecret, nextAttemptDelay,
  requestHash, signWebhook, toTypedDealInput, verifyWebhook, WEBHOOK_BACKOFF_SECONDS,
} from "./partner-core.server";

describe("partner API keys", () => {
  it("creates test keys that match the format and hash to a stable value", () => {
    const k = newApiKey("test");
    expect(k.key.startsWith("ins_test_")).toBe(true);
    expect(looksLikeApiKey(k.key)).toBe(true);
    expect(k.prefix).toBe(k.key.slice(0, 16));
    expect(k.hash).toBe(hashSecret(k.key));
    expect(k.hash).not.toContain(k.key);
    expect(looksLikeApiKey("ins_test_short")).toBe(false);
    expect(newApiKey().key).not.toBe(newApiKey().key);
  });
});

describe("webhook signatures", () => {
  it("verifies a signature made with the same secret and body", () => {
    const secret = newWebhookSecret();
    const body = JSON.stringify({ id: "e1", type: "deal.funded" });
    const header = signWebhook(secret, 1_800_000_000, body);
    expect(verifyWebhook(secret, header, body, 1_800_000_010)).toBe(true);
  });
  it("rejects a changed body, another secret or an old timestamp", () => {
    const secret = newWebhookSecret();
    const header = signWebhook(secret, 1_800_000_000, "{}");
    expect(verifyWebhook(secret, header, '{"x":1}', 1_800_000_000)).toBe(false);
    expect(verifyWebhook(newWebhookSecret(), header, "{}", 1_800_000_000)).toBe(false);
    expect(verifyWebhook(secret, header, "{}", 1_800_000_000 + 301)).toBe(false);
    expect(verifyWebhook(secret, "garbage", "{}", 1_800_000_000)).toBe(false);
  });
});

describe("webhook URLs", () => {
  it("accepts public https hosts only", () => {
    expect(isSafeWebhookUrl("https://shop.example.com/insight/webhooks")).toBe(true);
    for (const bad of ["http://shop.example.com/x", "https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://[::1]/x",
      "https://shop.example.com:8443/x", "https://user:pw@shop.example.com/x", "https://intranet/x", "https://api.internal/x", "not a url"])
      expect(isSafeWebhookUrl(bad)).toBe(false);
  });
});

describe("retry schedule", () => {
  it("backs off 1 min, 5 min, 30 min, 2 h, 6 h, 24 h, then gives up", () => {
    expect([1, 2, 3, 4, 5, 6].map(nextAttemptDelay)).toEqual([...WEBHOOK_BACKOFF_SECONDS]);
    expect(nextAttemptDelay(7)).toBeNull();
    expect(nextAttemptDelay(0)).toBeNull();
  });
});

describe("create deal request", () => {
  const base = { reference: "ORDER-1001", title: "12 office chairs", amount: 1850, buyer: { email: "Buyer@Example.com" } };
  it("fills safe defaults and maps onto the web app's deal input with the partner as seller", () => {
    const input = createDealSchema.parse(base);
    expect(input).toMatchObject({ type: "goods", currency: "BHD", fee_payer: "buyer", inspection_days: 3, buyer: { email: "buyer@example.com" } });
    const typed = toTypedDealInput(input, "BH");
    expect(typed).toMatchObject({ dealType: "goods", role: "seller", counterpartyEmail: "buyer@example.com", supplierCountry: "BH", shippingRequired: true, shippingResponsibility: "seller", fundingMode: "upfront", milestones: [] });
  });
  it("keeps milestones for contracting and drops them for goods", () => {
    const contracting = toTypedDealInput(createDealSchema.parse({ ...base, type: "contracting", amount: 1000, funding_mode: "per_milestone", retention_percent: 5,
      milestones: [{ title: "Advance", amount: 200, kind: "advance" }, { title: "Handover", amount: 800 }] }), null);
    expect(contracting.milestones).toHaveLength(2);
    expect(contracting).toMatchObject({ fundingMode: "per_milestone", retentionPercent: 5, shippingRequired: false, shippingResponsibility: "none" });
    expect(toTypedDealInput(createDealSchema.parse({ ...base, milestones: [{ title: "x", amount: 1 }] }), null).milestones).toEqual([]);
  });
  it("refuses http return URLs, oversized metadata and a missing buyer", () => {
    expect(createDealSchema.safeParse({ ...base, return_url: "http://shop.example.com/done" }).success).toBe(false);
    expect(createDealSchema.safeParse({ ...base, metadata: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, i])) }).success).toBe(false);
    const { buyer: _omit, ...noBuyer } = base;
    expect(createDealSchema.safeParse(noBuyer).success).toBe(false);
  });
  it("hashes requests so a reused Idempotency-Key with another body is detected", () => {
    expect(requestHash("POST", "/deals", "{}")).toBe(requestHash("post", "/deals", "{}"));
    expect(requestHash("POST", "/deals", "{}")).not.toBe(requestHash("POST", "/deals", '{"a":1}'));
  });
});
