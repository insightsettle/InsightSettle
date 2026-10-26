import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Plus, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/lib/locale';
import { financeApprove, financeCredentialPropose, financeProviderPropose, financeProviders, financeReject, financeRoutingPropose, financeTestConnection } from '@/lib/finance.functions';
import { JOB_METHODS, type ProviderConfig, type ProviderJobs, type ProviderLimits } from '@/lib/finance/provider-config';
import { PriceBook, RoutingWarnings } from './MultiProvider';

export const providersOptions = () => queryOptions({ queryKey: ['finance-providers'], queryFn: () => financeProviders() });
type Data = Awaited<ReturnType<typeof financeProviders>>;
type T = (en: string, ar?: string) => string;

const STATUS: Record<string, { en: string; ar: string; cls: string }> = {
  simulated: { en: 'Simulated', ar: 'محاكاة', cls: 'bg-primary/10 text-primary border-primary/30' },
  not_connected: { en: 'Not connected', ar: 'غير متصل', cls: 'bg-muted text-muted-foreground border-border' },
  sandbox_connected: { en: 'Sandbox connected', ar: 'متصل تجريبياً', cls: 'bg-accent text-accent-foreground border-border' },
  production_locked: { en: 'Production locked', ar: 'الإنتاج مقفل', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  disabled: { en: 'Disabled', ar: 'معطّل', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  archived: { en: 'Archived', ar: 'مؤرشف', cls: 'bg-muted text-muted-foreground border-border' },
  pending_approval: { en: 'Pending approval', ar: 'بانتظار الموافقة', cls: 'bg-warning/10 text-warning border-warning/40' },
};
export function StatusBadge({ status }: { status: string }) {
  const { text } = useLocale();
  const s = STATUS[status] ?? STATUS['not_connected']!;
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{text(s.en, s.ar)}</span>;
}
const Chip = ({ children }: { children: ReactNode }) => <span className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-xs" dir="ltr">{children}</span>;
export function SectionIntro({ en, ar }: { en: string; ar: string }) {
  const { text } = useLocale();
  return <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" /><span>{text(en, ar)} · <b>{text('Sandbox only, no real money.', 'بيئة اختبار فقط، دون أموال حقيقية.')}</b></span></p>;
}
const name = (p: ProviderConfig, text: T) => text(p.nameEn, p.nameAr);
const jobChips = (p: ProviderConfig) => [...JOB_METHODS.filter(m => p.jobs.payin[m].on), ...(p.jobs.payout.on ? ['payout'] : []), ...(p.jobs.refunds.full || p.jobs.refunds.partial ? ['refunds'] : []), ...(p.jobs.holding === 'simulated' ? ['holding'] : [])];
const lastTest = (d: Data, code: string) => [...d.records].reverse().find(r => r.kind === 'connection_test' && r.subject_id === code);

function useAct() {
  const cache = useQueryClient(); const { text } = useLocale(); const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await cache.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('finance') }); }
    catch (e) { toast.error(e instanceof Error ? e.message : text('Action failed', 'تعذّر الإجراء')); }
    finally { setBusy(false); }
  };
  return { busy, run };
}
function Reason({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const { text } = useLocale();
  return <div className="min-w-0 space-y-1"><Label htmlFor={id}>{text('Reason (required, audited)', 'السبب (مطلوب ومسجّل)')}</Label><Input id={id} className="w-full min-w-0" value={value} onChange={e => onChange(e.target.value)} /></div>;
}

/** Overview extras: provider strip and counts. */
export function OverviewProviders() {
  const { text } = useLocale();
  const { data } = useSuspenseQuery(providersOptions());
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{text('Routing mode', 'وضع التوجيه')}</p><p className="mt-1 font-semibold" dir="ltr">{data.mode}</p></div>
      <Link to="/console/finance/operations" className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{text('Pending approvals', 'موافقات معلّقة')}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{data.pendingCount}</p></Link>
      <Link to="/console/finance/reconciliation" className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{text('Reconciliation imports', 'ملفات المطابقة')}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{data.reconciliationImports}</p></Link>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-1">{data.providers.filter(p => p.status !== 'archived').map(p => <Link key={p.code} to="/console/finance/providers/$providerId" params={{ providerId: p.code }} className="min-w-56 shrink-0 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2"><span className="truncate font-medium">{name(p, text)}</span><StatusBadge status={p.status} /></div>
      <div className="mt-2 flex flex-wrap gap-1">{jobChips(p).length ? jobChips(p).map(j => <Chip key={j}>{j}</Chip>) : <span className="text-xs text-muted-foreground">{text('No jobs assigned', 'لا مهام مسندة')}</span>}</div>
    </Link>)}</div>
  </div>;
}

