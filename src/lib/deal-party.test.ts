import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind } from 'typescript';
import { z } from 'zod';

const fixture = {
  deal: { id: 'deal', buyer_id: 'buyer', seller_id: 'owner', deal_type: 'auction', auction_lot_id: 'lot', status: 'held', shipping_status: 'preparing', terms_version: 1, created_by: 'buyer', frozen: false },
  writes: [] as { table: string; value: Record<string, unknown> }[],
};

const createServerFn = () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (handler: unknown) => handler };
  return chain;
};
const supabaseAdmin = { from: (table: string) => {
  const result = () => ({ data: table === 'deals' ? fixture.deal : table === 'auction_lots' ? { auction_id: 'auction' } : table === 'auctions' ? { organiser_id: 'organiser' } : [{ id: 'terms' }], error: null });
  const q = { select: () => q, eq: () => q, is: () => q, maybeSingle: async () => result(), single: async () => result(),
    update: (value: Record<string, unknown>) => { fixture.writes.push({ table, value }); return q; },
    insert: async (value: Record<string, unknown>) => { fixture.writes.push({ table, value }); return {}; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve) };
  return q;
} };
const dependencies: Record<string, unknown> = {
  '@/integrations/supabase/client.server': { supabaseAdmin },
  '@/lib/notify.server': { notifyDealParties: async () => {} },
  '@/lib/deal-rules.server': { latestTerms: async () => ({ id: 'terms', version: 1, created_by: 'buyer', accepted_at: null }), supplierPayoutOk: async () => true },
};

// Execute the real source with in-memory dependencies, outside Vite's RPC transform.
const source = readFileSync(new URL('./deal-party.functions.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/\bimport\(/g, 'importDependency(');
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
const handlers = {} as Record<string, unknown>;
new Function('exports', 'createServerFn', 'z', 'requireSupabaseAuth', 'importDependency', compiled)(handlers, createServerFn, z, {}, async (name: string) => dependencies[name]);
type Handler = (args: { data: { dealId: string; carrier?: string; tracking?: string; status?: string }; context: { userId: string } }) => Promise<{ ok: boolean }>;
const ship = handlers.updateShipping as Handler;
const terms = handlers.acceptTerms as Handler;
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