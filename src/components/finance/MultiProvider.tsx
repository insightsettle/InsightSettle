import { useState } from 'react';
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/lib/locale';
import { financeCoverage, financeRouteSimulate, financeRoutingConfig, financeRoutingPropose } from '@/lib/finance.functions';
import { providers } from '@/lib/finance/providers';
import type { PriceRow, RouteRule, RoutingTable } from '@/lib/finance/price-book';

export const routingConfigOptions = () => queryOptions({ queryKey: ['finance-routing'], queryFn: () => financeRoutingConfig() });
const coverageOptions = () => queryOptions({ queryKey: ['finance-coverage'], queryFn: () => financeCoverage() });

const providerName = (id: string | null) => (id ? providers.find(p => p.id === id)?.name ?? id : null);
import { coverageWarnings, type ProviderConfig } from '@/lib/finance/provider-config';
export function RoutingWarnings({ providers: list }: { providers: ProviderConfig[] }) {
  const { text } = useLocale();
  const w = coverageWarnings(list);
  return w.length ? <ul className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">{w.map(x => <li key={x.en}>⚠ {text(x.en, x.ar)}</li>)}</ul> : null;
}
type Sim = { payerCountry: string; payeeCountry: string; currency: string; amount: string; dealType: 'goods' | 'services' | 'contracting' | 'freelance' | 'auction'; holdingDays: number };
const FOUNDER_CASES: { en: string; ar: string; sim: Sim }[] = [
  { en: 'SAR 2,000 mada SA→SA', ar: '2,000 ريال مدى', sim: { payerCountry: 'SA', payeeCountry: 'SA', currency: 'SAR', amount: '2000', dealType: 'goods', holdingDays: 7 } },
  { en: 'SAR 20,000 credit card SA→SA', ar: '20,000 ريال بطاقة ائتمانية', sim: { payerCountry: 'SA', payeeCountry: 'SA', currency: 'SAR', amount: '20000', dealType: 'goods', holdingDays: 7 } },
  { en: 'SAR 550,000 bank transfer SA→SA', ar: '550,000 ريال تحويل بنكي', sim: { payerCountry: 'SA', payeeCountry: 'SA', currency: 'SAR', amount: '550000', dealType: 'goods', holdingDays: 7 } },
  { en: 'SAR 20,000 mada, 30 holding days', ar: '20,000 ريال مدى، 30 يوم احتجاز', sim: { payerCountry: 'SA', payeeCountry: 'SA', currency: 'SAR', amount: '20000', dealType: 'goods', holdingDays: 30 } },
  { en: 'BHD 55,000 bank transfer BH→SA', ar: '55,000 دينار تحويل بنكي من البحرين للسعودية', sim: { payerCountry: 'BH', payeeCountry: 'SA', currency: 'BHD', amount: '55000', dealType: 'goods', holdingDays: 7 } },
  { en: 'SAR 100,000 contracting, 12-month retention', ar: '100,000 ريال مقاولات مع احتجاز 12 شهراً', sim: { payerCountry: 'SA', payeeCountry: 'SA', currency: 'SAR', amount: '100000', dealType: 'contracting', holdingDays: 372 } },
];
const REASONS: Record<string, [string, string]> = {
  payin_method_country_currency_not_supported: ['Pay-in method/country/currency not supported', 'طريقة/دولة/عملة التحصيل غير مدعومة'],
  method_not_offered: ['Method not offered by provider', 'الطريقة غير مقدّمة لدى المزوّد'],
  awaiting_quote: ['Awaiting quote', 'بانتظار عرض السعر'],
  payout_corridor_not_supported: ['Cannot pay out to payee country/currency (legs never split)', 'لا يصرف لدولة/عملة المستفيد (لا تقسيم للمسارين)'],
  holding_days_exceed_provider_max: ['Holding days exceed provider maximum', 'مدة الاحتجاز تتجاوز حد المزوّد'],
  amount_above_provider_max: ['Amount above provider limit', 'المبلغ فوق حد المزوّد'],
  capability_unavailable: ['Capability unavailable', 'القدرة غير متاحة'],
  unknown_provider: ['Unknown provider', 'مزوّد غير معروف'],
};