export function ProvidersGrid() {
  const { text } = useLocale();
  const { data } = useSuspenseQuery(providersOptions());
  const propose = useServerFn(financeProviderPropose); const { busy, run } = useAct();
  const [form, setForm] = useState({ nameEn: '', nameAr: '', code: '', country: 'SA', adapter: 'generic', reason: '' });
  const [open, setOpen] = useState(false);
  return <section className="mt-6 min-w-0 space-y-6" data-no-localize>
    <SectionIntro en="Every payment provider, its state and the jobs it handles. Open a card to manage profile, connection, jobs, prices and limits." ar="كل مزوّدي الدفع وحالتهم والمهام المسندة لهم. افتح البطاقة لإدارة الملف والاتصال والمهام والأسعار والحدود." />
    <div className="flex justify-end"><Button onClick={() => setOpen(!open)}><Plus className="size-4" />{text('Add provider', 'إضافة مزوّد')}</Button></div>
    {open && <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
      {([['nameEn', 'Name (English)', 'الاسم (إنجليزي)'], ['nameAr', 'Name (Arabic)', 'الاسم (عربي)'], ['code', 'Internal code (fixed, a-z)', 'الرمز الداخلي (ثابت، a-z)']] as const).map(([k, en, ar]) =>
        <div key={k} className="min-w-0 space-y-1"><Label htmlFor={`np-${k}`}>{text(en, ar)}</Label><Input id={`np-${k}`} className="w-full min-w-0" value={form[k]} onChange={e => setForm({ ...form, [k]: k === 'code' ? e.target.value.toLowerCase() : e.target.value })} /></div>)}
      <div className="min-w-0 space-y-1"><Label>{text('Country', 'الدولة')}</Label><Select value={form.country} onValueChange={v => setForm({ ...form, country: v })}><SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{['SA', 'BH', 'AE', 'KW', 'OM', 'QA'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      <div className="min-w-0 space-y-1"><Label>{text('Adapter', 'المحوّل')}</Label><Select value={form.adapter} onValueChange={v => setForm({ ...form, adapter: v })}><SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(data.adapters).filter(a => a !== 'simulated').map(a => <SelectItem key={a} value={a}>{a === 'generic' ? text('Generic: no adapter yet', 'عام: لا يوجد محوّل بعد') : a}</SelectItem>)}</SelectContent></Select></div>
      <Reason id="np-reason" value={form.reason} onChange={v => setForm({ ...form, reason: v })} />
      <div className="sm:col-span-2"><Button disabled={busy || form.reason.trim().length < 3 || !/^[a-z][a-z0-9_]{1,30}$/.test(form.code) || !form.nameEn || !form.nameAr} onClick={() => run(() => propose({ data: { kind: 'provider_profile_proposal', provider: form.code, create: true, profile: { nameEn: form.nameEn, nameAr: form.nameAr, contact: '', notes: '', status: 'not_connected', country: form.country as 'SA', adapter: form.adapter }, reason: form.reason, key: crypto.randomUUID() } }).then(() => setOpen(false)), text('Proposal saved; a second administrator must approve.', 'حُفظ المقترح؛ يجب أن يعتمده مدير ثانٍ.'))}>{text('Propose new provider', 'اقتراح مزوّد جديد')}</Button></div>
    </div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.providers.map(p => { const t = lastTest(data, p.code); return <Link key={p.code} to="/console/finance/providers/$providerId" params={{ providerId: p.code }} className="min-w-0 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary">
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{p.nameEn.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{name(p, text)}</h3><p className="text-xs text-muted-foreground" dir="ltr">{p.code} · {p.country}</p></div><StatusBadge status={p.status} /></div>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-muted-foreground">{text('Pay-in coverage', 'تغطية التحصيل')}</dt><dd dir="ltr">{[...new Set(JOB_METHODS.flatMap(m => p.jobs.payin[m].on ? p.jobs.payin[m].countries : []))].join(', ') || '—'} · {[...new Set(JOB_METHODS.flatMap(m => p.jobs.payin[m].on ? p.jobs.payin[m].currencies : []))].join(', ') || '—'}</dd></div>
        <div><dt className="text-muted-foreground">{text('Jobs', 'المهام')}</dt><dd className="mt-1 flex flex-wrap gap-1">{jobChips(p).length ? jobChips(p).map(j => <Chip key={j}>{j}</Chip>) : <span className="text-muted-foreground">{text('No jobs assigned', 'لا مهام مسندة')}</span>}</dd></div>
        <div className="flex flex-wrap justify-between gap-2"><span>{text('Price source', 'مصدر السعر')}: <b>{p.priceSource}</b></span><span className="text-muted-foreground">{text('Last test', 'آخر اختبار')}: {t ? new Date(t.created_at).toLocaleDateString() : '—'}</span></div>
      </dl>
    </Link>; })}</div>
  </section>;
}

export function ProviderPage({ code }: { code: string }) {
  const { text } = useLocale();
  const { data } = useSuspenseQuery(providersOptions());
  const p = data.providers.find(x => x.code === code);
  if (!p) return <p className="mt-6 text-sm text-muted-foreground">{text('Provider not found.', 'المزوّد غير موجود.')}</p>;
  return <section className="mt-6 min-w-0 space-y-5" data-no-localize>
    <Link to="/console/finance/providers" className="text-sm text-primary">{text('← All providers', '→ كل المزوّدين')}</Link>
    <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{name(p, text)}</h2><StatusBadge status={p.status} /><Chip>{p.code}</Chip></div>
    <SectionIntro en="Changes here are proposals; a second administrator must approve before they take effect." ar="التغييرات هنا مقترحات؛ لا تسري إلا بعد اعتماد مدير ثانٍ." />
    <Tabs defaultValue="profile" className="min-w-0">
      <TabsList className="flex h-auto w-full flex-wrap justify-start">{[['profile', 'Profile', 'الملف'], ['connection', 'Connection (API)', 'الاتصال (API)'], ['jobs', 'Jobs & coverage', 'المهام والتغطية'], ['prices', 'Prices', 'الأسعار'], ['limits', 'Limits & holding', 'الحدود والاحتجاز'], ['activity', 'Activity', 'النشاط']].map(([v, en, ar]) => <TabsTrigger key={v} value={v!}>{text(en!, ar!)}</TabsTrigger>)}</TabsList>
      <TabsContent value="profile"><ProfileTab p={p} /></TabsContent>
      <TabsContent value="connection"><ConnectionTab p={p} data={data} /></TabsContent>
      <TabsContent value="jobs"><JobsTab p={p} data={data} /></TabsContent>
      <TabsContent value="prices"><PricesTab p={p} data={data} /></TabsContent>
      <TabsContent value="limits"><LimitsTab p={p} /></TabsContent>
      <TabsContent value="activity"><ActivityTab p={p} data={data} /></TabsContent>
    </Tabs>
  </section>;
}

function ProfileTab({ p }: { p: ProviderConfig }) {
  const { text } = useLocale(); const propose = useServerFn(financeProviderPropose); const { busy, run } = useAct();
  const [f, setF] = useState({ nameEn: p.nameEn, nameAr: p.nameAr, contact: p.contact, notes: p.notes, status: p.status });
  const [reason, setReason] = useState('');
  const statuses = p.code === 'manual' ? ['simulated', 'disabled'] : ['not_connected', 'sandbox_connected', 'disabled', 'archived'];
  const send = (status = f.status) => run(() => propose({ data: { kind: 'provider_profile_proposal', provider: p.code, create: false, profile: { ...f, status }, reason, key: crypto.randomUUID() } }), text('Profile proposal saved.', 'حُفظ مقترح الملف.'));
  return <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
    {([['nameEn', 'Display name (English)', 'الاسم المعروض (إنجليزي)'], ['nameAr', 'Display name (Arabic)', 'الاسم المعروض (عربي)'], ['contact', 'Contact person', 'جهة الاتصال'], ['notes', 'Notes', 'ملاحظات']] as const).map(([k, en, ar]) =>
      <div key={k} className="min-w-0 space-y-1"><Label htmlFor={`pf-${k}`}>{text(en, ar)}</Label><Input id={`pf-${k}`} className="w-full min-w-0" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}
    <div className="min-w-0 space-y-1"><Label>{text('Internal code (fixed)', 'الرمز الداخلي (ثابت)')}</Label><Input disabled value={p.code} dir="ltr" className="w-full min-w-0" /></div>
    <div className="min-w-0 space-y-1"><Label>{text('Status', 'الحالة')}</Label><Select value={f.status} onValueChange={v => setF({ ...f, status: v as ProviderConfig['status'] })}><SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{text(STATUS[s]!.en, STATUS[s]!.ar)}</SelectItem>)}</SelectContent></Select></div>
    <Reason id="pf-reason" value={reason} onChange={setReason} />
    <div className="flex flex-wrap gap-2 sm:col-span-2">
      <Button disabled={busy || reason.trim().length < 3} onClick={() => send()}>{text('Propose profile change', 'اقتراح تعديل الملف')}</Button>
      {p.code !== 'manual' && p.status !== 'archived' && <Button variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => send('archived')}>{text('Archive provider (never deleted)', 'أرشفة المزوّد (لا حذف)')}</Button>}
    </div>
    <p className="text-xs text-muted-foreground sm:col-span-2">{text('Archiving is blocked while an enabled routing rule or an unused quote uses this provider. Past deals keep its name.', 'تُمنع الأرشفة ما دامت قاعدة توجيه مفعّلة أو عرض سعر غير مستخدم يعتمد على المزوّد. تحتفظ الصفقات السابقة باسمه.')}</p>
  </div>;
}

