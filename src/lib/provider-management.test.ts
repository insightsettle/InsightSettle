import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { projectCredential } from './finance/credentials';
import { decryptCredential, encryptCredential } from './finance/credentials.server';
import { ADAPTERS } from './finance/adapters';
import { archiveBlockers, effectiveProviders, SEED_PROVIDERS } from './finance/provider-config';
import { resolveRoute, SEED_PRICE_BOOK, SEED_ROUTING } from './finance/price-book';

const KEY = 'test-only-key-not-a-real-secret-000000000000000000000000';
const rec = (id: string, kind: string, payload: any, at: string, subject = 'x') => ({ id, kind, subject_id: subject, payload, created_at: at });

describe('credentials', () => {
  it('stored values are encrypted and the browser projection never contains them', async () => {
    const e = await encryptCredential('sk_test_SECRETVALUE1234', KEY);
    expect(e.ciphertext).not.toContain('SECRETVALUE');
    expect(await decryptCredential(e.ciphertext, e.iv, KEY)).toBe('sk_test_SECRETVALUE1234');
    const out = projectCredential({ id: '1', provider: 'lite', environment: 'sandbox', field: 'secret_key', ciphertext: e.ciphertext, iv: e.iv, last4: '1234', set_by: 'u', set_at: 't', status: 'active', proposal_id: null });
    const json = JSON.stringify(out);
    expect(json).not.toContain(e.ciphertext); expect(json).not.toContain(e.iv); expect(json).not.toContain('SECRETVALUE');
    expect(out).not.toHaveProperty('ciphertext'); expect(out.masked).toBe('••••1234');
  });
});

describe('adapters', () => {
  it('Test connection on every stub reports not implemented, never success', async () => {
    for (const code of ['lite', 'tap', 'geidea', 'afs', 'generic']) {
      const r = await ADAPTERS[code]!.testConnection({ secret_key: 'x' }, 'sandbox');
      expect(r).toMatchObject({ ok: false, implemented: false });
      expect(r.message[0]).toContain('Adapter not built yet');
    }
  });
});

describe('provider configuration', () => {
  it('turning a job off removes the provider from new routes but not from funded deals', () => {
    const lite = SEED_PROVIDERS.find(p => p.code === 'lite')!;
    const offJobs = { ...lite.jobs, payin: { ...lite.jobs.payin, mada: { ...lite.jobs.payin.mada, on: false } } };
    const list = effectiveProviders([rec('p1', 'provider_jobs_proposal', { provider: 'lite', jobs: offJobs }, '1'), rec('a1', 'approval', {}, '2', 'p1')]);
    const input = { dealType: 'goods' as const, payerCountry: 'SA', payInCurrency: 'SAR', method: 'mada' as const, payeeCountry: 'SA', payoutCurrency: 'SAR', amountSar: 2000, holdingDays: 7 };
    expect(resolveRoute(SEED_PRICE_BOOK, SEED_ROUTING, input, null, SEED_PROVIDERS).provider).toBe('lite');
    expect(resolveRoute(SEED_PRICE_BOOK, SEED_ROUTING, input, null, list).provider).not.toBe('lite');
    expect(resolveRoute(SEED_PRICE_BOOK, SEED_ROUTING, input, { provider: 'lite', version: 'seed-1/R1' }, list).provider).toBe('lite');
  });
  it('an unapproved job change has no effect', () => {
    const list = effectiveProviders([rec('p1', 'provider_jobs_proposal', { provider: 'lite', jobs: { ...SEED_PROVIDERS[1]!.jobs, payout: { on: false, countries: [], currencies: [] } } }, '1')]);
    expect(list.find(p => p.code === 'lite')!.jobs.payout.on).toBe(true);
  });
  it('renaming keeps the internal code and history', () => {
    const records = [rec('p1', 'provider_profile_proposal', { provider: 'lite', profile: { code: 'hacked', nameEn: 'lite Pay', nameAr: 'لايت باي', status: 'not_connected' } }, '1'), rec('a1', 'approval', {}, '2', 'p1')];
    const p = effectiveProviders(records).find(x => x.nameEn === 'lite Pay')!;
    expect(p.code).toBe('lite'); expect(p.nameAr).toBe('لايت باي');
    expect(effectiveProviders(records).some(x => x.code === 'hacked')).toBe(false);
  });
  it('archiving is blocked while an enabled route pins the provider or a quote is open', () => {
    expect(archiveBlockers('lite', SEED_ROUTING.rules, 0)).toEqual(['active_route:R1,R3']);
    expect(archiveBlockers('geidea', SEED_ROUTING.rules, 2)).toEqual(['unfunded_quotes:2']);
    expect(archiveBlockers('tap', SEED_ROUTING.rules, 0)).toEqual([]);
  });
  it('seeds the founder assignments and exactly five providers', () => {
    expect(SEED_PROVIDERS.map(p => p.code)).toEqual(['manual', 'lite', 'geidea', 'tap', 'afs']);
    const by = (c: string) => SEED_PROVIDERS.find(p => p.code === c)!;
    expect([by('lite').jobs.payin.mada.on, by('lite').jobs.payin.credit_card.on, by('lite').jobs.payin.bank_transfer.on]).toEqual([true, false, true]);
    // Geidea closed by the founder on 28 Oct: archived, nothing switched on.
    expect(by('geidea').status).toBe('archived');
    expect(Object.values(by('geidea').jobs.payin).some(j => j.on)).toBe(false);
    expect(Object.values(by('tap').jobs.payin).some(j => j.on)).toBe(false);
    expect(Object.values(by('afs').jobs.payin).some(j => j.on)).toBe(false);
  });
});

