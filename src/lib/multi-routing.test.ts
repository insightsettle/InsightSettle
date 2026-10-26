import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkMethod, PAYMENT_METHODS } from '@/lib/payment-methods';
import { resolveRoute, rowCost, SEED_PRICE_BOOK, SEED_ROUTING, holdingDaysFor, effectiveConfig, type RouteInput, type RoutingTable } from './finance/price-book';

const sa = (method: RouteInput['method'], amountSar: number, holdingDays = 7, dealType: RouteInput['dealType'] = 'goods'): RouteInput =>
  ({ dealType, payerCountry: 'SA', payInCurrency: 'SAR', method, payeeCountry: 'SA', payoutCurrency: 'SAR', amountSar, holdingDays });
const route = (i: RouteInput) => resolveRoute(SEED_PRICE_BOOK, SEED_ROUTING, i);
const fee = (amountSar: number, method: string) => method === 'bank_transfer' ? Math.min(amountSar * 0.025, 3500 * 3.75) : amountSar * 0.025;
const margin = (i: RouteInput) => { const r = route(i); return checkMethod(i.method as any, i.amountSar, fee(i.amountSar, i.method), r.provider ? r.costSar : null); };

describe('founder test cases', () => {
  it('SAR 2,000 mada SA→SA → lite, cost 17, margin 1.65%', () => {
    expect(route(sa('mada', 2000))).toMatchObject({ provider: 'lite', ruleId: 'R1', costSar: 17 });
    expect(margin(sa('mada', 2000))).toMatchObject({ allowed: true }); expect(margin(sa('mada', 2000)).margin).toBeCloseTo(0.0165, 6);
  });
  it('SAR 20,000 credit card → cheapest is lite 2.25% (450); margin 0.25% fails the 0.5% rule', () => {
    expect(route(sa('credit_card', 20000))).toMatchObject({ provider: 'lite', ruleId: 'R2', costSar: 450 });
    const m = margin(sa('credit_card', 20000)); expect(m.allowed).toBe(false); expect(m.margin).toBeCloseTo(0.0025, 6);
  });
  it('SAR 550,000 bank transfer → lite wallet 0%, fee capped at SAR 13,125', () => {
    expect(route(sa('bank_transfer', 550000))).toMatchObject({ provider: 'lite', costSar: 0 });
    expect(margin(sa('bank_transfer', 550000)).margin).toBeCloseTo(13125 / 550000, 6);
  });
  it('SAR 20,000 mada with 30 holding days does NOT route to lite', () => {
    const r = route(sa('mada', 20000, 30));
    expect(r.provider).not.toBe('lite'); expect(r.provider).toBe('manual');
    expect(r.rejected.find(x => x.provider === 'lite')?.reasons).toContain('holding_days_exceed_provider_max');
  });
  it('BHD 55,000 bank transfer BH→SA → AFS rejected (awaiting quote, cannot pay out to SA) → simulated fallback', () => {
    const r = route({ dealType: 'goods', payerCountry: 'BH', payInCurrency: 'BHD', method: 'bank_transfer', payeeCountry: 'SA', payoutCurrency: 'BHD', amountSar: 55000 * 9.95, holdingDays: 7 });
    expect(r.provider).toBe('manual');
    expect(r.rejected.find(x => x.provider === 'afs')?.reasons).toEqual(expect.arrayContaining(['awaiting_quote', 'payout_corridor_not_supported']));
  });
  it('SAR 100,000 contracting with 12-month retention cannot use lite mada', () => {
    const hold = holdingDaysFor({ inspection_days: 7, retention_percent: 5, defects_liability_days: 365 });
    expect(hold).toBe(372);
    expect(route(sa('mada', 100000, hold, 'contracting')).provider).toBe('manual');
  });
});