export function MultiProviderPanel() {
  return <RoutingPanelV2 />;
}
function RoutingPanelV2() {
  const { text } = useLocale();
  const { data } = useSuspenseQuery(routingConfigOptions());
  const propose = useServerFn(financeRoutingPropose);
  const cache = useQueryClient();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const approved = new Set(data.records.filter(r => r.kind === 'approval').map(r => r.subject_id));
  const approvedTables = data.records.filter(r => r.kind === 'routing_table_proposal' && approved.has(r.id));

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); await cache.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('finance') }); }
    catch (e) { toast.error(e instanceof Error ? e.message : text('Action failed', 'تعذّر الإجراء')); }
    finally { setBusy(false); }
  }
  const proposeTable = (table: RoutingTable) => run(() => propose({ data: { kind: 'routing_table_proposal', table: table as any, reason, key: crypto.randomUUID() } }), text('Routing proposal saved; awaiting a second administrator.', 'حُفظ مقترح التوجيه؛ بانتظار مدير ثانٍ.'));

  return <section className="mt-6 min-w-0 space-y-8" data-no-localize>
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <h3 className="text-lg font-semibold">{text('One deal = one provider', 'صفقة واحدة = مزوّد واحد')}</h3>
      <p className="text-sm text-muted-foreground">{text('The provider is chosen once per deal before funding and must serve both the pay-in and the payout leg. Milestones, retention, refunds and auction split payouts use the same provider. Funded deals are never re-routed. All candidates are NOT CONNECTED; only the simulated provider executes.', 'يُختار المزوّد مرة واحدة قبل التمويل ويجب أن يخدم مسار التحصيل والصرف معاً. المراحل والاحتجاز والاسترداد وصرف المزاد تستخدم المزوّد نفسه. لا يُعاد توجيه صفقة ممولة. كل المرشحين غير متصلين؛ المزوّد المحاكى وحده يعمل.')}</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>{text('Routing mode', 'وضع التوجيه')}: <b dir="ltr">{data.mode}</b></span>
        <span className="text-muted-foreground">· cross_provider_settlement: <b>OFF</b> ({text('pending approval', 'بانتظار الموافقة')})</span>
      </div>
      <div className="min-w-0 space-y-2"><Label htmlFor="routing-reason">{text('Reason for any proposal or approval', 'سبب أي مقترح أو اعتماد')}</Label><Input id="routing-reason" value={reason} onChange={e => setReason(e.target.value)} className="w-full min-w-0" /></div>
      <div className="flex flex-wrap gap-2">
        {(['simulated_only', 'price_book_sandbox'] as const).filter(m => m !== data.mode).map(m => <Button key={m} variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => run(() => propose({ data: { kind: 'routing_mode_proposal', mode: m, reason, key: crypto.randomUUID() } }), text('Mode change proposed.', 'اقتُرح تغيير الوضع.'))}>{text(`Propose mode: ${m}`, `اقتراح الوضع: ${m}`)}</Button>)}
      </div>
    </div>

    <RoutingWarnings providers={data.providers} />

    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{text('Routing table', 'جدول التوجيه')} · <span dir="ltr">{data.table.version}</span></h3>
      <div className="max-w-full overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted"><tr>{[text('Priority', 'الأولوية'), text('Conditions', 'الشروط'), text('Action', 'الإجراء'), text('Status', 'الحالة'), ''].map((h, i) => <th key={i} className="p-2 text-start">{h}</th>)}</tr></thead>
        <tbody>{[...data.table.rules].sort((a, b) => a.priority - b.priority).map((r: RouteRule) => <tr key={r.id} className="border-t border-border">
          <td className="p-2" dir="ltr">{r.id} · {r.priority}</td>
          <td className="p-2" dir="ltr">{r.outsideSaudi ? 'payer/payee outside SA or currency ≠ SAR' : [r.dealType, r.payerCountry && `payer ${r.payerCountry}`, r.payInCurrency, r.method, r.payeeCountry && `payee ${r.payeeCountry}`, r.payoutCurrency].filter(Boolean).join(' · ') || 'any (fallback)'}</td>
          <td className="p-2">{'provider' in r.action ? providerName(r.action.provider) : text('Cheapest eligible', 'الأرخص المؤهل')}</td>
          <td className="p-2">{r.enabled ? text('Enabled', 'مفعّلة') : text('Disabled', 'معطّلة')}</td>
          <td className="p-2"><Button size="sm" variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => proposeTable({ version: data.table.version, rules: data.table.rules.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x) })}>{r.enabled ? text('Propose disable', 'اقتراح تعطيل') : text('Propose enable', 'اقتراح تفعيل')}</Button></td>
        </tr>)}</tbody></table></div>
      {approvedTables.length > 1 && <div className="flex flex-wrap gap-2">{approvedTables.slice(0, -1).map(t => <Button key={t.id} size="sm" variant="ghost" disabled={busy || reason.trim().length < 3} onClick={() => proposeTable(t.payload.table)}>{text(`Roll back to v-${t.id.slice(0, 8)} (new revision)`, `الرجوع إلى v-${t.id.slice(0, 8)} (نسخة جديدة)`)}</Button>)}</div>}
    </div>

    <Simulator />
    <Coverage />
  </section>;
}

