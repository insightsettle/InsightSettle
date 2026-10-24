import { describe, it, expect } from 'vitest';
import { auctionInspectionDeadline, countdown, lotCategory } from './auction-client';
describe('auction client deadlines',()=>{
 it('24 hour countdown expires at zero without extending the payment deadline',()=>{const now=Date.parse('2026-10-17T12:00:00Z');expect(countdown('2026-10-18T12:00:00Z',now)).toBe('24:00:00');expect(countdown('2026-10-17T11:00:00Z',now)).toBe('00:00:00');});
 it('awaiting payment is not inspection and only released/refunded lots are completed',()=>{expect(lotCategory('pending_funding')).toBe('awaiting');expect(lotCategory('delivered')).toBe('inspection');expect(lotCategory('held')).toBe('other');expect(lotCategory('released')).toBe('completed');});
 it('retains the 72-hour inspection deadline only during inspection, not after release',()=>{const deadline='2026-10-27T12:00:00Z';expect(auctionInspectionDeadline({status:'delivered',auto_release_at:deadline})).toBe(deadline);for(const status of ['released','completed','refunded','partially_refunded','cancelled']) expect(auctionInspectionDeadline({status,auto_release_at:deadline})).toBeNull();});
});
