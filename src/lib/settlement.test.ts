import { describe, expect, it } from "vitest";
import { settleTransactionCore } from "./settlement.server";
import { ledgerBalance, payInQuote, splitFee } from "./fees";
import { priceDeal } from './pricing.server';
import { auctionReleaseAmounts } from './auction-settlement.server';
import { roundMoney } from "./money";
import { settleMilestoneTx } from "./milestones.server";

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
      upsert(v: any) { inserted = [v]; return q; },
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
  it("settles milestone 3 only and leaves its BHD 15.000 retention protected", async () => {
    const milestones = [100, 400, 300, 200].map((amount, i) => ({ id: `m${i + 1}`, deal_id: "deal", amount, status: "funded" }));
    const others = JSON.parse(JSON.stringify(milestones.filter(m => m.id !== "m3")));
    Object.assign(milestones[2] ?? {}, { status: "disputed", net_released: 191.787, retention_amount: 15, fee_share: 2.921, vat: 0.292 });
    const tables: Record<string, any[]> = {
      deals: [{ id: "deal", status: "in_progress" }], deal_milestones: milestones,
      ledger_entries: [
        { account: "provider_conversion", debit: 300, credit: 0, currency: "BHD" },
        { account: "escrow_held", debit: 0, credit: 300, currency: "BHD" },
      ],
    };
    const db = database(tables);
    await settleMilestoneTx(db, { id: "refund", deal_id: "deal", milestone_id: "m3", kind: "refund", amount: 90, currency: "BHD" }, "ref");
    await settleMilestoneTx(db, { id: "release", deal_id: "deal", milestone_id: "m3", kind: "release", amount: 191.787, currency: "BHD" }, "ref");
    expect(milestones.filter(m => m.id !== "m3")).toEqual(others);
    expect(tables["deal_milestones"]?.[2].retention_amount).toBe(15);
    const rows = tables["ledger_entries"] ?? [];
    expect(ledgerBalance(rows)).toEqual({ BHD: 0 });
    expect(roundMoney(rows.filter(r => r.account === "escrow_held").reduce((s, r) => s + r.credit - r.debit, 0), "BHD")).toBe(0);
    expect(rows.find(r => r.account === "escrow_retention")?.credit).toBe(15);
  });
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