describe('credential activation needs a second admin (PGlite)', () => {
  let db: PGlite;
  const maker = '00000000-0000-4000-8000-000000000001', checker = '00000000-0000-4000-8000-000000000002';
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TABLE user_roles(user_id uuid,role text);INSERT INTO user_roles VALUES('${maker}','admin'),('${checker}','admin');
      CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2) $$;
      CREATE TABLE audit_logs(id serial, action text);CREATE FUNCTION staff_control_audit(uuid,text,text,text,jsonb,jsonb,text) RETURNS void LANGUAGE sql AS $$ INSERT INTO audit_logs(action) VALUES($2) $$;
      CREATE TABLE platform_settings(id boolean PRIMARY KEY DEFAULT true, updated_at timestamptz);INSERT INTO platform_settings VALUES(true,now());
      CREATE TABLE deals(id uuid PRIMARY KEY, ref text, buyer_id uuid, seller_id uuid);CREATE TABLE fx_quotes(id uuid PRIMARY KEY, deal_id uuid);
      CREATE TABLE deal_transactions(id uuid, deal_id uuid, kind text, amount numeric, fee numeric, currency text, status text, provider text, provider_ref text, created_at timestamptz, updated_at timestamptz, original_transaction_id uuid, milestone_id uuid, payout_split_id uuid, fx_quote_id uuid);`);
    const f26 = readFileSync(new URL('../../drizzle/migrations/0026_finance_operational_center.sql', import.meta.url), 'utf8');
    await db.exec(f26);
    await db.exec(readFileSync(new URL('../../drizzle/migrations/0027_multi_provider_routing.sql', import.meta.url), 'utf8'));
    await db.exec(readFileSync(new URL('../../drizzle/migrations/0030_provider_management.sql', import.meta.url), 'utf8'));
  });
  afterAll(async () => { await db?.close(); });
  const append = (actor: string, kind: string, subject: string, payload: string) =>
    db.query<{ id: string }>('select finance_append_record($1,$2,$3,$4::jsonb,$5,gen_random_uuid()) as id', [actor, kind, subject, payload, 'Fictional sandbox test']);
  it('pending credential becomes active only after an independent approval', async () => {
    const p = (await append(maker, 'credential_proposal', 'lite', '{"environment":"sandbox","live":false,"provider":"lite","credential_environment":"sandbox","field":"secret_key","action":"set","last4":"1234"}')).rows[0]!.id;
    await db.query(`INSERT INTO finance_provider_credentials(provider,environment,field,ciphertext,iv,last4,set_by,proposal_id) VALUES('lite','sandbox','secret_key','c','i','1234',$1,$2)`, [maker, p]);
    await expect(append(maker, 'approval', p, '{"environment":"sandbox"}')).rejects.toThrow('Independent approver');
    expect((await db.query<{ status: string }>('select status from finance_provider_credentials')).rows[0]!.status).toBe('pending');
    await append(checker, 'approval', p, '{"environment":"sandbox"}');
    expect((await db.query<{ status: string }>('select status from finance_provider_credentials')).rows[0]!.status).toBe('active');
    await expect(append(checker, 'rejection', p, '{"environment":"sandbox"}')).rejects.toThrow('already decided');
  });
  it('authenticated users have no access to the credential table', async () => {
    const r = await db.query<{ s: boolean }>("select has_table_privilege('authenticated','finance_provider_credentials','SELECT') s");
    expect(r.rows[0]!.s).toBe(false);
  });
  it('production credentials and live proposals are refused', async () => {
    await expect(append(maker, 'credential_proposal', 'lite', '{"environment":"production","provider":"lite"}')).rejects.toThrow('Live operations disabled');
  });
});
