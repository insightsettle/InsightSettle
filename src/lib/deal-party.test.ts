import { describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  deal: { id: 'deal', buyer_id: 'buyer', seller_id: 'owner', deal_type: 'auction', auction_lot_id: 'lot', status: 'held', shipping_status: 'preparing', terms_version: 1, created_by: 'buyer', frozen: false },
  writes: [] as { table: string; value: Record<string, unknown> }[],
}));

vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (handler: unknown) => handler };
  return chain;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: (table: string) => {
  const result = () => ({ data: table === 'deals' ? fixture.deal : table === 'auction_lots' ? { auction_id: 'auction' } : table === 'auctions' ? { organiser_id: 'organiser' } : [{ id: 'terms' }], error: null });
  const q = { select: () => q, eq: () => q, is: () => q, maybeSingle: async () => result(), single: async () => result(),
    update: (value: Record<string, unknown>) => { fixture.writes.push({ table, value }); return q; },
    insert: async (value: Record<string, unknown>) => { fixture.writes.push({ table, value }); return {}; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve) };
  return q;
} } }));
vi.mock('@/lib/notify.server', () => ({ notifyDealParties: async () => {} }));
vi.mock('@/lib/deal-rules.server', () => ({ latestTerms: async () => ({ id: 'terms', version: 1, created_by: 'buyer', accepted_at: null }), supplierPayoutOk: async () => true }));

import { acceptTerms, updateShipping } from './deal-party.functions';
type Handler = (args: { data: { dealId: string; carrier?: string; tracking?: string; status?: string }; context: { userId: string } }) => Promise<{ ok: boolean }>;
const ship = updateShipping as unknown as Handler;
const terms = acceptTerms as unknown as Handler;
const args = (userId: string) => ({ data: { dealId: 'deal', carrier: '', tracking: 'FICTIONAL-T22-TRACKING', status: 'shipped' }, context: { userId } });

describe('party shipping and terms authorization', () => {
  it('reserves auction shipping for organiser, terms for real seller, and preserves goods behavior', async () => {
    fixture.writes.length = 0;
    fixture.deal.deal_type = 'auction'; fixture.deal.status = 'held';
    await expect(ship(args('organiser'))).resolves.toEqual({ ok: true });
    expect(fixture.writes[0]).toEqual({ table: 'deals', value: expect.objectContaining({ shipping_tracking: 'FICTIONAL-T22-TRACKING', shipping_status: 'shipped' }) });
    fixture.writes.length = 0;
    await expect(ship(args('owner'))).rejects.toThrow('You are not a party');
    expect(fixture.writes).toHaveLength(0);
    fixture.deal.status = 'pending_funding';
    await expect(terms(args('owner'))).resolves.toEqual({ ok: true });
    fixture.writes.length = 0;
    await expect(terms(args('organiser'))).rejects.toThrow('You are not a party');
    expect(fixture.writes).toHaveLength(0);
    fixture.deal.deal_type = 'goods'; fixture.deal.status = 'held';
    await expect(ship(args('owner'))).resolves.toEqual({ ok: true });
    await expect(ship(args('organiser'))).rejects.toThrow('You are not a party');
    await expect(ship(args('buyer'))).rejects.toThrow('Only the seller');
    fixture.deal.status = 'pending_funding';
    await expect(terms(args('owner'))).resolves.toEqual({ ok: true });
    await expect(terms(args('organiser'))).rejects.toThrow('You are not a party');
    await expect(terms(args('buyer'))).rejects.toThrow('The other party must accept');
  });
});