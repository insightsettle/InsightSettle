import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const organiser = '00000000-0000-0000-0000-000000000001';
const owner = '00000000-0000-0000-0000-000000000002';
const buyer = '00000000-0000-0000-0000-000000000003';
const auction = '00000000-0000-0000-0000-000000000004';
const lot = '00000000-0000-0000-0000-000000000005';
const deal = '00000000-0000-0000-0000-000000000006';
let db: PGlite;
const sql = readFileSync(new URL('../../drizzle/migrations/0005_auction_model_and_rules.sql', import.meta.url), 'utf8');

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TYPE public.deal_type AS ENUM ('goods','services','contracting','freelance');
    CREATE TYPE public.app_role AS ENUM ('admin','staff');
    CREATE FUNCTION public.has_role(uuid, public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY, verification_status text);
    CREATE TABLE public.payout_accounts(user_id uuid PRIMARY KEY, verified boolean, currency text);
    CREATE TABLE public.deals(id uuid PRIMARY KEY, deal_type public.deal_type DEFAULT 'goods', buyer_id uuid, seller_id uuid, amount numeric(18,3), currency text, fee_payer text, inspection_days integer, shipping_responsibility text, status text DEFAULT 'pending_funding', delivered_at timestamptz, auto_release_at timestamptz);
    CREATE TABLE public.deal_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),deal_id uuid REFERENCES public.deals(id),kind text,status text,amount numeric,currency text);
    CREATE TABLE public.fee_rules(currency text); CREATE TABLE public.vat_rates(country_code text);
    CREATE TABLE public.fx_rates(code text,name text,provider_rate numeric,spread numeric,minor_units integer,active boolean,updated_by uuid);`);
  await db.exec(sql);
  await db.exec(`ALTER TABLE deals ADD COLUMN ref text DEFAULT 'DL-test', ADD COLUMN frozen boolean DEFAULT false, ADD COLUMN auto_release_enabled boolean DEFAULT true, ADD COLUMN refunded_amount numeric DEFAULT 0, ADD COLUMN released_at timestamptz;
    ALTER TABLE deal_transactions ADD COLUMN fee numeric DEFAULT 0, ADD COLUMN provider text, ADD COLUMN created_by uuid, ADD COLUMN note text, ADD COLUMN idempotency_key text;
    CREATE TABLE disputes(id uuid PRIMARY KEY,deal_id uuid,milestone_id uuid,status text,outcome text,buyer_percent numeric,resolution_note text,resolved_by uuid,resolved_at timestamptz,review_started_at timestamptz);
    CREATE FUNCTION run_auto_release() RETURNS integer LANGUAGE plpgsql AS $$ DECLARE r record; BEGIN
    INSERT INTO deal_transactions(deal_id, kind, amount, currency, status, provider, note, idempotency_key)
    VALUES (r.id, 'release', r.amount, r.currency, 'processing', 'manual', 'Automatic release after the inspection period', r.ref || '-RELEASE-AUTO');
    RETURN 0; END; $$;`);
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0006_auction_direct_payout.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0007_auction_payout_query_qualification.sql',import.meta.url),'utf8'));
}, 30_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`SET test.uid=''; TRUNCATE auctions,auction_lots,lot_bidders,deal_payout_splits,deals,deal_transactions,profiles,payout_accounts CASCADE;
    INSERT INTO profiles VALUES ('${organiser}','verified'),('${owner}','verified');
    INSERT INTO payout_accounts VALUES ('${organiser}',true,'BHD'),('${owner}',true,'BHD');
    INSERT INTO auctions(id,organiser_id,title,platform,currency,organiser_commission_pct,status) VALUES ('${auction}','${organiser}','Test','instagram','BHD',10,'open');
    INSERT INTO auction_lots(id,auction_id,title,owner_id,status) VALUES ('${lot}','${auction}','Item','${owner}','open');`);
});
async function bid(rank = 1, status = 'offered', price = 1000) {
  await db.exec(`INSERT INTO lot_bidders(lot_id,rank,platform_handle,email,user_id,price,status) VALUES ('${lot}',${rank},'bid${rank}','bid${rank}@example.test','${buyer}',${price},'${status}')`);
}
async function makeDeal() {
  await db.exec(`INSERT INTO deals(id,deal_type,buyer_id,seller_id,amount,currency,fee_payer,inspection_days,shipping_responsibility,auction_lot_id,payment_deadline_at)
    SELECT '${deal}','auction','${buyer}','${owner}',price,'BHD','buyer',3,'seller','${lot}',deadline_at FROM lot_bidders WHERE lot_id='${lot}' AND status='offered';
    UPDATE auction_lots SET deal_id='${deal}' WHERE id='${lot}';`);
}
async function fund(status = 'processing') {
  await db.exec(`INSERT INTO deal_transactions(deal_id,kind,status,amount,currency) VALUES ('${deal}','funding','${status}',1015,'BHD')`);
}

describe('auction database rules (actual migration)', () => {
  it('requires owner and organiser split to sum to 100', async () => {
    await expect(db.exec(`UPDATE auction_lots SET owner_pct=80,organiser_pct=10 WHERE id='${lot}'`)).rejects.toThrow(/sum to 100/);
    await db.exec(`UPDATE auction_lots SET owner_pct=90,organiser_pct=10 WHERE id='${lot}'`);
  });
  it('locks the split after the first recorded bidder, even waiting', async () => {
    await bid(1,'waiting');
    await expect(db.exec(`UPDATE auctions SET organiser_commission_pct=20 WHERE id='${auction}'`)).rejects.toThrow(/locked/);
    await expect(db.exec(`UPDATE auction_lots SET owner_pct=80,organiser_pct=20 WHERE id='${lot}'`)).rejects.toThrow(/locked/);
    const result = await db.query('SELECT owner_pct,organiser_pct FROM auction_lots');
    expect(result.rows[0]).toEqual({owner_pct:'90',organiser_pct:'10'});
  });
  it('refuses an unverified owner when opening a lot', async () => {
    await db.exec(`UPDATE profiles SET verification_status='pending' WHERE id='${owner}'; UPDATE auction_lots SET status='draft' WHERE id='${lot}'`);
    await expect(db.exec(`UPDATE auction_lots SET status='open' WHERE id='${lot}'`)).rejects.toThrow(/KYC/);
  });
  it('refuses an unverified organiser', async () => {
    await db.exec(`UPDATE profiles SET verification_status='pending' WHERE id='${organiser}'; UPDATE auction_lots SET status='draft' WHERE id='${lot}'`);
    await expect(db.exec(`UPDATE auction_lots SET status='open' WHERE id='${lot}'`)).rejects.toThrow(/KYC/);
  });
  it('requires both verified payout accounts in auction currency', async () => {
    for (const id of [owner, organiser]) {
      await db.exec(`UPDATE payout_accounts SET currency='SAR' WHERE user_id='${id}'`);
      await expect(bid()).rejects.toThrow(/payout account/);
      await db.exec(`UPDATE payout_accounts SET currency='BHD' WHERE user_id='${id}'`);
    }
  });
  it('refuses skipping rank 2 or an active first bidder', async () => {
    await bid(); await expect(bid(3,'waiting')).rejects.toThrow(/skip/);
    await bid(2,'waiting',950); await bid(3,'waiting',900);
    await expect(db.exec(`UPDATE lot_bidders SET status='offered' WHERE rank=3`)).rejects.toThrow(/skip/);
    await expect(db.exec(`UPDATE lot_bidders SET status='offered' WHERE rank=2`)).rejects.toThrow(/skip/);
  });
  it('advances 1 to 2 to 3 at each own immutable price', async () => {
    await bid(); await bid(2,'waiting',950); await bid(3,'waiting',900);
    await db.exec(`UPDATE lot_bidders SET status='declined' WHERE rank=1; UPDATE lot_bidders SET status='offered' WHERE rank=2;
      UPDATE lot_bidders SET status='declined' WHERE rank=2; UPDATE lot_bidders SET status='offered' WHERE rank=3;`);
    expect((await db.query('SELECT rank,price,status FROM lot_bidders ORDER BY rank')).rows).toEqual([
      {rank:1,price:'1000.000',status:'declined'}, {rank:2,price:'950.000',status:'declined'}, {rank:3,price:'900.000',status:'offered'}]);
    await expect(db.exec('UPDATE lot_bidders SET price=1000 WHERE rank=3')).rejects.toThrow(/immutable/);
  });
  it('forbids organiser-induced decline and early expiry', async () => {
    await bid(); await db.exec(`SET test.uid='${organiser}'`);
    await expect(db.exec(`UPDATE lot_bidders SET status='declined' WHERE rank=1`)).rejects.toThrow(/cannot decline/);
    await expect(db.exec(`UPDATE lot_bidders SET status='expired' WHERE rank=1`)).rejects.toThrow(/not expired/);
  });
  it('fixes payment to 24h and inspection to 72h', async () => {
    await bid();
    const result = await db.query(`SELECT extract(epoch FROM deadline_at-offered_at)::integer seconds FROM lot_bidders`);
    expect(result.rows[0]).toEqual({seconds:24*3600});
    await expect(db.exec(`UPDATE auctions SET payment_deadline_hours=12`)).rejects.toThrow();
    await expect(db.exec(`UPDATE auctions SET inspection_hours=48`)).rejects.toThrow();
  });
  it('refuses funding after the deadline, without reserving money', async () => {
    await bid(); await makeDeal();
    // Controlled clock fixture only in this isolated database; no live writes.
    await db.exec(`ALTER TABLE lot_bidders DISABLE TRIGGER guard_lot_bidder; UPDATE lot_bidders SET deadline_at=now()-interval '1 second'; ALTER TABLE lot_bidders ENABLE TRIGGER guard_lot_bidder;`);
    await expect(fund()).rejects.toThrow(/deadline expired/);
    expect((await db.query('SELECT count(*)::integer n FROM deal_transactions')).rows[0]).toEqual({n:0});
  });
  it('reserves one funding and blocks bidder movement or second funding', async () => {
    await bid(); await bid(2,'waiting',950); await makeDeal(); await fund();
    await expect(fund()).rejects.toThrow(/already reserved/);
    await expect(db.exec(`UPDATE lot_bidders SET status='declined' WHERE rank=1`)).rejects.toThrow(/Funding reserved/);
    await db.exec(`UPDATE deal_transactions SET status='succeeded'`);
    expect((await db.query('SELECT funded_deal_id FROM auction_lots')).rows[0]).toEqual({funded_deal_id:deal});
    await expect(db.exec(`UPDATE auction_lots SET funded_deal_id=NULL`)).rejects.toThrow(/already funded/);
  });
  it('accepts exactly two direct beneficiary legs summing to hammer price', async () => {
    await bid(); await makeDeal();
    await db.exec(`INSERT INTO deal_payout_splits(deal_id,beneficiary_id,role,pct,amount,currency) VALUES
      ('${deal}','${owner}','owner',90,900,'BHD'),('${deal}','${organiser}','organiser',10,100,'BHD');`);
    expect((await db.query('SELECT sum(pct)::text pct,sum(amount)::text amount FROM deal_payout_splits')).rows[0]).toEqual({pct:'100',amount:'1000.000'});
    await expect(db.exec(`UPDATE deal_payout_splits SET beneficiary_id='${organiser}' WHERE role='owner'`)).rejects.toThrow(/locked beneficiary/);
  });
  it('refuses an incomplete direct split', async () => {
    await bid(); await makeDeal();
    await expect(db.exec(`INSERT INTO deal_payout_splits(deal_id,beneficiary_id,role,pct,amount,currency) VALUES ('${deal}','${owner}','owner',90,900,'BHD')`)).rejects.toThrow(/Two direct payout/);
  });
  it('blocks legacy single-beneficiary releases without direct split links', async () => {
    await bid(); await makeDeal();
    await expect(db.exec(`INSERT INTO deal_transactions(deal_id,kind,status,amount,currency) VALUES ('${deal}','release','processing',1000,'BHD')`)).rejects.toThrow(/direct beneficiary split/);
  });
  it('does not change ordinary deal funding or release', async () => {
    await db.exec(`INSERT INTO deals(id,amount,currency) VALUES ('${deal}',1000,'BHD');
      INSERT INTO deal_transactions(deal_id,kind,status,amount,currency) VALUES ('${deal}','funding','succeeded',1000,'BHD'),('${deal}','release','succeeded',984.699,'BHD');`);
    expect((await db.query('SELECT count(*)::integer n FROM deal_transactions')).rows[0]).toEqual({n:2});
  });
  it('permits only the winner to pay the existing Insight fee', async () => {
    await bid(); await makeDeal();
    await expect(db.exec(`UPDATE deals SET fee_payer='split' WHERE id='${deal}'`)).rejects.toThrow(/buyer-paid fee/);
  });
  it('rejects a fourth bidder: exactly two backup slots', async () => {
    await bid(); await bid(2,'waiting',950); await bid(3,'waiting',900);
    await expect(bid(4,'waiting',850)).rejects.toThrow();
    expect((await db.query('SELECT count(*)::integer n FROM lot_bidders')).rows[0]).toEqual({n:3});
  });
  it('exposes only safe FX columns anonymously', async () => {
    const r = await db.query(`SELECT has_column_privilege('anon','public.fx_rates','code','SELECT') safe,
      has_column_privilege('anon','public.fx_rates','updated_by','SELECT') private`);
    expect(r.rows[0]).toEqual({safe:true,private:false});
  });
  it('creates direct release transactions atomically with immutable links and keys',async()=>{
    await bid(); await makeDeal(); await fund('succeeded');
    await db.exec(`INSERT INTO deal_payout_splits(deal_id,beneficiary_id,role,pct,amount,currency) VALUES ('${deal}','${owner}','owner',90,900,'BHD'),('${deal}','${organiser}','organiser',10,100,'BHD');
      UPDATE deals SET status='held' WHERE id='${deal}';`);
    const first=await db.query(`SELECT * FROM create_auction_release('${deal}')`);
    const second=await db.query(`SELECT * FROM create_auction_release('${deal}')`);
    expect(first.rows).toHaveLength(2); expect(second.rows).toHaveLength(2);
    expect((await db.query(`SELECT amount::text amount,idempotency_key FROM deal_transactions WHERE kind='release' ORDER BY amount DESC`)).rows).toEqual([
      {amount:'900.000',idempotency_key:'DL-test-RELEASE-OWNER'},{amount:'100.000',idempotency_key:'DL-test-RELEASE-ORG'}]);
  });
  it('creates dispute refund and beneficiary shares from the locked percentages',async()=>{
    await bid(); await makeDeal(); await fund('succeeded');
    await db.exec(`INSERT INTO deal_payout_splits(deal_id,beneficiary_id,role,pct,amount,currency) VALUES ('${deal}','${owner}','owner',90,900,'BHD'),('${deal}','${organiser}','organiser',10,100,'BHD');
      UPDATE deals SET status='disputed' WHERE id='${deal}';
      INSERT INTO disputes(id,deal_id,status) VALUES ('00000000-0000-0000-0000-000000000020','${deal}','open');`);
    await db.query(`SELECT * FROM create_auction_release('${deal}',NULL,'00000000-0000-0000-0000-000000000020','partial_settlement',70,'Split decision')`);
    expect((await db.query(`SELECT kind,amount::text amount FROM deal_transactions WHERE kind<>'funding' ORDER BY amount DESC`)).rows).toEqual([
      {kind:'refund',amount:'700.000'},{kind:'release',amount:'270.000'},{kind:'release',amount:'30.000'}]);
    expect((await db.query(`SELECT status,buyer_percent::text pct FROM disputes WHERE id='00000000-0000-0000-0000-000000000020'`)).rows[0]).toEqual({status:'resolved',pct:'70'});
  });
});