describe('routing rules', () => {
  it('lite mada cap SAR 200 applies', () => {
    const row = SEED_PRICE_BOOK.find(r => r.provider === 'lite' && r.method === 'mada')!;
    expect(rowCost(row, 100000)).toBe(200); expect(rowCost(row, 10000)).toBe(85);
  });
  it('cheapest eligible uses the cap: at SAR 100,000 lite mada (200) beats Geidea (900)', () => {
    const t: RoutingTable = { version: 't', rules: [{ id: 'C', priority: 1, enabled: true, action: { strategy: 'cheapest' } }] };
    expect(resolveRoute(SEED_PRICE_BOOK, t, sa('mada', 100000))).toMatchObject({ provider: 'lite', costSar: 200 });
    expect(resolveRoute(SEED_PRICE_BOOK, t, sa('mada', 100000, 30))).toMatchObject({ provider: 'geidea', costSar: 900 });
  });
  it('pay-in and payout must be the same provider; never split → no route', () => {
    const t: RoutingTable = { version: 't', rules: [{ id: 'C', priority: 1, enabled: true, action: { strategy: 'cheapest' } }] };
    // SA payer pays in SAR (lite/geidea/tap can collect) but payee is in BH (none of them pays out there).
    const r = resolveRoute(SEED_PRICE_BOOK, t, { ...sa('mada', 5000), payeeCountry: 'BH', payoutCurrency: 'SAR' });
    expect(r.provider).toBeNull(); expect(r.reasons).toEqual(['no_route']);
    expect(r.rejected.filter(x => ['lite', 'geidea', 'tap'].includes(x.provider)).every(x => x.reasons.includes('payout_corridor_not_supported'))).toBe(true);
  });
  it('a funded deal keeps its provider after a rule change', () => {
    const changed: RoutingTable = { version: 'v2', rules: [{ id: 'X', priority: 1, enabled: true, action: { provider: 'geidea' } }] };
    const r = resolveRoute(SEED_PRICE_BOOK, changed, sa('mada', 2000), { provider: 'lite', version: 'seed-1/R1' });
    expect(r).toMatchObject({ provider: 'lite', version: 'seed-1/R1', reasons: ['locked_on_funded_deal'] });
  });
  it('only approved proposals change the effective configuration', () => {
    const row = { ...SEED_PRICE_BOOK[0]!, percent: 0.5 };
    const recs = [{ id: 'p1', kind: 'price_book_proposal', subject_id: 'x', payload: { row }, created_at: '1' }];
    expect(effectiveConfig(recs).book.find(r => r.provider === 'lite' && r.method === 'mada')!.percent).toBe(0.85);
    expect(effectiveConfig([...recs, { id: 'a1', kind: 'approval', subject_id: 'p1', payload: {}, created_at: '2' }]).book.find(r => r.provider === 'lite' && r.method === 'mada')!.percent).toBe(0.5);
  });
});

describe('routing_mode=simulated_only keeps today', () => {
  it('checkMethod without a routed cost equals the previous PROVIDER_COST behaviour', () => {
    for (const m of PAYMENT_METHODS) for (const a of [1000, 20000, 60000, 550000]) {
      const prev = checkMethod(m, a, fee(a, m));
      const costOld = m === 'bank_transfer' ? 10 : m === 'mada' ? a * 0.0175 + 1 : a * 0.0275 + 1;
      expect(prev.margin).toBeCloseTo((fee(a, m) - costOld) / a, 9);
    }
  });
  it('no route → method not offered, with the existing reason text', () => {
    expect(checkMethod('mada', 2000, 50, null)).toMatchObject({ allowed: false, reason: ['This payment method is not available for this amount. Choose another method.', 'طريقة الدفع هذه غير متاحة لهذا المبلغ. اختر طريقة أخرى.'] });
  });
});

