/**
 * Provider management (sandbox). Browser-safe, pure.
 * Effective provider configuration = seed overlaid by APPROVED proposals in finance_records (maker-checker).
 * Internal codes never change; display names, jobs, limits and status do.
 */
export const JOB_METHODS = ['mada', 'credit_card', 'bank_transfer', 'apple_pay', 'benefit_debit', 'benefitpay'] as const;
export type JobMethod = (typeof JOB_METHODS)[number];
export type ProviderStatus = 'simulated' | 'not_connected' | 'sandbox_connected' | 'disabled' | 'archived';
export type PayinJob = { on: boolean; countries: string[]; currencies: string[]; minAmount: number | null; maxAmount: number | null; maxHoldDays: number | null; note?: string };
export type ProviderJobs = {
  payin: Record<JobMethod, PayinJob>;
  payout: { on: boolean; countries: string[]; currencies: string[] };
  refunds: { full: boolean; partial: boolean };
  /** Conditional release stays pending approval until a licensed arrangement is confirmed. */
  holding: 'simulated' | 'pending_approval';
  splitPayouts: boolean; milestones: boolean;
};
export type ProviderLimits = { maxPerPayment: number | null; dailyLimit: number | null; settlementDays: number | null; maxHoldDays: Partial<Record<JobMethod, number | null>> };
export type ProviderConfig = {
  code: string; nameEn: string; nameAr: string; adapter: string; country: string; status: ProviderStatus;
  contact: string; notes: string; priceSource: string; jobs: ProviderJobs; limits: ProviderLimits;
};

const GCC = ['SA', 'BH', 'AE', 'KW', 'OM', 'QA'];
const GCC_CUR = ['SAR', 'BHD', 'AED', 'KWD', 'OMR', 'QAR'];
const off = (note?: string): PayinJob => ({ on: false, countries: [], currencies: [], minAmount: null, maxAmount: null, maxHoldDays: null, ...(note ? { note } : {}) });
const sa = (on: boolean, maxHoldDays: number | null = null): PayinJob => ({ on, countries: ['SA'], currencies: ['SAR'], minAmount: null, maxAmount: null, maxHoldDays });
const allOff = (note?: string) => Object.fromEntries(JOB_METHODS.map(m => [m, off(note)])) as Record<JobMethod, PayinJob>;
const noLimits: ProviderLimits = { maxPerPayment: null, dailyLimit: null, settlementDays: null, maxHoldDays: {} };
const candidateJobs = (payin: Record<JobMethod, PayinJob>, payout: string[], cur: string[], payoutOn = true): ProviderJobs => ({
  payin, payout: { on: payoutOn, countries: payout, currencies: cur }, refunds: { full: false, partial: false }, holding: 'pending_approval', splitPayouts: false, milestones: false,
});

export const SEED_PROVIDERS: ProviderConfig[] = [
  { code: 'manual', nameEn: 'Insight Sandbox (simulated)', nameAr: 'بيئة إنسايت التجريبية (محاكاة)', adapter: 'simulated', country: 'SA', status: 'simulated', contact: '', notes: 'Demo fallback. No real money.', priceSource: 'reference',
    jobs: { payin: Object.fromEntries(JOB_METHODS.map(m => [m, { on: true, countries: [...GCC, 'OTHER'], currencies: [...GCC_CUR, 'USD'], minAmount: null, maxAmount: null, maxHoldDays: null }])) as Record<JobMethod, PayinJob>,
      payout: { on: true, countries: [...GCC, 'OTHER'], currencies: [...GCC_CUR, 'USD'] }, refunds: { full: true, partial: true }, holding: 'simulated', splitPayouts: true, milestones: true }, limits: noLimits },
  { code: 'lite', nameEn: 'lite', nameAr: 'لايت', adapter: 'lite', country: 'SA', status: 'not_connected', contact: '', notes: 'Founder: mada only for now; cards may be enabled if the card price improves.', priceSource: 'verbal',
    jobs: candidateJobs({ ...allOff(), mada: sa(true, 14), credit_card: { ...sa(false), note: 'Off by founder decision' }, bank_transfer: sa(true) }, ['SA'], ['SAR']), limits: { ...noLimits, maxHoldDays: { mada: 14 } } },
  { code: 'geidea', nameEn: 'Geidea', nameAr: 'جيديا', adapter: 'geidea', country: 'SA', status: 'not_connected', contact: '', notes: '', priceSource: 'written',
    jobs: candidateJobs({ ...allOff(), credit_card: sa(true), mada: sa(false) }, ['SA'], ['SAR']), limits: noLimits },
  { code: 'tap', nameEn: 'Tap Payments', nameAr: 'تاب', adapter: 'tap', country: 'SA', status: 'not_connected', contact: '', notes: 'Candidate; waiting for the integration meeting.', priceSource: 'reference',
    jobs: candidateJobs(allOff('Waiting for integration meeting'), ['SA'], ['SAR'], false), limits: noLimits },
  { code: 'afs', nameEn: 'AFS · Arab Financial Services', nameAr: 'الخدمات المالية العربية (AFS)', adapter: 'afs', country: 'BH', status: 'not_connected', contact: '', notes: 'Bahrain and GCC candidate.', priceSource: 'awaiting quote',
    jobs: candidateJobs(allOff('Awaiting quote'), GCC.filter(c => c !== 'SA'), GCC_CUR.filter(c => c !== 'SAR'), false), limits: noLimits },
];

