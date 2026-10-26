/**
 * Multi-provider routing (sandbox). One deal = one provider, from pay-in to payout.
 * The route is chosen once per deal before funding and must serve BOTH legs with the same provider.
 * Price book rows and routing rules are versioned; edits are maker-checker proposals in finance_records.
 * All amounts here are SAR-equivalent numbers, matching checkMethod (D-66); fixed fees and caps are in the row currency,
 * which is SAR for every priced row today.
 */
import { providers } from './providers';

export const ROUTE_METHODS = ['mada', 'credit_card', 'bank_transfer', 'benefit_debit', 'benefitpay', 'apple_pay'] as const;
export type RouteMethod = (typeof ROUTE_METHODS)[number];
export type PriceSource = 'verbal' | 'written' | 'contract' | 'reference';
export type DealKind = 'goods' | 'services' | 'contracting' | 'freelance' | 'auction';

export type PriceRow = {
  provider: string; method: RouteMethod; country: string; currency: string;
  /** null = awaiting quote (no price known). */
  percent: number | null; fixed: number; cap: number | null; maxPerPayment: number | null;
  /** null = open / not stated. */
  maxHoldDays: number | null; validFrom: string; source: PriceSource; evidence: string;
  /** false = provider stated it does not offer this method. */
  offered?: boolean;
};

/** Payout corridors each provider can pay out to (stated or assumed for sandbox; never verified). */
export const PAYOUT_CORRIDORS: Record<string, { countries: string[]; currencies: string[] }> = {
  manual: { countries: ['SA', 'BH', 'AE', 'KW', 'OM', 'QA', 'OTHER'], currencies: ['SAR', 'BHD', 'AED', 'KWD', 'OMR', 'QAR', 'USD'] },
  lite: { countries: ['SA'], currencies: ['SAR'] },
  geidea: { countries: ['SA'], currencies: ['SAR'] },
  tap: { countries: ['SA'], currencies: ['SAR'] },
  afs: { countries: ['BH', 'AE', 'KW', 'OM', 'QA'], currencies: ['BHD', 'AED', 'KWD', 'OMR', 'QAR', 'USD', 'SAR'] },
};

const V = '2026-10-26';
const SIM = (method: RouteMethod, percent: number, fixed: number): PriceRow[] =>
  ['SA', 'BH', 'AE', 'KW', 'OM', 'QA', 'OTHER'].flatMap(country => ['SAR', 'BHD', 'AED', 'KWD', 'OMR', 'QAR', 'USD'].map(currency => ({
    provider: 'manual', method, country, currency, percent, fixed, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V,
    source: 'reference' as const, evidence: 'Simulated provider: same values as the previous single PROVIDER_COST so the demo is unchanged.',
  })));

export const SEED_PRICE_BOOK: PriceRow[] = [
  { provider: 'lite', method: 'mada', country: 'SA', currency: 'SAR', percent: 0.85, fixed: 0, cap: 200, maxPerPayment: null, maxHoldDays: 14, validFrom: V, source: 'verbal', evidence: 'lite sales, verbal; awaiting written quote.' },
  { provider: 'lite', method: 'credit_card', country: 'SA', currency: 'SAR', percent: 2.25, fixed: 0, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V, source: 'verbal', evidence: 'lite sales, verbal; hold period open.' },
  { provider: 'lite', method: 'bank_transfer', country: 'SA', currency: 'SAR', percent: 0, fixed: 0, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V, source: 'verbal', evidence: 'lite sales, verbal; via wallet.' },
  { provider: 'geidea', method: 'mada', country: 'SA', currency: 'SAR', percent: 0.9, fixed: 0, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V, source: 'written', evidence: 'Geidea sales, written.' },
  { provider: 'geidea', method: 'credit_card', country: 'SA', currency: 'SAR', percent: 2.4, fixed: 1, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V, source: 'written', evidence: 'Geidea sales, written.' },
  { provider: 'tap', method: 'mada', country: 'SA', currency: 'SAR', percent: 1.75, fixed: 1, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V, source: 'reference', evidence: 'Tap reference prices (former PROVIDER_COST).' },
  { provider: 'tap', method: 'credit_card', country: 'SA', currency: 'SAR', percent: 2.75, fixed: 1, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V, source: 'reference', evidence: 'Tap reference prices (former PROVIDER_COST).' },
  { provider: 'tap', method: 'bank_transfer', country: 'SA', currency: 'SAR', percent: null, fixed: 0, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V, source: 'reference', evidence: 'Not offered (stated by Tap).', offered: false },
  ...(['mada', 'credit_card', 'bank_transfer'] as const).flatMap(method => ['BH', 'AE', 'KW', 'OM', 'QA'].map(country => ({
    provider: 'afs', method, country, currency: country === 'BH' ? 'BHD' : ({ AE: 'AED', KW: 'KWD', OM: 'OMR', QA: 'QAR' } as Record<string, string>)[country]!,
    percent: null, fixed: 0, cap: null, maxPerPayment: null, maxHoldDays: null, validFrom: V, source: 'reference' as const, evidence: 'AFS: awaiting quote and specifications.',
  }))),
  ...SIM('bank_transfer', 0, 10), ...SIM('mada', 1.75, 1), ...SIM('credit_card', 2.75, 1),
];

