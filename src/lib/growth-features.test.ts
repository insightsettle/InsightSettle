import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dealLinkSchema, linkState, newLinkCode, shareText, whatsappShareUrl } from "./deal-links";
import { DEAL_TEMPLATES, templateMilestoneAmounts } from "./deal-templates";
import { validateMilestones } from "./milestones";
import { cloudApiPayload, normalizeGulfPhone, renderDealUpdate, whatsappConfig } from "./whatsapp";
import { applePassJson, buildCard, googleWalletObject, memberRef } from "./member-card";
import { isSafeReturnTo } from "./return-to";

describe("deal links", () => {
  it("codes are short, unguessable and readable", () => {
    const seen = new Set(Array.from({ length: 500 }, () => newLinkCode()));
    expect(seen.size).toBe(500);
    for (const c of seen) expect(c).toMatch(/^[a-hj-km-np-z2-9]{10}$/);
  });
  it("state: paused, expired, sold out, open", () => {
    const base = { active: true, expires_at: null, max_uses: null, uses: 0 };
    expect(linkState(base)).toBe("open");
    expect(linkState({ ...base, active: false })).toBe("paused");
    expect(linkState({ ...base, expires_at: "2000-01-01T00:00:00Z" })).toBe("expired");
    expect(linkState({ ...base, max_uses: 2, uses: 2 })).toBe("sold_out");
  });
  it("validates input and never allows contracting links (milestones need a full deal)", () => {
    expect(dealLinkSchema.parse({ dealType: "goods", title: "iPhone 15", amount: 3200, currency: "SAR" }).inspectionDays).toBe(3);
    expect(() => dealLinkSchema.parse({ dealType: "contracting", title: "Fit-out", amount: 1, currency: "SAR" })).toThrow();
    expect(() => dealLinkSchema.parse({ dealType: "goods", title: "x", amount: 1, currency: "SAR" })).toThrow();
  });
  it("share text names Insight but never a payment provider", () => {
    const t = shareText("ar", "آيفون", "SAR 3,200.00", "https://insightsettle.com/d/abc");
    expect(t).toContain("إنسايت");
    expect(t).not.toMatch(/lite|tap|geidea|afs|مزوّد/i);
    expect(whatsappShareUrl("a b")).toBe("https://wa.me/?text=a%20b");
  });
  it("sign-in return path only accepts deal links and invitations", () => {
    expect(isSafeReturnTo("/d/abcdefghjk?start=1")).toBe(true);
    expect(isSafeReturnTo("/invite/Ab12_cd34ef")).toBe(true);
    for (const bad of ["https://evil.com", "//evil.com", "/console", "/d/abc", "/d/abcdefghjk?next=x", "javascript:alert(1)"]) expect(isSafeReturnTo(bad)).toBe(false);
  });
  it("migration keeps deal_links and the WhatsApp log server-only", () => {
    const sql = readFileSync(new URL("../../drizzle/migrations/0034_deal_links_whatsapp.sql", import.meta.url), "utf8");
    expect(sql).toMatch(/REVOKE ALL ON public\.deal_links FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/REVOKE ALL ON public\.whatsapp_outbox FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/whatsapp_opt_in boolean NOT NULL DEFAULT false/);
  });
});

describe("deal templates", () => {
  it("every template has Arabic and English text and valid milestone percentages", () => {
    for (const t of DEAL_TEMPLATES) {
      for (const k of ["label", "hint", "title", "description", "acceptance", "refund"] as const) { expect(t[k][0].length).toBeGreaterThan(2); expect(t[k][1]).toMatch(/[؀-ۿ]/); }
      if (t.milestones) expect(t.milestones.reduce((a, m) => a + m.pct, 0)).toBe(100);
    }
  });
  it("milestone amounts always add up to the total, in each currency's decimals", () => {
    expect(templateMilestoneAmounts(100000, [20, 40, 40], "SAR")).toEqual(["20000.00", "40000.00", "40000.00"]);
    const odd = templateMilestoneAmounts(1000.001, [30, 50, 20], "BHD");
    expect(odd.reduce((a, v) => a + Number(v), 0)).toBeCloseTo(1000.001, 3);
    expect(templateMilestoneAmounts(0, [50, 50], "SAR")).toEqual(["", ""]);
  });
  it("the contracting template produces a plan the deal rules accept", () => {
    const t = DEAL_TEMPLATES.find((x) => x.type === "contracting")!;
    const amounts = templateMilestoneAmounts(100000, t.milestones!.map((m) => m.pct), "SAR");
    const plan = t.milestones!.map((m, i) => ({ title: m.title[0], amount: Number(amounts[i]), kind: m.kind }));
    expect(validateMilestones(100000, "SAR", plan, "contracting")).toBeNull();
  });
});