export type FinanceRecordLike = { id: string; kind: string; subject_id: string; payload: any; created_at: string; actor_id?: string; reason?: string };

export function decisions(records: FinanceRecordLike[]) {
  const approved = new Set(records.filter(r => r.kind === 'approval').map(r => r.subject_id));
  const rejected = new Set(records.filter(r => r.kind === 'rejection').map(r => r.subject_id));
  return { approved, rejected };
}

/** Applies approved provider proposals in order. Codes never change; unknown codes need `create`. */
export function effectiveProviders(records: FinanceRecordLike[]): ProviderConfig[] {
  const { approved } = decisions(records);
  const list = SEED_PROVIDERS.map(p => structuredClone(p));
  for (const r of records.filter(x => approved.has(x.id)).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const code = r.payload?.provider as string | undefined;
    if (!code) continue;
    let p = list.find(x => x.code === code);
    if (r.kind === 'provider_profile_proposal') {
      const prof = r.payload.profile ?? {};
      if (!p && r.payload.create) {
        p = { code, nameEn: prof.nameEn ?? code, nameAr: prof.nameAr ?? code, adapter: prof.adapter ?? 'generic', country: prof.country ?? 'SA', status: 'not_connected', contact: '', notes: '', priceSource: 'awaiting quote', jobs: candidateJobs(allOff('Not assigned'), [], [], false), limits: noLimits };
        list.push(p);
      }
      if (p) {
        const { code: _ignored, adapter: _a, ...rest } = prof;
        Object.assign(p, rest);
        if (p.code === 'manual' && rest.status && rest.status !== 'simulated' && rest.status !== 'disabled') p.status = 'simulated';
      }
    }
    if (p && r.kind === 'provider_jobs_proposal' && r.payload.jobs) p.jobs = r.payload.jobs;
    if (p && r.kind === 'provider_limits_proposal' && r.payload.limits) p.limits = r.payload.limits;
  }
  return list;
}

export const isActive = (p: ProviderConfig) => p.status !== 'disabled' && p.status !== 'archived';

/** Reasons the provider's JOBS refuse this deal ([] = assigned). Funded deals bypass this (they keep their provider). */
export function jobReasons(p: ProviderConfig, i: { method: string; payerCountry: string; payInCurrency: string; payeeCountry: string; payoutCurrency: string; amountSar: number; holdingDays: number }) {
  const reasons: string[] = [];
  if (!isActive(p)) reasons.push('provider_disabled');
  const job = p.jobs.payin[i.method as JobMethod];
  if (!job?.on) reasons.push('job_off');
  else {
    if (!job.countries.includes(i.payerCountry) || !job.currencies.includes(i.payInCurrency)) reasons.push('payin_method_country_currency_not_supported');
    if ((job.minAmount != null && i.amountSar < job.minAmount) || (job.maxAmount != null && i.amountSar > job.maxAmount)) reasons.push('amount_above_provider_max');
    const hold = job.maxHoldDays ?? p.limits.maxHoldDays[i.method as JobMethod] ?? null;
    if (hold != null && hold < i.holdingDays) reasons.push('holding_days_exceed_provider_max');
  }
  if (p.limits.maxPerPayment != null && i.amountSar > p.limits.maxPerPayment) reasons.push('amount_above_provider_max');
  if (!p.jobs.payout.on || !p.jobs.payout.countries.includes(i.payeeCountry) || !p.jobs.payout.currencies.includes(i.payoutCurrency)) reasons.push('payout_corridor_not_supported');
  return [...new Set(reasons)];
}

/** Warnings for the console: unassigned methods, short holds. */
export function coverageWarnings(list: ProviderConfig[]) {
  const out: { en: string; ar: string }[] = [];
  const real = list.filter(p => p.code !== 'manual' && isActive(p));
  for (const m of ['mada', 'credit_card', 'bank_transfer'] as const) {
    if (!real.some(p => p.jobs.payin[m].on && p.jobs.payin[m].countries.includes('SA') && p.jobs.payout.on && p.jobs.payout.countries.includes('SA')))
      out.push({ en: `No candidate provider assigned for ${m} SA→SA (simulated fallback only)`, ar: `لا يوجد مزوّد مرشح مسند لـ ${m} من السعودية إلى السعودية (المحاكاة فقط)` });
  }
  if (!real.some(p => p.jobs.payout.on && p.jobs.payout.countries.includes('SA') && Object.values(p.jobs.payin).some(j => j.on && j.countries.includes('BH'))))
    out.push({ en: 'No candidate route for BH→SA', ar: 'لا يوجد مسار مرشح من البحرين إلى السعودية' });
  for (const p of real) for (const m of JOB_METHODS) {
    const h = p.jobs.payin[m].maxHoldDays;
    if (p.jobs.payin[m].on && h != null) out.push({ en: `${p.nameEn} ${m} max hold ${h} days`, ar: `${p.nameAr} ${m}: أقصى احتجاز ${h} يوماً` });
  }
  return out;
}

/** Archive is blocked while an enabled routing rule pins the provider or an unused quote is routed to it. */
export function archiveBlockers(code: string, rules: { id: string; enabled: boolean; action: any }[], openQuotes: number) {
  const out: string[] = [];
  const pinned = rules.filter(r => r.enabled && r.action?.provider === code).map(r => r.id);
  if (pinned.length) out.push(`active_route:${pinned.join(',')}`);
  if (openQuotes > 0) out.push(`unfunded_quotes:${openQuotes}`);
  return out;
}

export const mask = (last4: string) => `••••${last4}`;