export type RouteRule = {
  id: string; priority: number; enabled: boolean;
  dealType?: DealKind | 'any'; payerCountry?: string; payInCurrency?: string; method?: RouteMethod | 'any';
  payeeCountry?: string; payoutCurrency?: string; minAmount?: number | null; maxAmount?: number | null; maxHoldingDays?: number | null;
  /** 'not_SA' matches anything outside Saudi Arabia; 'not_SAR' any currency other than SAR. */
  outsideSaudi?: boolean;
  action: { provider: string } | { strategy: 'cheapest' };
};
export type RoutingTable = { version: string; rules: RouteRule[] };

export const SEED_ROUTING: RoutingTable = {
  version: 'seed-1',
  rules: [
    { id: 'R1', priority: 10, enabled: true, payerCountry: 'SA', payeeCountry: 'SA', payInCurrency: 'SAR', payoutCurrency: 'SAR', method: 'mada', action: { provider: 'lite' } },
    { id: 'R2', priority: 20, enabled: true, payerCountry: 'SA', payeeCountry: 'SA', payInCurrency: 'SAR', payoutCurrency: 'SAR', method: 'credit_card', action: { strategy: 'cheapest' } },
    { id: 'R3', priority: 30, enabled: true, payerCountry: 'SA', payeeCountry: 'SA', payInCurrency: 'SAR', payoutCurrency: 'SAR', method: 'bank_transfer', action: { provider: 'lite' } },
    { id: 'R4', priority: 40, enabled: true, outsideSaudi: true, action: { provider: 'afs' } },
    { id: 'R5', priority: 1000, enabled: true, action: { provider: 'manual' } },
  ],
};

export type RouteInput = {
  dealType: DealKind; payerCountry: string; payInCurrency: string; method: RouteMethod;
  payeeCountry: string; payoutCurrency: string; amountSar: number; holdingDays: number;
};
export type Rejection = { provider: string; reasons: string[] };
export type RouteResult = {
  provider: string | null; ruleId: string | null; version: string; costSar: number | null;
  reasons: string[]; rejected: Rejection[]; unverified: boolean; priceSource: PriceSource | null;
};

/** Provider cost in SAR for one payment, applying the per-transaction cap. null = price unknown. */
export function rowCost(row: PriceRow, amountSar: number): number | null {
  if (row.percent == null || row.offered === false) return null;
  const raw = (amountSar * row.percent) / 100 + row.fixed;
  const capped = row.cap != null ? Math.min(raw, row.cap) : raw;
  return Math.round(capped * 100) / 100;
}

function priceRow(book: PriceRow[], provider: string, i: RouteInput) {
  const rows = book.filter(r => r.provider === provider && r.method === i.method && r.currency === i.payInCurrency && (r.country === i.payerCountry || r.country === 'OTHER' && !['SA', 'BH', 'AE', 'KW', 'OM', 'QA'].includes(i.payerCountry)));
  return rows.sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] ?? null;
}

/** Why this provider cannot serve both legs of this deal ([] = eligible). */
export function eligibility(book: PriceRow[], provider: string, i: RouteInput): { reasons: string[]; row: PriceRow | null; unverified: boolean } {
  const reasons: string[] = [];
  const p = providers.find(x => x.id === provider);
  if (!p) return { reasons: ['unknown_provider'], row: null, unverified: false };
  const row = priceRow(book, provider, i);
  if (!row) reasons.push('payin_method_country_currency_not_supported');
  else if (row.offered === false) reasons.push('method_not_offered');
  else if (row.percent == null) reasons.push('awaiting_quote');
  const corridor = PAYOUT_CORRIDORS[provider];
  if (!corridor || !corridor.countries.includes(i.payeeCountry) || !corridor.currencies.includes(i.payoutCurrency)) reasons.push('payout_corridor_not_supported');
  if (row?.maxHoldDays != null && row.maxHoldDays < i.holdingDays) reasons.push('holding_days_exceed_provider_max');
  if (row?.maxPerPayment != null && i.amountSar > row.maxPerPayment) reasons.push('amount_above_provider_max');
  if (p.capabilities.checkout === 'unavailable' || p.capabilities.payout === 'unavailable') reasons.push('capability_unavailable');
  const unverified = p.state !== 'simulated';
  return { reasons, row, unverified };
}

