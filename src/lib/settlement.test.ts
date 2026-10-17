import { describe, expect, it } from "vitest";
import { settleTransactionCore } from "./settlement.server";
import { ledgerBalance, payInQuote, splitFee } from "./fees";
import { roundMoney } from "./money";

// In-memory Data API substitute: exercise the real confirmation and ledger writer.
function database(tables: Record<string, any[]>) {
  return { from(table: string) {
    const filters: ((r: any) => boolean)[] = [];
    let patch: any;
    let inserted: any;
    const q: any = {
      select() { return q; }, order() { return q; }, limit() { return q; },
      eq(k: string, v: any) { filters.push(r => r[k] === v); return q; },
      is(k: string, v: any) { filters.push(r => (r[k] ?? null) === v); return q; },
      in(k: string, v: any[]) { filters.push(r => v.includes(r[k])); return q; },
      update(v: any) { patch = v; return q; },
      insert(v: any) { inserted = Array.isArray(v) ? v : [v]; return q; },
      async maybeSingle() { const r = await q; return { data: r.data[0] ?? null }; },
      async single() { return q.maybeSingle(); },
      then(resolve: any) {
        const rows = (tables[table] ?? []).filter(r => filters.every(f => f(r)));
        if (patch) rows.forEach(r => Object.assign(r, patch));
        if (inserted) (tables[table] ??= []).push(...inserted);
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return q;
  } };
}

describe("C09-D15 actual confirmation path", () => {
  for (const currency of ["BHD", "SAR"]) {
    for (const legacyGross of [true, false]) {
      it(`${currency} 70/30: ${legacyGross ? "legacy gross" : "net"} release stays partial after confirmation`, async () => {
        const amount = currency === "BHD" ? 1000 : 10000;
        const b = splitFee({ amount, currency, fee: currency === "BHD" ? 27.82 : 250, feePayer: "split", buyerCountry: "SA", supplierCountry: currency === "BHD" ? "BH" : "SA" });
        const net = currency === "BHD" ? 689.289 : 6899.37;
        const tables: Record<string, any[]> = {
          deals: [{ id: "deal", ref: "DL-test", status: "partially_refunded" }],
          disputes: [{ id: "abcdef12-full-id", deal_id: "deal", status: "resolved", buyer_percent: 30, outcome: "partial_settlement" }],
          fx_quotes: [{ id: "quote", breakdown: { breakdown: b, payIn: payInQuote(b, currency, 1, 1) } }],
          deal_transactions: [
            { id: "fund", deal_id: "deal", kind: "funding", status: "succeeded", fx_quote_id: "quote" },
            { id: "release", deal_id: "deal", kind: "release", status: "processing", amount: legacyGross ? amount * 0.7 : net, currency, release_part: legacyGross ? null : "dispute", idempotency_key: "DL-test-RELEASE-abcdef12" },
            { id: "refund", deal_id: "deal", kind: "refund", status: "processing", amount: amount * 0.3, currency },
          ],
          ledger_entries: [
            { account: "escrow_held", debit: 0, credit: amount, currency },
            { account: "provider_conversion", debit: amount, credit: 0, currency },
          ],
        };
        const db = database(tables);
        const notify = { notifyDealParties: async () => {} };
        // Refund first reproduces the original double-debit defect.
        for (const transactionId of ["refund", "release", "release"])
          await settleTransactionCore(db, notify, { transactionId, outcome: "succeeded", actorId: "staff" });
        const release = tables["deal_transactions"]?.find(r => r.id === "release");
        expect(release.amount).toBe(net);
        expect(release.fee).toBe(currency === "BHD" ? 9.737 : 87.5);
        expect(tables["deals"]?.[0].status).toBe("partially_refunded");
        const rows = tables["ledger_entries"] ?? [];
        expect(ledgerBalance(rows)).toEqual({ [currency]: 0 });
        expect(roundMoney(rows.filter(r => r.account === "escrow_held").reduce((s, r) => s + r.credit - r.debit, 0), currency)).toBe(0);
        expect(rows.filter(r => r.account === "escrow_held" && r.debit > 0).map(r => r.debit)).toEqual([amount * 0.3, amount * 0.7]);
      });
    }
  }
});