function ConnectionTab({ p, data }: { p: ProviderConfig; data: Data }) {
  const { text } = useLocale(); const propose = useServerFn(financeCredentialPropose); const test = useServerFn(financeTestConnection); const { busy, run } = useAct();
  const adapter = data.adapters[p.adapter] ?? data.adapters['generic']!;
  const [values, setValues] = useState<Record<string, string>>({}); const [reason, setReason] = useState('');
  const [result, setResult] = useState<readonly [string, string] | null>(null);
  const creds = data.credentials.filter(c => c.provider === p.code && c.environment === 'sandbox');
  const origin = typeof window === 'undefined' ? 'https://insightsettle.com' : window.location.origin;
  return <div className="mt-4 space-y-6">
    <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{text('Adapter', 'المحوّل')}: <span dir="ltr">{p.adapter}</span></span>{adapter.implemented ? <StatusBadge status="simulated" /> : <StatusBadge status="not_connected" />}</div>
    {!adapter.implemented && <p className="rounded-lg border border-border bg-muted p-3 text-sm">{text("Adapter not built yet: waiting for the provider's official API documentation. Credentials can be stored for later but no call is made.", 'لم يُبنَ المحوّل بعد: بانتظار وثائق الواجهة الرسمية. يمكن حفظ بيانات الاعتماد لاحقاً دون إجراء أي اتصال.')}</p>}
    <div className="space-y-3"><h3 className="font-semibold">{text('Sandbox credentials', 'بيانات اعتماد بيئة الاختبار')}</h3>
      {!adapter.credentialFields.length && <p className="text-sm text-muted-foreground">{text('This adapter needs no credentials.', 'لا يحتاج هذا المحوّل بيانات اعتماد.')}</p>}
      {adapter.credentialFields.map(f => { const active = creds.find(c => c.field === f.key && c.status === 'active'); const pending = creds.find(c => c.field === f.key && c.status === 'pending'); return <div key={f.key} className="grid min-w-0 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0 space-y-1"><Label htmlFor={`cr-${f.key}`}>{text(f.labelEn, f.labelAr)}</Label>
          <Input id={`cr-${f.key}`} type={f.secret ? 'password' : 'text'} autoComplete="off" className="w-full min-w-0" placeholder={active ? text(`Active ${active.masked} — enter to replace`, `فعّال ${active.masked} — أدخل قيمة للاستبدال`) : text('Not set', 'غير محدد')} value={values[f.key] ?? ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })} />
          <p className="text-xs text-muted-foreground" dir="auto">{active ? `${text('Active', 'فعّال')} ${active.masked} · ${new Date(active.setAt).toLocaleString()}` : text('No active value', 'لا قيمة فعّالة')}{pending ? ` · ${text('Pending approval', 'بانتظار الموافقة')} ${pending.masked}` : ''}</p></div>
        <div className="flex gap-2"><Button size="sm" disabled={busy || reason.trim().length < 3 || (values[f.key] ?? '').length < 4} onClick={() => run(() => propose({ data: { provider: p.code, field: f.key, action: 'set', value: values[f.key]!, environment: 'sandbox', reason, key: crypto.randomUUID() } }).then(() => setValues({ ...values, [f.key]: '' })), text('Stored encrypted; awaiting a second administrator.', 'حُفظ مشفّراً؛ بانتظار مدير ثانٍ.'))}>{active ? text('Replace', 'استبدال') : text('Save', 'حفظ')}</Button>
          {active && <Button size="sm" variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => run(() => propose({ data: { provider: p.code, field: f.key, action: 'remove', environment: 'sandbox', reason, key: crypto.randomUUID() } }), text('Removal proposed.', 'اقتُرحت الإزالة.'))}>{text('Remove', 'إزالة')}</Button>}</div>
      </div>; })}
      <Reason id="cr-reason" value={reason} onChange={setReason} />
    </div>
    <div className="space-y-2"><Button variant="outline" disabled={busy} onClick={() => run(async () => setResult((await test({ data: { provider: p.code, environment: 'sandbox', key: crypto.randomUUID() } })).message), text('Test recorded.', 'سُجّل الاختبار.'))}>{text('Test connection (sandbox)', 'اختبار الاتصال (تجريبي)')}</Button>
      {result && <p className="rounded-lg border border-border p-3 text-sm">{text(result[0], result[1])}</p>}</div>
    <div className="space-y-1"><h3 className="font-semibold">{text('Webhook URL to give the provider', 'رابط الإشعارات الذي يُعطى للمزوّد')}</h3>
      {(['sandbox', 'production'] as const).map(env => <p key={env} className="break-all rounded-md bg-muted p-2 text-xs" dir="ltr">{env}: {origin}/api/public/finance-webhook/{p.code}/{env}</p>)}
      <p className="text-xs text-muted-foreground">{text('Requests are refused until the adapter verifies signatures from the official specification.', 'تُرفض الطلبات حتى يتحقق المحوّل من التوقيع وفق المواصفة الرسمية.')}</p></div>
    <div className="space-y-2 rounded-lg border border-destructive/30 p-4"><div className="flex items-center gap-2"><h3 className="font-semibold">{text('Production', 'الإنتاج')}</h3><StatusBadge status="production_locked" /></div>
      <ul className="list-inside list-disc text-sm">{[['Written contract', 'عقد مكتوب'], ['Official API documentation', 'وثائق الواجهة الرسمية'], ['Sandbox tests passed', 'نجاح اختبارات بيئة الاختبار'], ['Webhook verified', 'التحقق من الإشعارات'], ['Founder approval', 'موافقة المؤسس']].map(([en, ar]) => <li key={en}>☐ {text(en!, ar!)}</li>)}</ul></div>
  </div>;
}

