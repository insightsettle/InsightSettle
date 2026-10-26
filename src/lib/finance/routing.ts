import { minor } from './money';
import { providers, requireCapability } from './providers';
export type RoutingRule = { provider: string; country: string; currency: string; method: string; maxAmount: string; enabled: boolean; version: string };
export function simulateRouting(rule: RoutingRule, input: { country: string; currency: string; method: string; amount: string; previousOutcome: 'none' | 'failed_safe' | 'unknown' | 'succeeded' }) {
  const reasons: string[] = [];
  if (input.previousOutcome === 'unknown' || input.previousOutcome === 'succeeded') reasons.push('previous_outcome_blocks_retry');
  if (!rule.enabled) reasons.push('rule_disabled');
  const p = providers.find(p => p.id === rule.provider);
  try { requireCapability(rule.provider, 'checkout', 'sandbox'); } catch { reasons.push('provider_not_connected'); }
  if (rule.country !== input.country || !p?.countries.includes(input.country)) reasons.push('country_mismatch');
  if (rule.currency !== input.currency || !p?.currencies.includes(input.currency)) reasons.push('currency_mismatch');
  if (rule.method !== input.method || !p?.methods.includes(input.method)) reasons.push('method_mismatch');
  if (minor(input.amount, input.currency) <= 0n || minor(input.amount, input.currency) > minor(rule.maxAmount, input.currency)) reasons.push('amount_limit');
  return { eligible: reasons.length === 0, provider: reasons.length ? null : rule.provider, reasons, version: rule.version, environment: 'sandbox' as const, executesPayment: false };
}