import type { AdapterDefinition } from './types';
/** The existing simulated provider. Works in sandbox only; no network calls, no real money. */
export const simulatedAdapter: AdapterDefinition = {
  code: 'manual', implemented: true, credentialFields: [], baseUrls: { sandbox: ['internal://simulated'], production: [] },
  capabilities: { checkout: 'simulated', status: 'simulated', refund: 'simulated', payout: 'simulated', escrow: 'simulated' },
  async testConnection(_c, environment) {
    if (environment !== 'sandbox') return { ok: false, implemented: true, message: ['Production is locked.', 'بيئة الإنتاج مقفلة.'] };
    return { ok: true, implemented: true, message: ['Simulated provider reachable (internal, no external call).', 'المزوّد المحاكى متاح (داخلي، دون اتصال خارجي).'] };
  },
};
