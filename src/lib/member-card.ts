/**
 * "My Insight card" (founder, 27 Oct): a member card with the customer's name, Insight reference and the
 * amounts in their deals, by currency. It is NOT a balance or wallet: the money stays held by the payment
 * provider inside each deal. Wording avoids "balance" and "wallet" on purpose.
 * Pass builders prepare Apple Wallet / Google Wallet data; issuing needs the signing certificates later.
 */
export type CardDeal = { id: string; amount: number; currency: string; status: string; buyer_id: string | null; seller_id: string | null };
export type CardMilestone = { deal_id: string; amount: number; funded_at: string | null; status: string };
export type CardRelease = { deal_id: string; amount: number; currency: string; created_at: string };
export type CardTotals = { currency: string; heldForYourPurchases: number; awaitingYou: number; paidToYou12m: number };
export type MemberCard = {
  name: string; memberRef: string; verified: boolean; since: string | null;
  totals: CardTotals[]; activeDeals: number; completedDeals: number; environment: "demo";
};

const TERMINAL = new Set(["released", "completed", "refunded", "partially_refunded", "cancelled", "rejected"]);

export function memberRef(userId: string) {
  return `INS-${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

const round = (v: number, currency: string) => { const d = ["BHD", "KWD", "OMR"].includes(currency) ? 3 : 2; return Math.round(v * 10 ** d) / 10 ** d; };

/** Amount still held in a deal (deal currency). */
export function heldInDeal(d: CardDeal, milestones: CardMilestone[], funded: boolean) {
  const ms = milestones.filter((m) => m.deal_id === d.id);
  if (ms.length) return ms.filter((m) => m.funded_at && m.status !== "released" && m.status !== "refunded").reduce((a, m) => a + Number(m.amount), 0);
  return funded && !TERMINAL.has(d.status) && d.status !== "pending_funding" ? Number(d.amount) : 0;
}

export function buildCard(input: {
  userId: string; name: string; verified: boolean; since: string | null; deals: CardDeal[]; milestones: CardMilestone[];
  fundedDealIds: Set<string>; releases: CardRelease[]; now?: Date;
}): MemberCard {
  const now = input.now ?? new Date();
  const by = new Map<string, CardTotals>();
  const t = (c: string) => { if (!by.has(c)) by.set(c, { currency: c, heldForYourPurchases: 0, awaitingYou: 0, paidToYou12m: 0 }); return by.get(c)!; };
  let active = 0, completed = 0;
  for (const d of input.deals) {
    if (["released", "completed"].includes(d.status)) completed++;
    else if (!TERMINAL.has(d.status)) active++;
    const held = heldInDeal(d, input.milestones, input.fundedDealIds.has(d.id));
    if (held > 0) {
      if (d.buyer_id === input.userId) t(d.currency).heldForYourPurchases += held;
      if (d.seller_id === input.userId) t(d.currency).awaitingYou += held;
    }
  }
  const sellerDeals = new Set(input.deals.filter((d) => d.seller_id === input.userId).map((d) => d.id));
  const yearAgo = now.getTime() - 365 * 86_400_000;
  for (const r of input.releases) if (sellerDeals.has(r.deal_id) && new Date(r.created_at).getTime() >= yearAgo) t(r.currency).paidToYou12m += Number(r.amount);
  const totals = [...by.values()].map((x) => ({ ...x, heldForYourPurchases: round(x.heldForYourPurchases, x.currency), awaitingYou: round(x.awaitingYou, x.currency), paidToYou12m: round(x.paidToYou12m, x.currency) }))
    .filter((x) => x.heldForYourPurchases || x.awaitingYou || x.paidToYou12m);
  return { name: input.name, memberRef: memberRef(input.userId), verified: input.verified, since: input.since, totals, activeDeals: active, completedDeals: completed, environment: "demo" };
}

const fmt = (v: number, c: string) => `${c} ${v.toLocaleString("en-GB", { minimumFractionDigits: ["BHD", "KWD", "OMR"].includes(c) ? 3 : 2, maximumFractionDigits: ["BHD", "KWD", "OMR"].includes(c) ? 3 : 2 })}`;

/** Apple Wallet pass.json (generic pass). Not signed or issued until the Pass Type ID certificate exists. */
export function applePassJson(card: MemberCard, opts: { passTypeIdentifier: string; teamIdentifier: string; url: string }) {
  const main = card.totals[0];
  return {
    formatVersion: 1,
    passTypeIdentifier: opts.passTypeIdentifier,
    teamIdentifier: opts.teamIdentifier,
    serialNumber: card.memberRef,
    organizationName: "Insight",
    description: "Insight member card",
    logoText: "Insight",
    foregroundColor: "rgb(255,255,255)",
    backgroundColor: "rgb(19,128,101)",
    labelColor: "rgb(214,240,230)",
    generic: {
      primaryFields: [{ key: "name", label: "MEMBER", value: card.name }],
      secondaryFields: [{ key: "ref", label: "INSIGHT REF", value: card.memberRef }, { key: "active", label: "ACTIVE DEALS", value: card.activeDeals }],
      auxiliaryFields: main ? [
        { key: "held", label: "HELD IN YOUR PURCHASES", value: fmt(main.heldForYourPurchases, main.currency) },
        { key: "awaiting", label: "AWAITING YOU", value: fmt(main.awaitingYou, main.currency), changeMessage: "Awaiting you: %@" },
      ] : [],
      backFields: [
        { key: "note", label: "About these amounts", value: "Amounts in your deals, held by the payment provider until each deal's conditions are met. This is not a balance or stored value with Insight." },
        ...card.totals.map((x) => ({ key: `t-${x.currency}`, label: x.currency, value: `Held for your purchases ${fmt(x.heldForYourPurchases, x.currency)} · Awaiting you ${fmt(x.awaitingYou, x.currency)} · Paid to you (12 months) ${fmt(x.paidToYou12m, x.currency)}` })),
      ],
    },
    barcodes: [{ format: "PKBarcodeFormatQR", message: opts.url, messageEncoding: "iso-8859-1", altText: card.memberRef }],
  };
}

/** Google Wallet generic object (needs an issuer ID and a signed JWT to save; prepared only). */
export function googleWalletObject(card: MemberCard, opts: { issuerId: string; classSuffix: string; url: string }) {
  const main = card.totals[0];
  return {
    id: `${opts.issuerId}.${card.memberRef}`,
    classId: `${opts.issuerId}.${opts.classSuffix}`,
    state: "ACTIVE",
    hexBackgroundColor: "#138065",
    cardTitle: { defaultValue: { language: "en", value: "Insight" } },
    header: { defaultValue: { language: "en", value: card.name } },
    subheader: { defaultValue: { language: "en", value: card.memberRef } },
    textModulesData: main ? [
      { id: "held", header: "Held for your purchases", body: fmt(main.heldForYourPurchases, main.currency) },
      { id: "awaiting", header: "Awaiting you", body: fmt(main.awaitingYou, main.currency) },
    ] : [],
    barcode: { type: "QR_CODE", value: opts.url, alternateText: card.memberRef },
  };
}