describe('database guards (PGlite)', () => {
  let db: PGlite;
  const maker = '00000000-0000-4000-8000-000000000001', checker = '00000000-0000-4000-8000-000000000002';
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;CREATE TABLE user_roles(user_id uuid,role text);INSERT INTO user_roles VALUES('${maker}','admin'),('${checker}','admin');
      CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2) $$;
      CREATE TABLE audit_logs(id serial, action text);CREATE FUNCTION staff_control_audit(uuid,text,text,text,jsonb,jsonb,text) RETURNS void LANGUAGE sql AS $$ INSERT INTO audit_logs(action) VALUES($2) $$;
      CREATE TABLE platform_settings(id boolean PRIMARY KEY DEFAULT true, updated_at timestamptz);INSERT INTO platform_settings VALUES(true,now());
      CREATE TABLE deals(id uuid PRIMARY KEY);CREATE TABLE fx_quotes(id uuid PRIMARY KEY, deal_id uuid);CREATE TABLE deal_transactions(id serial, deal_id uuid, kind text, fx_quote_id uuid);`);
    const f26 = readFileSync(new URL('../../drizzle/migrations/0026_finance_operational_center.sql', import.meta.url), 'utf8');
    await db.exec(f26.slice(f26.indexOf('CREATE TABLE public.finance_records')));
    await db.exec(readFileSync(new URL('../../drizzle/migrations/0027_multi_provider_routing.sql', import.meta.url), 'utf8').replace(/--> statement-breakpoint/g, ''));
  });
  afterAll(async () => { await db?.close(); });
  const append = (actor: string, kind: string, subject: string, payload: string) =>
    db.query<{ id: string }>('select finance_append_record($1,$2,$3,$4::jsonb,$5,gen_random_uuid()) as id', [actor, kind, subject, payload, 'Fictional sandbox test']);

  it('proposer cannot approve own routing change; second admin approval applies the mode', async () => {
    const p = (await append(maker, 'routing_mode_proposal', 'routing_mode', '{"environment":"sandbox","live":false,"mode":"price_book_sandbox"}')).rows[0]!.id;
    await expect(append(maker, 'approval', p, '{"environment":"sandbox"}')).rejects.toThrow('Independent approver');
    await append(checker, 'approval', p, '{"environment":"sandbox"}');
    expect((await db.query<{ routing_mode: string }>('select routing_mode from platform_settings')).rows[0]!.routing_mode).toBe('price_book_sandbox');
    await expect(append(maker, 'approval', p, '{"environment":"sandbox"}')).rejects.toThrow();
  });
  it('approved versions are immutable (no update/delete privilege)', async () => {
    const r = await db.query<{ u: boolean; d: boolean }>("select has_table_privilege('service_role','finance_records','UPDATE') u, has_table_privilege('service_role','finance_records','DELETE') d");
    expect(r.rows[0]).toEqual({ u: false, d: false });
  });
  it('funding locks the provider; re-routing and mismatched quotes are refused; cross-provider settlement stays OFF', async () => {
    const deal = '00000000-0000-4000-8000-0000000000d1', q1 = '00000000-0000-4000-8000-0000000000a1';
    await db.exec(`INSERT INTO deals(id) VALUES('${deal}');INSERT INTO fx_quotes(id,deal_id,route_provider,route_rule_version) VALUES('${q1}','${deal}','lite','seed-1/R1');
      INSERT INTO deal_transactions(deal_id,kind,fx_quote_id) VALUES('${deal}','funding','${q1}');`);
    expect((await db.query<{ route_provider: string }>(`select route_provider from deals where id='${deal}'`)).rows[0]!.route_provider).toBe('lite');
    await expect(db.exec(`UPDATE deals SET route_provider='geidea' WHERE id='${deal}'`)).rejects.toThrow('locked');
    await expect(db.exec(`INSERT INTO fx_quotes(id,deal_id,route_provider) VALUES(gen_random_uuid(),'${deal}','geidea')`)).rejects.toThrow('must match');
    await expect(db.exec(`UPDATE platform_settings SET cross_provider_settlement=true`)).rejects.toThrow();
  });
});