const csv = (a: string[]) => a.join(', ');
const parseList = (s: string) => s.split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
function JobsTab({ p, data }: { p: ProviderConfig; data: Data }) {
  const { text } = useLocale(); const propose = useServerFn(financeProviderPropose); const { busy, run } = useAct();
  const [jobs, setJobs] = useState<ProviderJobs>(structuredClone(p.jobs)); const [reason, setReason] = useState('');
  const setPay = (m: (typeof JOB_METHODS)[number], patch: Partial<ProviderJobs['payin'][typeof m]>) => setJobs({ ...jobs, payin: { ...jobs.payin, [m]: { ...jobs.payin[m], ...patch } } });
  return <div className="mt-4 space-y-5">
    <RoutingWarnings providers={data.providers} />
    <p className="text-sm text-muted-foreground">{text('Turning a job off removes this provider from new routes for that job. Deals already funded keep their provider.', 'إيقاف مهمة يزيل المزوّد من المسارات الجديدة لها. الصفقات الممولة تحتفظ بمزوّدها.')}</p>
    <div className="max-w-full overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted"><tr>{[text('Pay-in method', 'طريقة التحصيل'), text('On', 'مفعّل'), text('Countries', 'الدول'), text('Currencies', 'العملات'), text('Min–max (SAR eq.)', 'الحد الأدنى–الأقصى'), text('Max hold days', 'أقصى احتجاز')].map(h => <th key={h} className="whitespace-nowrap p-2 text-start">{h}</th>)}</tr></thead>
      <tbody>{JOB_METHODS.map(m => { const j = jobs.payin[m]; return <tr key={m} className="border-t border-border">
        <td className="p-2" dir="ltr">{m}{j.note && <span className="block text-xs text-muted-foreground">{j.note}</span>}</td>
        <td className="p-2"><Switch checked={j.on} onCheckedChange={v => setPay(m, { on: v })} aria-label={`${m} on`} /></td>
        <td className="p-2"><Input className="min-w-24" dir="ltr" value={csv(j.countries)} onChange={e => setPay(m, { countries: parseList(e.target.value) })} /></td>
        <td className="p-2"><Input className="min-w-24" dir="ltr" value={csv(j.currencies)} onChange={e => setPay(m, { currencies: parseList(e.target.value) })} /></td>
        <td className="p-2"><div className="flex gap-1"><Input className="w-24" inputMode="decimal" value={j.minAmount ?? ''} onChange={e => setPay(m, { minAmount: e.target.value ? Number(e.target.value) : null })} /><Input className="w-24" inputMode="decimal" value={j.maxAmount ?? ''} onChange={e => setPay(m, { maxAmount: e.target.value ? Number(e.target.value) : null })} /></div></td>
        <td className="p-2"><Input className="w-20" inputMode="numeric" value={j.maxHoldDays ?? ''} onChange={e => setPay(m, { maxHoldDays: e.target.value ? Number(e.target.value) : null })} /></td>
      </tr>; })}</tbody></table></div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="space-y-2 rounded-lg border border-border p-3"><div className="flex items-center justify-between"><span className="font-medium">{text('Payout', 'الصرف')}</span><Switch checked={jobs.payout.on} onCheckedChange={v => setJobs({ ...jobs, payout: { ...jobs.payout, on: v } })} aria-label="payout" /></div>
        <Input dir="ltr" aria-label="payout countries" value={csv(jobs.payout.countries)} onChange={e => setJobs({ ...jobs, payout: { ...jobs.payout, countries: parseList(e.target.value) } })} />
        <Input dir="ltr" aria-label="payout currencies" value={csv(jobs.payout.currencies)} onChange={e => setJobs({ ...jobs, payout: { ...jobs.payout, currencies: parseList(e.target.value) } })} /></div>
      <div className="space-y-2 rounded-lg border border-border p-3">
        {([['full', 'Full refunds', 'استرداد كامل'], ['partial', 'Partial refunds', 'استرداد جزئي']] as const).map(([k, en, ar]) => <div key={k} className="flex items-center justify-between"><span>{text(en, ar)}</span><Switch checked={jobs.refunds[k]} onCheckedChange={v => setJobs({ ...jobs, refunds: { ...jobs.refunds, [k]: v } })} /></div>)}
        {([['splitPayouts', 'Split payouts', 'صرف مقسّم'], ['milestones', 'Milestones', 'المراحل']] as const).map(([k, en, ar]) => <div key={k} className="flex items-center justify-between"><span>{text(en, ar)}</span><Switch checked={jobs[k]} onCheckedChange={v => setJobs({ ...jobs, [k]: v })} /></div>)}
        <div className="flex items-center justify-between"><span>{text('Holding / conditional release', 'الاحتجاز / الإفراج المشروط')}</span><StatusBadge status={jobs.holding === 'simulated' ? 'simulated' : 'pending_approval'} /></div>
      </div>
    </div>
    <Reason id="jobs-reason" value={reason} onChange={setReason} />
    <Button disabled={busy || reason.trim().length < 3} onClick={() => run(() => propose({ data: { kind: 'provider_jobs_proposal', provider: p.code, jobs: jobs as any, reason, key: crypto.randomUUID() } }), text('Jobs proposal saved.', 'حُفظ مقترح المهام.'))}>{text('Propose job changes', 'اقتراح تعديل المهام')}</Button>
  </div>;
}

