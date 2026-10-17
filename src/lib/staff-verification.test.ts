import { describe, it, expect } from 'vitest';
import { verifyMemberRecord } from './staff-verification.server';
function fixture(identity = 'verified', business = 'business') {
 const writes: any[] = []; const db = { from: (table: string) => {
  const q: any = { select: () => q, eq: () => q, single: async () => ({data: table === 'profiles' ? {verification_status:identity,account_type:business} : {verified:false,verification_status:'pending'}}), update: (value: any) => {writes.push({table,value}); return q;}, insert: async (value: any) => {writes.push({table,value}); return {};}, then: (resolve: any) => resolve({}) }; return q;
 }}; return {db,writes};
}
describe('staff business/payout verification', () => {
 it('verifies business with staff actor and time in history',async()=>{const {db,writes}=fixture();await verifyMemberRecord(db,'staff','member','business',false);expect(writes[0]).toEqual({table:'business_profiles',value:{verification_status:'verified'}});expect(writes[1].value.user_id).toBe('staff');expect(writes[1].value.action).toBe('verify_business_profile');expect(Number.isFinite(Date.parse(writes[1].value.created_at))).toBe(true);});
 it('verifies payout only with simulated provider and logs that check',async()=>{const {db,writes}=fixture();await verifyMemberRecord(db,'staff','member','payout',true);expect(writes[0]).toEqual({table:'payout_accounts',value:{verified:true}});expect(writes[1].value.new_value.provider_check).toBe('simulated');expect(writes[1].value.user_id).toBe('staff');});
 it('refuses unverified identity without mutation',async()=>{const {db,writes}=fixture('pending');await expect(verifyMemberRecord(db,'staff','member','business',false)).rejects.toThrow('Approve identity first');expect(writes).toHaveLength(0);});
 it('cannot substitute simulation for a live provider check',async()=>{const {db,writes}=fixture();await expect(verifyMemberRecord(db,'staff','member','payout',false)).rejects.toThrow('Live payout');expect(writes).toHaveLength(0);});
});