function matches(r: RouteRule, i: RouteInput) {
  const eq = (cond: string | undefined, v: string) => !cond || cond === 'any' || cond === v;
  if (!r.enabled) return false;
  if (r.outsideSaudi && i.payerCountry === 'SA' && i.payeeCountry === 'SA' && i.payInCurrency === 'SAR' && i.payoutCurrency === 'SAR') return false;
  if (r.minAmount != null && i.amountSar < r.minAmount) return false;
  if (r.maxAmount != null && i.amountSar > r.maxAmount) return false;
  if (r.maxHoldingDays != null && i.holdingDays > r.maxHoldingDays) return false;
  return eq(r.dealType, i.dealType) && eq(r.payerCountry, i.payerCountry) && eq(r.payInCurrency, i.payInCurrency) && eq(r.method, i.method) && eq(r.payeeCountry, i.payeeCountry) && eq(r.payoutCurrency, i.payoutCurrency);
}

/**
 * Picks ONE provider for both legs. Rules are tried in priority order; if the matched rule's provider is not eligible,
 * the next matching rule is tried. Legs are never split: a provider must pass pay-in AND payout checks itself.
 * `locked` = provider already recorded on a funded deal; it is the only candidate (rule changes never re-route).
 */
export function resolveRoute(book: PriceRow[], table: RoutingTable, i: RouteInput, locked?: { provider: string; version: string } | null): RouteResult {
  const rejected: Rejection[] = [];
  const pick = (provider: string, ruleId: string | null, version: string, extra: string[]): RouteResult | null => {
    const e = eligibility(book, provider, i);
    if (e.reasons.length) { rejected.push({ provider, reasons: e.reasons }); return null; }
    return { provider, ruleId, version, costSar: rowCost(e.row!, i.amountSar), reasons: extra, rejected, unverified: e.unverified, priceSource: e.row!.source };
  };
  if (locked) return pick(locked.provider, null, locked.version, ['locked_on_funded_deal']) ?? { provider: null, ruleId: null, version: locked.version, costSar: null, reasons: ['locked_provider_cannot_serve'], rejected, unverified: false, priceSource: null };
  for (const r of [...table.rules].sort((a, b) => a.priority - b.priority)) {
    if (!matches(r, i)) continue;
    if ('provider' in r.action) {
      const got = pick(r.action.provider, r.id, table.version, [`rule_${r.id}`]);
      if (got) return got;
      continue;
    }
    const candidates = providers.map(p => p.id).filter(id => id !== 'manual');
    let best: RouteResult | null = null;
    for (const id of candidates) {
      const got = pick(id, r.id, table.version, [`rule_${r.id}`, 'cheapest_eligible']);
      if (got && (best == null || (got.costSar ?? Infinity) < (best.costSar ?? Infinity))) best = got;
    }
    if (best) return { ...best, rejected };
  }
  return { provider: null, ruleId: null, version: table.version, costSar: null, reasons: ['no_route'], rejected, unverified: false, priceSource: null };
}

/** Days the provider would hold the money: inspection, plus the defects period when retention is held. */
export function holdingDaysFor(deal: { inspection_days?: number | null; retention_percent?: number | string | null; defects_liability_days?: number | null }, deliveryDays = 0) {
  const retention = Number(deal.retention_percent ?? 0) > 0 ? Number(deal.defects_liability_days ?? 0) : 0;
  return deliveryDays + Number(deal.inspection_days ?? 0) + retention;
}

/** Effective configuration = seed overlaid by approved proposals (newest approved wins). */
export function effectiveConfig(records: { id: string; kind: string; subject_id: string; payload: any; created_at: string }[]) {
  const approved = new Set(records.filter(r => r.kind === 'approval').map(r => r.subject_id));
  const ok = records.filter(r => approved.has(r.id)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  let book = [...SEED_PRICE_BOOK];
  let table = SEED_ROUTING;
  for (const r of ok) {
    if (r.kind === 'price_book_proposal' && r.payload?.row) {
      const row = r.payload.row as PriceRow;
      book = [...book.filter(b => !(b.provider === row.provider && b.method === row.method && b.country === row.country && b.currency === row.currency)), row];
    }
    if (r.kind === 'routing_table_proposal' && r.payload?.table) table = { ...(r.payload.table as RoutingTable), version: `v-${r.id.slice(0, 8)}` };
  }
  return { book, table };
}
