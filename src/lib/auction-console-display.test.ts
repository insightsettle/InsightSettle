import {describe,it,expect} from 'vitest';
import {auctionDisputeOptions,nextBidderAction} from './auction-console-display';
describe('auction console existing flow',()=>{
 it('shows authenticity reason only for auction deals and uses existing quality issue flow',()=>{expect(auctionDisputeOptions('auction')[0]?.value).toBe('quality_issue');for(const t of ['goods','services','contracting','freelance'])expect(auctionDisputeOptions(t)).toEqual([]);});
 it('does not label a skipped backup as the next action',()=>{expect(nextBidderAction(1,[{rank:3,offered_at:'2026-10-17T12:00:00Z'}],false)).toEqual({kind:'unrecorded'});expect(nextBidderAction(1,[{rank:2,offered_at:'2026-10-17T12:00:00Z'}],false)).toEqual({kind:'offered',rank:2});});
 it('shows unsold after the third offer without inventing another bidder',()=>{expect(nextBidderAction(3,[],true)).toEqual({kind:'unsold'});});
});