describe('T22 auction real confirmation path', () => {
  async function fixture(amount = 48000, buyerPercent = 0, payCurrency: string | null = 'SAR') {
    const schedule = [
      {amount_from:0,amount_to:1500,percent:3}, {amount_from:1500,amount_to:6000,percent:2.5},
      {amount_from:6000,amount_to:250000,percent:1}, {amount_from:250000,amount_to:null,percent:0.5},
    ].map(r => ({...r,currency:'USD',min_fee:15,max_fee:3500}));
    const tables: Record<string,any[]> = {
      auction_fee_settings:[{id:true,mode:'standard',percent:0,min_usd:0,max_usd:null,fixed_usd:0,default_commission:15,max_commission:100}],
      deals:[{id:'deal',ref:'DL-T22',deal_type:'auction',auction_lot_id:'lot',amount,currency:'SAR',fee_payer:'split',buyer_id:'winner',seller_id:'owner',status:buyerPercent ? 'disputed' : 'held'}],
      profiles:[{id:'winner',country:'KW'},{id:'owner',country:'SA'}],
      fee_rules:schedule, vat_rates:[{country_code:'KW',rate:0},{country_code:'SA',rate:0.15}],
      fx_rates:[{code:'USD',provider_rate:3.75,spread:0,active:true},{code:'KWD',provider_rate:12.09375,spread:0.01,active:true}],
      auction_lots:[{id:'lot',split_locked_at:'2026-10-17'}],
      deal_payout_splits:[{id:'owner-split',deal_id:'deal',role:'owner',pct:85,beneficiary_id:'owner',release_tx_id:'owner-release'},
        {id:'org-split',deal_id:'deal',role:'organiser',pct:15,beneficiary_id:'organiser',release_tx_id:'org-release'}],
      deal_transactions:[{id:'fund',deal_id:'deal',kind:'funding',status:'processing',amount:0,currency:'SAR',fx_quote_id:'quote'}],
    };
    const db=database(tables); const pricing=await priceDeal(db,tables['deals']?.[0],payCurrency);
    tables['fx_quotes']=[{id:'quote',breakdown:pricing}];
    const fund=tables['deal_transactions']?.[0]; fund.amount=pricing.payIn.total;
    const notify={notifyDealParties:async()=>{}};
    await settleTransactionCore(db,notify,{transactionId:'fund',outcome:'succeeded',actorId:null});
    const gross=roundMoney(amount*(100-buyerPercent)/100,'SAR');
    const legs=auctionReleaseAmounts(gross,'SAR',85,15);
    if (buyerPercent) {
      tables['deals']?.forEach(d=>{d.status='disputed';});
      tables['disputes']=[{id:'decision',deal_id:'deal',status:'resolved',outcome:'partial_settlement',buyer_percent:buyerPercent}];
      tables['deal_transactions']?.push({id:'refund',deal_id:'deal',kind:'refund',status:'processing',amount:amount-gross,fee:0,currency:'SAR',auction_dispute_id:'decision'});
    }
    for (const [id,split,amount] of [['owner-release','owner-split',legs.owner],['org-release','org-split',legs.organiser]])
      tables['deal_transactions']?.push({id,deal_id:'deal',kind:'release',status:'processing',amount,fee:0,currency:'SAR',payout_split_id:split,
        auction_dispute_id:buyerPercent ? 'decision' : null,idempotency_key:`DL-T22-RELEASE-${split==='owner-split'?'OWNER':'ORG'}`});
    return {db,tables,pricing,notify};
  }
  it('T22-a: SAR 48,000, KW winner, 85/15 direct legs, held zero and duplicate safe', async()=>{
    const {db,tables,pricing,notify}=await fixture();
    expect(pricing.breakdown.fee).toBe(845.63);
    expect(pricing.breakdown.feePayer).toBe('buyer');
    expect(pricing.breakdown.buyerVat).toBe(0);
    expect(pricing.breakdown.sellerVat).toBe(0);
    expect(tables['tax_invoices']?.[0].fee).toBe(845.63);
    await settleTransactionCore(db,notify,{transactionId:'owner-release',outcome:'succeeded',actorId:null});
    expect(tables['deals']?.[0].status).toBe('held');
    expect(tables['ledger_entries']?.find(r=>r.account==='owner_payable').credit).toBe(40800);
    await settleTransactionCore(db,notify,{transactionId:'org-release',outcome:'succeeded',actorId:null});
    expect(tables['deals']?.[0].status).toBe('released');
    expect(tables['ledger_entries']?.find(r=>r.account==='organiser_payable').credit).toBe(7200);
    const before=JSON.stringify(tables);
    for (const transactionId of ['fund','owner-release','org-release']) await settleTransactionCore(db,notify,{transactionId,outcome:'succeeded',actorId:null});
    expect(JSON.stringify(tables)).toBe(before);
    const rows=tables['ledger_entries']??[];
    expect(ledgerBalance(rows)).toEqual({SAR:0});
    expect(rows.filter(r=>r.account==='escrow_held').reduce((s,r)=>s+r.credit-r.debit,0)).toBe(0);
    expect(rows.filter(r=>r.account==='insight_fee_revenue').reduce((s,r)=>s+r.credit,0)).toBe(845.63);
  });
  it('T22-e: 70% buyer refund, 30% released across locked shares',async()=>{
    const {db,tables,notify}=await fixture(48000,70);
    for (const transactionId of ['refund','owner-release','org-release','owner-release'])
      await settleTransactionCore(db,notify,{transactionId,outcome:'succeeded',actorId:null});
    expect(tables['deal_transactions']?.find(t=>t.id==='refund').amount).toBe(33600);
    expect(tables['deal_transactions']?.find(t=>t.id==='owner-release').amount).toBe(12240);
    expect(tables['deal_transactions']?.find(t=>t.id==='org-release').amount).toBe(2160);
    expect(tables['deals']?.[0].status).toBe('partially_refunded');
    const rows=tables['ledger_entries']??[];
    expect(ledgerBalance(rows)).toEqual({SAR:0});
    expect(rows.filter(r=>r.account==='escrow_held').reduce((s,r)=>s+r.credit-r.debit,0)).toBe(0);
  });
  it('C09-D19: a Kuwait winner pays in KWD by default; fee invoiced in KWD at the provider rate; ledger balanced per currency',async()=>{
    const {db,tables,pricing,notify}=await fixture(48000,0,null);
    expect(pricing.payIn.payCurrency).toBe('KWD');
    expect(pricing.breakdown.fee).toBe(845.63);
    expect(tables['tax_invoices']?.[0].fee).toBe(pricing.payIn.insightFee);
    expect(pricing.payIn.insightFee).toBeCloseTo(845.63/12.09375,3);
    for (const transactionId of ['owner-release','org-release']) await settleTransactionCore(db,notify,{transactionId,outcome:'succeeded',actorId:null});
    expect(tables['deals']?.[0].status).toBe('released');
    const rows=tables['ledger_entries']??[];
    expect(ledgerBalance(rows)).toEqual({KWD:0,SAR:0});
    expect(rows.filter(r=>r.account==='escrow_held').reduce((s,r)=>s+r.credit-r.debit,0)).toBe(0);
  });
  it('T22-f: SAR 36,500 hammer price uses existing USD tiers, fee 730.63',async()=>{
    const {pricing}=await fixture(36500);
    expect(pricing.breakdown.fee).toBe(730.63);
    expect(pricing.breakdown.buyerVat).toBe(0);
  });
  it('assigns the 3-decimal rounding remainder to the owner',()=>{
    expect(auctionReleaseAmounts(1000.001,'BHD',85,15)).toEqual({owner:850.001,organiser:150});
  });
  it('does not mark the deal released when one provider leg fails',async()=>{
    const {db,tables,notify}=await fixture();
    await settleTransactionCore(db,notify,{transactionId:'owner-release',outcome:'succeeded',actorId:null});
    await settleTransactionCore(db,notify,{transactionId:'org-release',outcome:'failed',reason:'Provider refused',actorId:null});
    expect(tables['deals']?.[0].status).toBe('held');
    expect(tables['ledger_entries']?.filter(r=>r.account==='escrow_held').reduce((s,r)=>s+r.credit-r.debit,0)).toBe(7200);
  });
  it('preserves I-33 final dispute outcome while independently confirming legs',async()=>{
    const {db,tables,notify}=await fixture(48000,70);
    tables['deals']?.forEach(d=>{d.status='partially_refunded';});
    for (const transactionId of ['owner-release','org-release','refund']) await settleTransactionCore(db,notify,{transactionId,outcome:'succeeded',actorId:null});
    expect(tables['deals']?.[0].status).toBe('partially_refunded');
    expect(ledgerBalance(tables['ledger_entries']??[])).toEqual({SAR:0});
  });
});