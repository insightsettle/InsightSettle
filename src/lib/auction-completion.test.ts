import { describe, it, expect } from 'vitest';
import { auctionCompletionState } from './auction-completion';
describe('auction completion eligibility', () => {
  it('lets only organiser ship held lots', () => { expect(auctionCompletionState({status:'held'},false,true,0).ship).toBe(true); expect(auctionCompletionState({status:'held'},false,false,0).ship).toBe(false); });
  it('lets the winner accept only during the 72 hour inspection', () => {
    const start = Date.UTC(2026,9,17); const d = {status:'delivered',auto_release_at:new Date(start+72*3600000).toISOString()};
    expect(auctionCompletionState(d,true,false,start+71*3600000).accept).toBe(true);
    expect(auctionCompletionState(d,true,false,start+72*3600000).accept).toBe(false);
    expect(auctionCompletionState(d,false,true,start).accept).toBe(false);
  });
});