import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
let db:PGlite;
const id='00000000-0000-0000-0000-000000000001';
describe('verified business auction eligibility',()=>{
 beforeAll(async()=>{db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE TABLE profiles(id uuid primary key,account_type text,verification_status text);CREATE TABLE business_profiles(user_id uuid,verification_status text);CREATE TABLE auctions(id uuid,organiser_id uuid);INSERT INTO profiles VALUES('${id}','individual','verified');`);for(const f of ['0014_auction_client_preferences.sql','0017_auction_verified_business_eligibility.sql'])await db.exec(readFileSync(new URL('../../drizzle/migrations/'+f,import.meta.url),'utf8'));});
 afterAll(async()=>{await db.close();});
 it('rejects individual accounts even when identity is verified',async()=>{await expect(db.exec(`INSERT INTO auctions VALUES('${id}','${id}',null)`)).rejects.toThrow(/verified business/);});
 it('rejects the organiser preference for an unverified business',async()=>{await db.exec(`UPDATE profiles SET account_type='business',verification_status='pending' WHERE id='${id}'`);await expect(db.exec(`UPDATE profiles SET organises_auctions=true WHERE id='${id}'`)).rejects.toThrow(/verified business/);});
 it('allows a verified business account to enable navigation and create auctions',async()=>{await db.exec(`UPDATE profiles SET verification_status='verified',organises_auctions=true WHERE id='${id}';INSERT INTO auctions VALUES('${id}','${id}',null);`);const r=await db.query<{organises_auctions:boolean}>(`SELECT organises_auctions FROM profiles WHERE id='${id}'`);expect(r.rows[0]?.organises_auctions).toBe(true);expect((await db.query('SELECT * FROM auctions')).rows.length).toBe(1);});
});
