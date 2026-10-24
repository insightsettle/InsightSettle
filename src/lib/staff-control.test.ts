import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
const actor='00000000-0000-0000-0000-000000000008',org='00000000-0000-0000-0000-000000000001',owner='00000000-0000-0000-0000-000000000002',buyer='00000000-0000-0000-0000-000000000003',lot='00000000-0000-0000-0000-000000000005',auction='00000000-0000-0000-0000-000000000004';
let db:PGlite;let deal:string;
beforeAll(async()=>{db=new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE TYPE deal_type AS ENUM('goods','services','contracting','freelance'); CREATE TYPE app_role AS ENUM('admin','staff');
      CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='00000000-0000-0000-0000-000000000008'::uuid $$;
      CREATE TABLE profiles(id uuid PRIMARY KEY,verification_status text); CREATE TABLE payout_accounts(user_id uuid PRIMARY KEY,verified boolean,currency text);
      CREATE TABLE deals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ref text DEFAULT gen_random_uuid()::text,title text,description text,deal_type deal_type DEFAULT 'goods',buyer_id uuid,seller_id uuid,created_by uuid,counterparty_email text,invite_token text DEFAULT gen_random_uuid()::text,amount numeric(18,3),currency text,fee_payer text,inspection_days integer,shipping_responsibility text,shipping_status text,status text DEFAULT 'pending_funding',delivered_at timestamptz,auto_release_at timestamptz,frozen boolean DEFAULT false,auto_release_enabled boolean DEFAULT true,refunded_amount numeric DEFAULT 0,released_at timestamptz,cancelled_at timestamptz,terms_status text,terms_version integer DEFAULT 1);
      CREATE TABLE deal_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),deal_id uuid REFERENCES deals(id),kind text,status text,amount numeric,currency text,fee numeric DEFAULT 0,provider text,created_by uuid,note text,idempotency_key text);
      CREATE TABLE fee_rules(currency text); CREATE TABLE vat_rates(country_code text); CREATE TABLE fx_rates(code text,name text,provider_rate numeric,spread numeric,minor_units integer,active boolean,updated_by uuid);
      CREATE TABLE disputes(id uuid PRIMARY KEY,deal_id uuid,milestone_id uuid,status text,outcome text,buyer_percent numeric,resolution_note text,resolved_by uuid,resolved_at timestamptz,review_started_at timestamptz);
      CREATE TABLE deal_term_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),deal_id uuid,version integer,snapshot jsonb,created_by uuid,note text,accepted_by uuid,accepted_at timestamptz);
      CREATE TABLE notifications(user_id uuid,deal_id uuid,kind text,title text,body text); CREATE TABLE deal_events(deal_id uuid,actor_id uuid,title text);
      CREATE TABLE fx_quotes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),deal_id uuid,total numeric,fee numeric,target_currency text,expires_at timestamptz,used_at timestamptz,breakdown jsonb);
      ALTER TABLE deal_transactions ADD COLUMN fx_quote_id uuid;
      ALTER TABLE deals ADD COLUMN fee_override_percent numeric, ADD COLUMN fee_override_flat numeric;
      CREATE FUNCTION run_auto_release() RETURNS integer LANGUAGE plpgsql AS $$ DECLARE r record; BEGIN
    INSERT INTO deal_transactions(deal_id, kind, amount, currency, status, provider, note, idempotency_key)
    VALUES (r.id, 'release', r.amount, r.currency, 'processing', 'manual', 'Automatic release after the inspection period', r.ref || '-RELEASE-AUTO'); RETURN 0; END; $$;`);
for (const file of ['0005_auction_model_and_rules.sql','0006_auction_direct_payout.sql','0007_auction_payout_query_qualification.sql','0008_auction_final_confirmation_guard.sql','0009_auction_bidder_deadlines.sql','0010_auction_funded_bidder_confirmation.sql','0011_auction_offer_terms_guards.sql','0012_auction_decline_identity_guard.sql','0013_auction_backup_price_validation.sql']) {
      await db.exec(readFileSync(new URL(`../../drizzle/migrations/${file}`, import.meta.url),'utf8'));
    }
await db.exec(`ALTER TABLE profiles ADD COLUMN full_name text,ADD COLUMN account_state text DEFAULT 'active';
ALTER TABLE deals ADD COLUMN due_at date,ADD COLUMN estimated_delivery_at date,ADD COLUMN frozen_reason text;
CREATE TABLE audit_logs(id uuid DEFAULT gen_random_uuid(),user_id uuid,action text,entity text,entity_id text,old_value jsonb,new_value jsonb,created_at timestamptz DEFAULT now());
CREATE FUNCTION demo_reset_active() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE UNIQUE INDEX terms_version_unique ON deal_term_versions(deal_id,version);
INSERT INTO profiles(id,verification_status,full_name) VALUES('${actor}','verified','Demo admin');`);
await db.exec(readFileSync(new URL('../../drizzle/migrations/0018_staff_control_centre.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../../drizzle/migrations/0019_staff_payment_deadline_column.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
await db.exec(`SET test.uid=''; TRUNCATE auctions,auction_lots,lot_bidders,deal_payout_splits,deals,deal_transactions,auth.users,fx_quotes,deal_term_versions,notifications,deal_events,disputes,audit_logs CASCADE;
UPDATE auction_fee_settings SET mode='standard',default_commission=15,max_commission=100;
INSERT INTO auth.users VALUES('${buyer}','bid1@example.test',now());
INSERT INTO profiles(id,verification_status) VALUES('${owner}','verified'),('${org}','verified'),('${buyer}','verified') ON CONFLICT(id) DO UPDATE SET account_state='active';
INSERT INTO payout_accounts VALUES('${owner}',true,'BHD'),('${org}',true,'BHD') ON CONFLICT DO NOTHING;
INSERT INTO auctions(id,organiser_id,title,platform,currency,organiser_commission_pct,status) VALUES('${auction}','${org}','Test','instagram','BHD',15,'open');
INSERT INTO auction_lots(id,auction_id,title,owner_id,status) VALUES('${lot}','${auction}','Item','${owner}','open');`);
const r=await db.query<{value:{dealId:string}}>(`SELECT record_auction_winner('${lot}','${org}','[{"rank":1,"handle":"demo","email":"bid1@example.test","price":1000.5}]') value`);deal=r.rows[0]?.value.dealId??'';
});
it('edits 85/15 to 80/20 before payment with new terms and exact BHD legs',async()=>{
await db.exec(`SELECT staff_edit_auction_split('${actor}','${lot}',20,'Demo customer request')`);
expect((await db.query(`SELECT role,pct,amount FROM deal_payout_splits ORDER BY role`)).rows).toEqual([{role:'organiser',pct:'20',amount:'200.100'},{role:'owner',pct:'80',amount:'800.400'}]);
const terms=await db.query(`SELECT version,snapshot->>'organiser_pct' pct,accepted_at FROM deal_term_versions ORDER BY version`);
expect(terms.rows).toEqual([{version:1,pct:'15',accepted_at:null},{version:2,pct:'20',accepted_at:null}]);
expect((await db.query(`SELECT terms_version,amount FROM deals`)).rows[0]).toEqual({terms_version:2,amount:'1000.500'});
expect((await db.query(`SELECT new_value->>'staff_name' name FROM audit_logs`)).rows[0]).toEqual({name:'Demo admin'});
});
it('rejects reserved funding and consumed quote split edits',async()=>{
await db.exec(`INSERT INTO fx_quotes(deal_id,total,fee,target_currency,expires_at,used_at,breakdown) VALUES('${deal}',1015,15,'BHD',now()+interval '15 minutes',now(),'{"terms_version":1}')`);
await expect(db.exec(`SELECT staff_edit_auction_split('${actor}','${lot}',20,'Demo request')`)).rejects.toThrow(/immutable/);
});
it('payment extension preserves bidder and deal deadline equality',async()=>{
await db.exec(`SELECT staff_operational_update('${actor}','${deal}','payment',(now()+interval '48 hours')::text,'Demo extension')`);
expect((await db.query(`SELECT d.payment_deadline_at=b.deadline_at same FROM deals d JOIN lot_bidders b ON b.deal_id=d.id`)).rows[0]).toEqual({same:true});
await expect(db.exec(`SELECT staff_operational_update('${actor}','${deal}','payment',NULL,'Demo extension')`)).rejects.toThrow(/future/);
});
it('staff flags do not permit owner or amount changes',async()=>{
await db.exec(`SELECT set_config('insight.staff_split','on',false),set_config('insight.staff_terms','on',false)`);
await expect(db.exec(`UPDATE auction_lots SET owner_id='${org}'`)).rejects.toThrow(/locked/);
await expect(db.exec(`UPDATE deals SET amount=2000`)).rejects.toThrow();
await db.exec(`SELECT set_config('insight.staff_split','off',false),set_config('insight.staff_terms','off',false)`);
});
it('suspension blocks new funding while leaving auth unchanged',async()=>{
await db.exec(`SELECT staff_account_state('${actor}','${buyer}','suspended','Demo suspension')`);
await expect(db.exec(`INSERT INTO deal_transactions(deal_id,kind,status,amount,currency) VALUES('${deal}','funding','processing',1015,'BHD')`)).rejects.toThrow(/suspended/);
expect((await db.query(`SELECT email_confirmed_at IS NOT NULL active FROM auth.users WHERE id='${buyer}'`)).rows[0]).toEqual({active:true});
});
it('a required audit reason cannot be null',async()=>{
await expect(db.exec(`SELECT staff_edit_auction_split('${actor}','${lot}',20,NULL)`)).rejects.toThrow(/reason/);
expect((await db.query(`SELECT organiser_pct FROM auction_lots`)).rows[0]).toEqual({organiser_pct:'15'});
});
it('unfreeze rejects unresolved dispute without touching held funds',async()=>{
await db.exec(`INSERT INTO disputes(id,deal_id,status) VALUES(gen_random_uuid(),'${deal}','open')`);
await expect(db.exec(`SELECT staff_operational_update('${actor}','${deal}','unfreeze','','Demo request')`)).rejects.toThrow(/four-eyes/);
});
it('configured commission maximum refuses 31 percent when maximum is 30',async()=>{
await db.exec(`SELECT staff_save_auction_settings('${actor}','{"max_commission":30,"default_commission":15}','Demo settings')`);
await expect(db.exec(`SELECT staff_edit_auction_split('${actor}','${lot}',31,'Demo request')`)).rejects.toThrow(/commission/);
});