describe("WhatsApp updates", () => {
  it("normalises Gulf mobile numbers and rejects others", () => {
    expect(normalizeGulfPhone("0551234567")).toBe("966551234567");
    expect(normalizeGulfPhone("+966 55 123 4567")).toBe("966551234567");
    expect(normalizeGulfPhone("36123456")).toBe("97336123456");
    expect(normalizeGulfPhone("00971501234567")).toBe("971501234567");
    expect(normalizeGulfPhone("12345")).toBeNull();
    expect(normalizeGulfPhone(null)).toBeNull();
  });
  it("is off unless explicitly enabled with credentials", () => {
    expect(whatsappConfig({}).enabled).toBe(false);
    expect(whatsappConfig({ WHATSAPP_ENABLED: "true" }).enabled).toBe(false);
    expect(whatsappConfig({ WHATSAPP_ENABLED: "true", WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1" }).enabled).toBe(true);
  });
  it("builds a Cloud API template message with three parameters", () => {
    const m = renderDealUpdate({ titleAr: "دفع المشتري", titleEn: "The buyer paid", dealRef: "DL-1", url: "https://insightsettle.com/deals/DL-1" });
    expect(m.params).toEqual(["دفع المشتري", "DL-1", "https://insightsettle.com/deals/DL-1"]);
    const p = cloudApiPayload("966551234567", whatsappConfig({ WHATSAPP_ENABLED: "true", WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1" }), m.params);
    expect(p).toMatchObject({ messaging_product: "whatsapp", to: "966551234567", type: "template", template: { name: "insight_deal_update", language: { code: "ar" } } });
    expect(p.template.components[0]!.parameters).toHaveLength(3);
  });
});

describe("member card", () => {
  const me = "11111111-2222-3333-4444-555555555555", other = "99999999-2222-3333-4444-555555555555";
  const deals = [
    { id: "a", amount: 1000, currency: "BHD", status: "in_progress", buyer_id: me, seller_id: other },
    { id: "b", amount: 500, currency: "SAR", status: "delivered", buyer_id: other, seller_id: me },
    { id: "c", amount: 300, currency: "SAR", status: "released", buyer_id: other, seller_id: me },
    { id: "d", amount: 900, currency: "SAR", status: "pending_funding", buyer_id: me, seller_id: other },
    { id: "e", amount: 10000, currency: "SAR", status: "in_progress", buyer_id: other, seller_id: me },
  ];
  const milestones = [
    { deal_id: "e", amount: 4000, funded_at: "2026-10-01", status: "released" },
    { deal_id: "e", amount: 6000, funded_at: "2026-10-02", status: "funded" },
  ];
  const card = buildCard({ userId: me, name: "Test", verified: true, since: null, deals, milestones, fundedDealIds: new Set(["a", "b", "c", "e"]),
    releases: [{ deal_id: "c", amount: 292.5, currency: "SAR", created_at: new Date().toISOString() }, { deal_id: "c", amount: 1, currency: "SAR", created_at: "2020-01-01" }] });
  it("adds amounts per currency, never mixing currencies", () => {
    expect(card.totals.find((t) => t.currency === "BHD")).toEqual({ currency: "BHD", heldForYourPurchases: 1000, awaitingYou: 0, paidToYou12m: 0 });
    expect(card.totals.find((t) => t.currency === "SAR")).toEqual({ currency: "SAR", heldForYourPurchases: 0, awaitingYou: 6500, paidToYou12m: 292.5 });
    expect(card.activeDeals).toBe(4);
    expect(card.completedDeals).toBe(1);
    expect(memberRef(me)).toBe("INS-11111111");
  });
  it("wallet passes say it is not a balance and never name a payment provider", () => {
    const apple = JSON.stringify(applePassJson(card, { passTypeIdentifier: "pass.test", teamIdentifier: "TEAM", url: "https://insightsettle.com/dashboard" }));
    const google = JSON.stringify(googleWalletObject(card, { issuerId: "1", classSuffix: "member", url: "https://insightsettle.com/dashboard" }));
    expect(apple).toContain("not a balance");
    for (const s of [apple, google]) { expect(s).not.toMatch(/\b(lite|tap|geidea|afs)\b/i); }
  });
});