function PricesTab({ p, data }: { p: ProviderConfig; data: Data }) {
  const { text } = useLocale(); const propose = useServerFn(financeRoutingPropose); const { busy, run } = useAct(); const [reason, setReason] = useState('');
  return <div className="mt-4 space-y-3"><Reason id="price-reason" value={reason} onChange={setReason} />
    <PriceBook rows={data.book.filter(r => r.provider === p.code)} busy={busy} reason={reason} onPropose={row => run(() => propose({ data: { kind: 'price_book_proposal', row: row as any, reason, key: crypto.randomUUID() } }), text('Price proposal saved.', 'حُفظ مقترح السعر.'))} /></div>;
}

function LimitsTab({ p }: { p: ProviderConfig }) {
  const { text } = useLocale(); const propose = useServerFn(financeProviderPropose); const { busy, run } = useAct();
  const [l, setL] = useState<ProviderLimits>(structuredClone(p.limits)); const [reason, setReason] = useState('');
  const n = (v: string) => (v ? Number(v) : null);
  return <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
    {([['maxPerPayment', 'Max per payment (SAR eq.)', 'أقصى دفعة'], ['dailyLimit', 'Daily limit', 'الحد اليومي'], ['settlementDays', 'Settlement days', 'أيام التسوية']] as const).map(([k, en, ar]) =>
      <div key={k} className="min-w-0 space-y-1"><Label htmlFor={`lm-${k}`}>{text(en, ar)}</Label><Input id={`lm-${k}`} inputMode="decimal" className="w-full min-w-0" value={l[k] ?? ''} onChange={e => setL({ ...l, [k]: n(e.target.value) })} /></div>)}
    {JOB_METHODS.map(m => <div key={m} className="min-w-0 space-y-1"><Label htmlFor={`lh-${m}`} dir="ltr">{text(`Max hold days · ${m}`, `أقصى احتجاز · ${m}`)}</Label><Input id={`lh-${m}`} inputMode="numeric" className="w-full min-w-0" value={l.maxHoldDays[m] ?? ''} onChange={e => setL({ ...l, maxHoldDays: { ...l.maxHoldDays, [m]: n(e.target.value) } })} /></div>)}
    <div className="sm:col-span-3"><Reason id="lm-reason" value={reason} onChange={setReason} /></div>
    <div className="sm:col-span-3"><Button disabled={busy || reason.trim().length < 3} onClick={() => run(() => propose({ data: { kind: 'provider_limits_proposal', provider: p.code, limits: l as any, reason, key: crypto.randomUUID() } }), text('Limits proposal saved.', 'حُفظ مقترح الحدود.'))}>{text('Propose limits', 'اقتراح الحدود')}</Button></div>
  </div>;
}

