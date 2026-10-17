import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

// Real independent PostgreSQL sessions, never PGlite's serialized single connection.
// Run with AUCTION_TEST_DATABASE_URL pointing to an empty LOCAL disposable database.
const url = process.env['AUCTION_TEST_DATABASE_URL'];
const suite = url ? describe : describe.skip;
const organiser = '00000000-0000-0000-0000-000000000001';
const owner = '00000000-0000-0000-0000-000000000002';
const buyer = '00000000-0000-0000-0000-000000000003';
const backup = '00000000-0000-0000-0000-000000000007';
const auction = '00000000-0000-0000-0000-000000000004';
const lot = '00000000-0000-0000-0000-000000000005';
let db: ReturnType<typeof postgres>;
let offer: any;
async function record(count = 3, guest = false) {
  const bidders = Array.from({ length: count }, (_, i) => ({ rank: i + 1, handle: `bid${i + 1}`, email: guest && i === 0 ? 'guest@example.test' : `bid${i + 1}@example.test`, price: 1000 - i * 100 }));
  const rows = await db`SELECT record_auction_winner(${lot},${organiser},${db.json(bidders)}) value`;
  offer = rows[0]?.value;
  return offer;
}
async function expire() {
  // Only the isolated fixture moves its clock: production guards remain enabled and tested.
  await db.unsafe(`ALTER TABLE lot_bidders DISABLE TRIGGER guard_lot_bidder; ALTER TABLE deals DISABLE TRIGGER guard_auction_deal; ALTER TABLE deals DISABLE TRIGGER guard_auction_offer_terms;
    UPDATE lot_bidders SET offered_at=now()-interval '25 hours',deadline_at=now()-interval '1 hour' WHERE status='offered';
    UPDATE deals SET payment_deadline_at=now()-interval '1 hour' WHERE status='pending_funding';
    ALTER TABLE lot_bidders ENABLE TRIGGER guard_lot_bidder; ALTER TABLE deals ENABLE TRIGGER guard_auction_deal; ALTER TABLE deals ENABLE TRIGGER guard_auction_offer_terms;`);
}
async function quote(dealId: string) {
  const rows = await db`INSERT INTO fx_quotes(deal_id,total,fee,target_currency,expires_at,breakdown) VALUES(${dealId},1015,15,'BHD',now()+interval '15 minutes','{"terms_version":1,"breakdown":{"feePayer":"buyer"}}') RETURNING id`;
  return rows[0]?.id as string;
}
suite('auction deadline workflow — actual PostgreSQL concurrent connections', () => {
  beforeAll(async () => {
    if (!url || !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1)/.test(url)) throw new Error('Only a disposable localhost test database is allowed.');
    db = postgres(url, { max: 6, onnotice: () => {} });
    await db.unsafe('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE; CREATE SCHEMA public; DROP ROLE IF EXISTS anon; DROP ROLE IF EXISTS authenticated; DROP ROLE IF EXISTS service_role;');
    await db.unsafe(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TYPE deal_type AS ENUM('goods','services','contracting','freelance'); CREATE TYPE app_role AS ENUM('admin','staff');
      CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE TABLE profiles(id uuid PRIMARY KEY,verification_status text); CREATE TABLE payout_accounts(user_id uuid PRIMARY KEY,verified boolean,currency text);
      CREATE TABLE deals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ref text DEFAULT gen_random_uuid()::text,title text,description text,deal_type deal_type DEFAULT 'goods',buyer_id uuid,seller_id uuid,created_by uuid,counterparty_email text,invite_token text DEFAULT gen_random_uuid()::text,amount numeric(18,3),currency text,fee_payer text,inspection_days integer,shipping_responsibility text,shipping_status text,status text DEFAULT 'pending_funding',delivered_at timestamptz,auto_release_at timestamptz,frozen boolean DEFAULT false,auto_release_enabled boolean DEFAULT true,refunded_amount numeric DEFAULT 0,released_at timestamptz,cancelled_at timestamptz,terms_status text,terms_version integer DEFAULT 1);
      CREATE TABLE deal_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),deal_id uuid REFERENCES deals(id),kind text,status text,amount numeric,currency text,fee numeric DEFAULT 0,provider text,created_by uuid,note text,idempotency_key text);
      CREATE TABLE fee_rules(currency text); CREATE TABLE vat_rates(country_code text); CREATE TABLE fx_rates(code text,name text,provider_rate numeric,spread numeric,minor_units integer,active boolean,updated_by uuid);
      CREATE TABLE disputes(id uuid PRIMARY KEY,deal_id uuid,milestone_id uuid,status text,outcome text,buyer_percent numeric,resolution_note text,resolved_by uuid,resolved_at timestamptz,review_started_at timestamptz);
      CREATE TABLE deal_term_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),deal_id uuid,version integer,snapshot jsonb,created_by uuid,note text,accepted_by uuid,accepted_at timestamptz);
      CREATE TABLE notifications(user_id uuid,deal_id uuid,kind text,title text,body text); CREATE TABLE deal_events(deal_id uuid,actor_id uuid,title text);
      CREATE TABLE fx_quotes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),deal_id uuid,total numeric,fee numeric,target_currency text,expires_at timestamptz,used_at timestamptz,breakdown jsonb);
      ALTER TABLE deal_transactions ADD COLUMN fx_quote_id uuid;
      CREATE FUNCTION run_auto_release() RETURNS integer LANGUAGE plpgsql AS $$ DECLARE r record; BEGIN
    INSERT INTO deal_transactions(deal_id, kind, amount, currency, status, provider, note, idempotency_key)
    VALUES (r.id, 'release', r.amount, r.currency, 'processing', 'manual', 'Automatic release after the inspection period', r.ref || '-RELEASE-AUTO'); RETURN 0; END; $$;`);
    for (const file of ['0005_auction_model_and_rules.sql','0006_auction_direct_payout.sql','0007_auction_payout_query_qualification.sql','0008_auction_final_confirmation_guard.sql','0009_auction_bidder_deadlines.sql','0010_auction_funded_bidder_confirmation.sql','0011_auction_offer_terms_guards.sql','0012_auction_decline_identity_guard.sql']) {
      await db.unsafe(readFileSync(new URL(`../../drizzle/migrations/${file}`, import.meta.url),'utf8'));
    }
  }, 30000);
  afterAll(async () => { if (db) await db.end(); });
  beforeEach(async () => {
    await db.unsafe(`TRUNCATE auctions,auction_lots,lot_bidders,deal_payout_splits,deals,deal_transactions,profiles,payout_accounts,auth.users,fx_quotes,deal_term_versions,notifications,deal_events CASCADE;
      INSERT INTO auth.users VALUES('${buyer}','bid1@example.test',now()),('${backup}','bid2@example.test',now());
      INSERT INTO profiles VALUES('${owner}','verified'),('${organiser}','verified'); INSERT INTO payout_accounts VALUES('${owner}',true,'BHD'),('${organiser}',true,'BHD');
      INSERT INTO auctions(id,organiser_id,title,platform,currency,organiser_commission_pct,status) VALUES('${auction}','${organiser}','Test','instagram','BHD',15,'open');
      INSERT INTO auction_lots(id,auction_id,title,owner_id,status) VALUES('${lot}','${auction}','Item','${owner}','open');`);
  });
  it('T22-d expires rank 1, offers rank 2 at own price and pays without touching rank 3', async () => {
    await record(); await expire(); await db`SELECT sweep_auction_deadlines()`;
    const bidders = await db`SELECT rank,status,deal_id FROM lot_bidders ORDER BY rank`;
    expect(bidders.map(b => b.status)).toEqual(['expired','offered','waiting']);
    const second = bidders[1]?.deal_id;
    const [d] = await db`SELECT amount,payment_deadline_at,status FROM deals WHERE id=${second}`;
    expect(Number(d?.amount)).toBe(900);
    expect(new Date(d?.payment_deadline_at).getTime() - Date.now()).toBeGreaterThan(86390000);
    expect((await db`SELECT status FROM deals WHERE id=${offer.dealId}`)[0]?.status).toBe('cancelled');
    const q = await quote(second);
    const [tx] = await db`SELECT reserve_auction_funding(${second},${backup},${q},'manual','Demo') id`;
    await db`UPDATE deal_transactions SET status='succeeded' WHERE id=${tx?.id}`;
    expect((await db`SELECT status FROM lot_bidders ORDER BY rank`).map(b => b.status)).toEqual(['expired','paid','waiting']);
    expect(await db`SELECT id FROM deal_transactions WHERE deal_id=${offer.dealId}`).toHaveLength(0);
    expect((await db`SELECT accepted_by FROM deal_term_versions WHERE deal_id=${second}`)[0]?.accepted_by).toBe(backup);
  });
  it('decline moves immediately and rejects organiser impersonation', async () => {
    await record(); await expect(db`SELECT advance_auction_bidder(${lot},${organiser})`).rejects.toThrow(/Only the offered buyer/);
    await db`SELECT advance_auction_bidder(${lot},${buyer})`;
    expect((await db`SELECT status FROM lot_bidders ORDER BY rank`).map(b=>b.status)).toEqual(['declined','offered','waiting']);
    expect(await db`SELECT * FROM deal_transactions`).toHaveLength(0);
  });
  it('exhaustion makes lot unsold and notifies organiser without any charge', async () => {
    await record(1); await expire(); await db`SELECT sweep_auction_deadlines()`;
    expect((await db`SELECT status FROM auction_lots`)[0]?.status).toBe('unsold');
    expect(await db`SELECT * FROM notifications WHERE user_id=${organiser} AND title='Auction lot unsold'`).toHaveLength(1);
    expect(await db`SELECT * FROM deal_transactions`).toHaveLength(0);
    await db`SELECT sweep_auction_deadlines()`;
    expect(await db`SELECT * FROM notifications WHERE title='Auction lot unsold'`).toHaveLength(1);
  });
  it('two simultaneous fundings: exactly one independent transaction succeeds', async () => {
    await record(); const q1 = await quote(offer.dealId); const q2 = await quote(offer.dealId);
    const results = await Promise.allSettled([db`SELECT reserve_auction_funding(${offer.dealId},${buyer},${q1},'manual','Demo')`,db`SELECT reserve_auction_funding(${offer.dealId},${buyer},${q2},'manual','Demo')`]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(await db`SELECT * FROM deal_transactions`).toHaveLength(1);
    expect(await db`SELECT * FROM fx_quotes WHERE used_at IS NOT NULL`).toHaveLength(1);
  });
  it('funding holding lot lock wins against an expiry sweep; no successor funded', async () => {
    await record(); const q = await quote(offer.dealId);
    await db.unsafe(`ALTER TABLE lot_bidders DISABLE TRIGGER guard_lot_bidder; ALTER TABLE deals DISABLE TRIGGER guard_auction_deal; ALTER TABLE deals DISABLE TRIGGER guard_auction_offer_terms;
      UPDATE lot_bidders SET deadline_at=clock_timestamp()+interval '300 milliseconds' WHERE status='offered';
      UPDATE deals SET payment_deadline_at=(SELECT deadline_at FROM lot_bidders WHERE deal_id=deals.id) WHERE id='${offer.dealId}';
      ALTER TABLE lot_bidders ENABLE TRIGGER guard_lot_bidder; ALTER TABLE deals ENABLE TRIGGER guard_auction_deal; ALTER TABLE deals ENABLE TRIGGER guard_auction_offer_terms;`);
    let releaseLock: () => void = () => {};
    let acquired: () => void = () => {};
    const ready = new Promise<void>(resolve=>{acquired=resolve;});
    const continueTx = new Promise<void>(resolve=>{releaseLock=resolve;});
    const payment = db.begin(async tx => {
      await tx`SELECT reserve_auction_funding(${offer.dealId},${buyer},${q},'manual','Demo')`;
      acquired(); await continueTx; return true;
    });
    await ready;
    await new Promise(resolve=>setTimeout(resolve,350));
    // Start the second connection on the SAME lot while payment still holds its lock.
    const sweep = db`SELECT sweep_auction_deadlines() value`.execute();
    await new Promise(resolve=>setTimeout(resolve,30)); releaseLock();
    const [paid,moved] = await Promise.all([payment,sweep]);
    expect(paid).toBe(true); expect(moved[0]?.value).toEqual([]);
    expect(await db`SELECT * FROM deal_transactions`).toHaveLength(1);
    expect((await db`SELECT status FROM lot_bidders ORDER BY rank`).map(b=>b.status)).toEqual(['offered','waiting','waiting']);
  });
  it('expiry sweep holding lock wins and stale funding fails without consuming quote', async () => {
    await record(); const old = offer.dealId; const q = await quote(old); await expire();
    let unlock: () => void = () => {}; let ready: () => void = () => {};
    const acquired = new Promise<void>(resolve=>{ready=resolve;}); const continueTx = new Promise<void>(resolve=>{unlock=resolve;});
    const sweep = db.begin(async tx=>{ await tx`SELECT sweep_auction_deadlines()`; ready(); await continueTx; return true; });
    await acquired;
    const payment = db`SELECT reserve_auction_funding(${old},${buyer},${q},'manual','Demo')`.execute();
    const outcomes = Promise.allSettled([sweep,payment]);
    await new Promise(resolve=>setTimeout(resolve,30)); unlock();
    const results = await outcomes;
    expect(results.map(r=>r.status)).toEqual(['fulfilled','rejected']);
    expect(await db`SELECT * FROM deal_transactions`).toHaveLength(0);
    expect((await db`SELECT used_at FROM fx_quotes WHERE id=${q}`)[0]?.used_at).toBeNull();
  });
  it('unregistered winner can join only via verified matching email', async () => {
    await record(1,true);
    await expect(db`SELECT claim_auction_invite(${offer.token},${backup})`).rejects.toThrow(/verified account/);
    await db`INSERT INTO auth.users VALUES('00000000-0000-0000-0000-000000000008','guest@example.test',now())`;
    await db`SELECT claim_auction_invite(${offer.token},'00000000-0000-0000-0000-000000000008')`;
    expect((await db`SELECT buyer_id FROM deals`)[0]?.buyer_id).toBe('00000000-0000-0000-0000-000000000008');
  });
  it('refuses frozen funding and immutable term changes', async () => {
    await record(); const q = await quote(offer.dealId);
    await db`UPDATE deals SET frozen=true WHERE id=${offer.dealId}`;
    await expect(db`SELECT reserve_auction_funding(${offer.dealId},${buyer},${q},'manual','Demo')`).rejects.toThrow(/ended or already funded/);
    await expect(db`UPDATE deals SET title='Replacement' WHERE id=${offer.dealId}`).rejects.toThrow(/immutable/);
    await expect(db`UPDATE deal_term_versions SET snapshot='{}' WHERE deal_id=${offer.dealId}`).rejects.toThrow(/immutable/);
    expect(await db`SELECT * FROM deal_transactions`).toHaveLength(0);
  });
  it('refuses stale decline against a later offer even for the same bidder account', async () => {
    await record(); const old=offer.dealId;
    await db`SELECT decline_auction_deal(${old},${buyer})`;
    await expect(db`SELECT decline_auction_deal(${old},${buyer})`).rejects.toThrow(/no longer current/);
    expect((await db`SELECT status FROM lot_bidders ORDER BY rank`).map(b=>b.status)).toEqual(['declined','offered','waiting']);
  });
});