export function PriceBook({ rows, busy, reason, onPropose }: { rows: PriceRow[]; busy: boolean; reason: string; onPropose: (r: PriceRow) => void }) {
  const { text } = useLocale();
  const visible = rows.filter(r => r.provider !== 'manual' || (r.country === 'SA' && r.currency === 'SAR'));
  if (!visible.length) return <p className="text-sm text-muted-foreground">{text('No price rows for this provider yet — awaiting quote.', 'لا توجد أسعار لهذا المزوّد بعد — بانتظار عرض السعر.')}</p>;
  const [edit, setEdit] = useState<PriceRow | null>(null);
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  return <div className="space-y-3">
    <h3 className="text-lg font-semibold">{text('Provider price book (versioned, append-only)', 'دفتر أسعار المزوّدين (بنسخ، إضافة فقط)')}</h3>
    <p className="text-sm text-muted-foreground">{text('Simulated provider shown for SA/SAR; it carries the same values in every corridor. Prices are candidate quotes, not contracts, unless the source says contract.', 'المزوّد المحاكى معروض للسعودية/الريال وله القيم نفسها في كل المسارات. الأسعار عروض مرشحة وليست عقوداً ما لم يكن المصدر عقداً.')}</p>
    <div className="max-w-full overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted"><tr>{[text('Provider', 'المزوّد'), text('Method', 'الطريقة'), text('Country · currency', 'الدولة · العملة'), '%', text('Fixed', 'ثابت'), text('Cap', 'السقف'), text('Max hold', 'أقصى احتجاز'), text('Source', 'المصدر'), ''].map((h, i) => <th key={i} className="p-2 text-start">{h}</th>)}</tr></thead>
      <tbody>{visible.map(r => <tr key={`${r.provider}${r.method}${r.country}${r.currency}`} className="border-t border-border" dir="ltr">
        <td className="p-2">{providerName(r.provider)}</td><td className="p-2">{r.method}</td><td className="p-2">{r.country} · {r.currency}</td>
        <td className="p-2">{r.offered === false ? text('Not offered', 'غير متاح') : r.percent == null ? text('Awaiting quote', 'بانتظار عرض') : `${r.percent}%`}</td>
        <td className="p-2">{r.fixed || '—'}</td><td className="p-2">{r.cap ?? '—'}</td><td className="p-2">{r.maxHoldDays == null ? text('open', 'مفتوح') : `${r.maxHoldDays}d`}</td>
        <td className="p-2">{r.source} · {r.validFrom}</td>
        <td className="p-2"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...r })}>{text('Edit', 'تعديل')}</Button></td>
      </tr>)}</tbody></table></div>
    {edit && <div className="grid min-w-0 gap-3 rounded-lg border border-border p-4 sm:grid-cols-3">
      <p className="sm:col-span-3 text-sm font-medium" dir="ltr">{providerName(edit.provider)} · {edit.method} · {edit.country} · {edit.currency}</p>
      {([['percent', '%', 'النسبة %'], ['fixed', 'Fixed fee', 'رسم ثابت'], ['cap', 'Cap per transaction', 'سقف العملية'], ['maxPerPayment', 'Max per payment', 'أقصى دفعة'], ['maxHoldDays', 'Max holding days', 'أقصى أيام احتجاز']] as const).map(([k, en, ar]) =>
        <div key={k} className="min-w-0 space-y-1"><Label htmlFor={`pb-${k}`}>{text(en, ar)}</Label><Input id={`pb-${k}`} inputMode="decimal" className="w-full min-w-0" value={edit[k] == null ? '' : String(edit[k])} onChange={e => setEdit({ ...edit, [k]: k === 'fixed' ? Number(e.target.value || 0) : num(e.target.value) })} /></div>)}
      <div className="min-w-0 space-y-1"><Label>{text('Source', 'المصدر')}</Label><Select value={edit.source} onValueChange={v => setEdit({ ...edit, source: v as PriceRow['source'] })}><SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{['verbal', 'written', 'contract', 'reference'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
      <div className="min-w-0 space-y-1"><Label htmlFor="pb-from">{text('Valid from', 'سارٍ من')}</Label><Input id="pb-from" type="date" className="w-full min-w-0" value={edit.validFrom} onChange={e => setEdit({ ...edit, validFrom: e.target.value })} /></div>
      <div className="min-w-0 space-y-1 sm:col-span-2"><Label htmlFor="pb-ev">{text('Evidence note', 'ملاحظة الإثبات')}</Label><Input id="pb-ev" className="w-full min-w-0" value={edit.evidence} onChange={e => setEdit({ ...edit, evidence: e.target.value })} /></div>
      <div className="flex gap-2 sm:col-span-3"><Button disabled={busy || reason.trim().length < 3} onClick={() => { onPropose(edit); setEdit(null); }}>{text('Propose price change', 'اقتراح تغيير السعر')}</Button><Button variant="ghost" onClick={() => setEdit(null)}>{text('Cancel', 'إلغاء')}</Button></div>
    </div>}
  </div>;
}

function Simulator() {
  const { text } = useLocale();
  const simulate = useServerFn(financeRouteSimulate);
  const [sim, setSim] = useState<Sim>(FOUNDER_CASES[0]!.sim);
  const [result, setResult] = useState<Awaited<ReturnType<typeof financeRouteSimulate>> | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(s: Sim) { setSim(s); setBusy(true); try { setResult(await simulate({ data: s as any })); } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); } finally { setBusy(false); } }
  const field = (k: keyof Sim, en: string, ar: string, opts?: string[]) => <div className="min-w-0 space-y-1"><Label htmlFor={`sim-${k}`}>{text(en, ar)}</Label>{opts
    ? <Select value={String(sim[k])} onValueChange={v => setSim({ ...sim, [k]: v })}><SelectTrigger id={`sim-${k}`} className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
    : <Input id={`sim-${k}`} inputMode="decimal" className="w-full min-w-0" value={String(sim[k])} onChange={e => setSim({ ...sim, [k]: k === 'holdingDays' ? Number(e.target.value || 0) : e.target.value })} />}</div>;
  const countries = ['SA', 'BH', 'AE', 'KW', 'OM', 'QA', 'OTHER'];
  return <div className="space-y-3">
    <h3 className="text-lg font-semibold">{text('Route simulator', 'محاكي المسار')}</h3>
    <div className="flex flex-wrap gap-2">{FOUNDER_CASES.map(c => <Button key={c.en} size="sm" variant="outline" disabled={busy} onClick={() => go(c.sim)}>{text(c.en, c.ar)}</Button>)}</div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-3">
      {field('payerCountry', 'Payer country', 'دولة الدافع', countries)}{field('payeeCountry', 'Payee country', 'دولة المستفيد', countries)}
      {field('currency', 'Currency', 'العملة', ['SAR', 'BHD', 'AED', 'KWD', 'OMR', 'QAR', 'USD'])}{field('amount', 'Amount', 'المبلغ')}
      {field('dealType', 'Deal type', 'نوع الصفقة', ['goods', 'services', 'contracting', 'freelance', 'auction'])}{field('holdingDays', 'Holding days', 'أيام الاحتجاز')}
    </div>
    <Button disabled={busy} onClick={() => go(sim)}>{text('Simulate all methods', 'محاكاة كل الطرق')}</Button>
    {result && <div className="max-w-full overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted"><tr>{[text('Method', 'الطريقة'), text('Provider', 'المزوّد'), text('Rule · version', 'القاعدة · النسخة'), text('Provider cost (SAR)', 'تكلفة المزوّد (ريال)'), text('Insight fee (SAR)', 'رسوم إنسايت (ريال)'), text('Margin', 'الهامش'), text('0.5% rule', 'قاعدة 0.5%'), text('Rejected providers', 'المزوّدون المرفوضون')].map((h, i) => <th key={i} className="p-2 text-start">{h}</th>)}</tr></thead>
      <tbody>{result.map(r => <tr key={r.method} className="border-t border-border align-top">
        <td className="p-2" dir="ltr">{r.method}</td>
        <td className="p-2">{providerName(r.route.provider) ?? text('No route', 'لا مسار')}{r.route.unverified && <span className="block text-xs text-warning">{text('unverified · sandbox only', 'غير متحقق · للاختبار فقط')}</span>}</td>
        <td className="p-2" dir="ltr">{r.route.ruleId ?? '—'} · {r.route.version}</td>
        <td className="p-2" dir="ltr">{r.route.costSar ?? '—'}</td><td className="p-2" dir="ltr">{r.feeSar}</td>
        <td className="p-2" dir="ltr">{(r.margin * 100).toFixed(2)}%</td>
        <td className="p-2">{r.allowed ? text('Pass', 'ناجح') : text('Not offered', 'غير معروض')}</td>
        <td className="p-2">{r.route.rejected.length ? r.route.rejected.map(x => <span key={x.provider} className="block">{providerName(x.provider)}: {x.reasons.map(k => text(...(REASONS[k] ?? [k, k]))).join('، ')}</span>) : '—'}</td>
      </tr>)}</tbody></table></div>}
  </div>;
}

function Coverage() {
  const { text } = useLocale();
  const { data } = useQuery(coverageOptions());
  return <div className="space-y-3">
    <h3 className="text-lg font-semibold">{text('Coverage matrix', 'مصفوفة التغطية')}</h3>
    <p className="text-sm text-muted-foreground">{text('Sample deal: goods, SAR 10,000 equivalent, 7 holding days.', 'صفقة نموذجية: بضائع، ما يعادل 10,000 ريال، 7 أيام احتجاز.')}</p>
    {data && <div className="max-w-full overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="p-2 text-start">{text('Corridor', 'المسار')}</th>{['mada', 'credit_card', 'bank_transfer'].map(m => <th key={m} className="p-2 text-start" dir="ltr">{m}</th>)}</tr></thead>
      <tbody>{data.map(row => <tr key={row.corridor} className="border-t border-border"><td className="p-2" dir="ltr">{row.corridor}</td>{row.cells.map(c => <td key={c.method} className="p-2">{providerName(c.provider) ?? text('No route', 'لا مسار')}{c.provider && <span className="text-xs text-muted-foreground" dir="ltr"> ({c.ruleId})</span>}</td>)}</tr>)}</tbody></table></div>}
  </div>;
}
