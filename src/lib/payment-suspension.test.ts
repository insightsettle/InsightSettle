import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind } from 'typescript';
import { z } from 'zod';

it('suspended funding stops before any quote is consumed in whole-deal and per-milestone modes', async () => {
  let mode = 'upfront';
  let state = 'suspended';
  let frozen = false;
  let deadline: string | null = null;
  const accessed: string[] = [];
  const db = { from(table: string) {
    accessed.push(table);
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ error: null, data: table === 'profiles' ? { account_state: state } : { buyer_id: 'buyer', seller_id: 'seller', funding_mode: mode, status: 'pending_funding', frozen, payment_deadline_at: deadline } }) };
    return q;
  } };
  const createServerFn = () => {
    const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
    return chain;
  };
  const source = readFileSync(new URL('./payments.functions.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/\bimport\(/g, 'importDependency(');
  const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
  const handlers: Record<string, unknown> = {};
  new Function('exports', 'createServerFn', 'z', 'requireSupabaseAuth', 'importDependency', compiled)(handlers, createServerFn, z, {}, async (name: string) => name.endsWith('client.server') ? { supabaseAdmin: db } : name.endsWith('payment-provider.server') ? { getPaymentProvider: () => ({ id: 'demo', label: 'Demo' }) } : {});
  const fund = handlers.startDealFunding as (args: unknown) => Promise<{ ok: boolean; message: string }>;
  for (mode of ['upfront', 'per_milestone']) {
    accessed.length = 0;
    const result = await fund({ data: { dealId: 'deal', quoteId: 'unused' }, context: { userId: 'buyer', supabase: db } });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('suspended');
    expect(accessed).toEqual(['deals', 'profiles']);
  }
  state = 'active'; frozen = true; accessed.length = 0;
  expect((await fund({data:{dealId:'deal'},context:{userId:'buyer',supabase:db}})).message).toContain('frozen');
  expect(accessed).toEqual(['deals','profiles']);
  frozen = false; deadline = '2020-01-01T00:00:00Z'; accessed.length = 0;
  expect((await fund({data:{dealId:'deal'},context:{userId:'buyer',supabase:db}})).message).toContain('deadline');
  expect(accessed).toEqual(['deals','profiles']);
});