export const capabilities = ['checkout', 'status', 'capture', 'void', 'refund', 'payout', 'settlements', 'balance', 'webhooks', 'escrow'] as const;
export type Capability = typeof capabilities[number];
export type Provider = { id: string; name: string; state: 'simulated' | 'not_connected'; countries: string[]; currencies: string[]; methods: string[]; evidence: readonly [string, string]; capabilities: Record<Capability, 'simulated' | 'unverified' | 'unavailable' | 'pending_approval'> };
const unknown = Object.fromEntries(capabilities.map(c => [c, c === 'escrow' ? 'pending_approval' : 'unverified'])) as Provider['capabilities'];
export const providers: Provider[] = [
  { id: 'manual', name: 'Insight Sandbox', state: 'simulated', countries: ['SA','BH','AE','KW','OM','QA'], currencies: ['SAR','BHD','AED','KWD','OMR','QAR','USD'], methods: ['bank_transfer','mada','credit_card'], evidence: ['Existing simulated deal workflow; no real money.', 'مسار الصفقات المحاكى الحالي؛ لا أموال حقيقية.'], capabilities: { checkout:'simulated', status:'simulated', capture:'unavailable', void:'unavailable', refund:'simulated', payout:'simulated', settlements:'unavailable', balance:'unavailable', webhooks:'unavailable', escrow:'simulated' } },
  { id: 'afs', name: 'AFS · Arab Financial Services', state: 'not_connected', countries: [], currencies: [], methods: [], evidence: ['Bahrain candidate; specifications and capabilities unverified.', 'مرشح في البحرين؛ المواصفات والقدرات غير متحققة.'], capabilities: { ...unknown } },
  { id: 'tap', name: 'Tap Payments', state: 'not_connected', countries: ['SA'], currencies: ['SAR'], methods: ['mada','credit_card'], evidence: ['Support statement: SAR only, KSA payouts only; no bank transfer or SADAD. API capabilities unverified.', 'إفادة الدعم: الريال فقط والصرف داخل السعودية؛ لا تحويل بنكي أو سداد. قدرات الواجهة غير متحققة.'], capabilities: { ...unknown } },
  { id: 'lite', name: 'lite', state: 'not_connected', countries: ['SA'], currencies: ['SAR'], methods: ['mada','credit_card','bank_transfer'], evidence: ['Verbal sales quote, awaiting writing: mada 0.85%, cap SAR 200, 14-day hold; cards 2.25%; wallet bank transfer 0%. KSA only.', 'عرض شفهي بانتظار توثيقه: مدى 0.85% بسقف 200 ريال وحجز 14 يوماً؛ البطاقات 2.25%؛ تحويل عبر محفظة 0%. السعودية فقط.'], capabilities: { ...unknown } },
  { id: 'geidea', name: 'Geidea', state: 'not_connected', countries: ['SA'], currencies: ['SAR'], methods: ['mada','credit_card'], evidence: ['Written sales quote: mada 0.90%; cards 2.40% + SAR 1. API capabilities unverified.', 'عرض مبيعات مكتوب: مدى 0.90%؛ البطاقات 2.40% + ريال. قدرات الواجهة غير متحققة.'], capabilities: { ...unknown } },
];
export const liveFlags = Object.freeze({ payments: false, refunds: false, payouts: false, escrow: false });
export function requireCapability(providerId: string, capability: Capability, environment: string) {
  const provider = providers.find(p => p.id === providerId);
  if (environment !== 'sandbox' || !provider || provider.state !== 'simulated' || provider.capabilities[capability] !== 'simulated') throw new Error('Operation disabled or capability unverified');
  return provider;
}
export interface ProviderAdapter {
  providerId: string;
  retrieveStatus(transaction: { status: string; provider: string }): Promise<{ status: string; authoritative: false; environment: 'sandbox' }>;
}
export const simulatedAdapter: ProviderAdapter = {
  providerId: 'manual',
  async retrieveStatus(transaction) {
    requireCapability(transaction.provider, 'status', 'sandbox');
    return { status: transaction.status, authoritative: false, environment: 'sandbox' };
  },
};