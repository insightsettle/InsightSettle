import type { Capability } from '../providers';
export type CredentialField = { key: string; labelEn: string; labelAr: string; secret: boolean };
export type ConnectionResult = { ok: boolean; implemented: boolean; message: readonly [en: string, ar: string] };
/** One adapter per provider. Real calls are only made by implemented adapters; stubs never fake success. */
export interface AdapterDefinition {
  code: string;
  implemented: boolean;
  credentialFields: CredentialField[];
  /** Known base URLs from official documentation; empty until documentation is received. */
  baseUrls: { sandbox: string[]; production: string[] };
  capabilities: Partial<Record<Capability, 'simulated' | 'unverified' | 'unavailable' | 'pending_approval'>>;
  testConnection(credentials: Record<string, string>, environment: 'sandbox' | 'production'): Promise<ConnectionResult>;
}
export class AdapterNotImplementedError extends Error {
  constructor(code: string) { super(`Adapter not built yet for ${code}: waiting for the provider's official API documentation`); }
}
export const STANDARD_FIELDS: CredentialField[] = [
  { key: 'merchant_id', labelEn: 'Merchant / account ID', labelAr: 'معرّف التاجر / الحساب', secret: false },
  { key: 'public_key', labelEn: 'Public key', labelAr: 'المفتاح العام', secret: false },
  { key: 'secret_key', labelEn: 'Secret API key', labelAr: 'مفتاح الواجهة السري', secret: true },
  { key: 'webhook_secret', labelEn: 'Webhook signing secret', labelAr: 'سر توقيع الإشعارات', secret: true },
];
export const NOT_BUILT = ['Adapter not built yet: waiting for the provider\'s official API documentation.', 'لم يُبنَ المحوّل بعد: بانتظار وثائق الواجهة الرسمية من المزوّد.'] as const;
/** Builds a stub: declares fields, everything unverified, real calls throw. */
export function stubAdapter(code: string): AdapterDefinition {
  return {
    code, implemented: false, credentialFields: STANDARD_FIELDS, baseUrls: { sandbox: [], production: [] },
    capabilities: { checkout: 'unverified', status: 'unverified', refund: 'unverified', payout: 'unverified', webhooks: 'unverified', escrow: 'pending_approval' },
    async testConnection() { return { ok: false, implemented: false, message: NOT_BUILT }; },
  };
}