function ActivityTab({ p, data }: { p: ProviderConfig; data: Data }) {
  const { text } = useLocale();
  const mine = data.records.filter(r => r.subject_id === p.code || r.payload?.provider === p.code || r.payload?.row?.provider === p.code);
  const ids = new Set(mine.map(r => r.id));
  const rows = [...mine, ...data.records.filter(r => (r.kind === 'approval' || r.kind === 'rejection') && ids.has(r.subject_id))].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return <div className="mt-4">{rows.length ? <ul className="divide-y divide-border rounded-lg border border-border">{rows.map(r => <li key={r.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm"><span><b dir="ltr">{r.kind}</b>{r.kind === 'connection_test' && <> · {r.payload?.ok ? text('passed', 'ناجح') : text('not passed', 'غير ناجح')} · {r.payload?.message}</>} · {r.reason}</span><span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span></li>)}</ul>
    : <p className="text-sm text-muted-foreground">{text('No activity yet. Webhook deliveries and API errors appear here once an adapter is connected.', 'لا يوجد نشاط بعد. تظهر الإشعارات وأخطاء الواجهة هنا بعد ربط المحوّل.')}</p>}</div>;
}

/** All pending maker-checker proposals of every type. */
export function ApprovalsInbox() {
  const { text } = useLocale();
  const { data } = useSuspenseQuery(providersOptions());
  const approve = useServerFn(financeApprove); const reject = useServerFn(financeReject); const { busy, run } = useAct(); const [reason, setReason] = useState('');
  const decided = new Set(data.records.filter(r => r.kind === 'approval' || r.kind === 'rejection').map(r => r.subject_id));
  const pending = data.records.filter(r => r.kind.endsWith('_proposal') && !decided.has(r.id)).reverse();
  return <div className="space-y-3">
    <h3 className="text-lg font-semibold">{text('Approvals inbox', 'صندوق الموافقات')}</h3>
    <p className="text-sm text-muted-foreground">{text('Every configuration change waits here. The proposer cannot approve their own change.', 'ينتظر هنا كل تغيير في الإعداد. لا يمكن لمقدّم المقترح اعتماده بنفسه.')}</p>
    <Reason id="inbox-reason" value={reason} onChange={setReason} />
    {pending.length ? <ul className="divide-y divide-border rounded-lg border border-border">{pending.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
      <span className="min-w-0 break-words"><StatusBadge status="pending_approval" /> <b dir="ltr">{r.kind}</b> · <span dir="ltr">{r.subject_id}</span>{r.payload?.last4 ? ` · ••••${r.payload.last4}` : ''} · {r.reason}</span>
      <span className="flex gap-2">{r.actor_id === data.actorId ? <span className="text-muted-foreground">{text('Your proposal', 'مقترحك')}</span> : <Button size="sm" disabled={busy || reason.trim().length < 3} onClick={() => run(() => approve({ data: { id: r.id, reason, key: crypto.randomUUID() } }), text('Approved.', 'اعتُمد.'))}>{text('Approve', 'اعتماد')}</Button>}
        <Button size="sm" variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => run(() => reject({ data: { id: r.id, reason, key: crypto.randomUUID() } }), text('Rejected.', 'رُفض.'))}>{text('Reject', 'رفض')}</Button></span>
    </li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">{text('No pending approvals.', 'لا توجد موافقات معلّقة.')}</p>}
  </div>;
}
