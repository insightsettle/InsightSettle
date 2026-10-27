import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Building2, Check, CreditCard, Lock, PackageCheck, Printer, RotateCcw, SearchCheck, ShieldCheck, Truck, Wallet, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { METHOD_BRANDS, PaymentMarks } from "@/components/checkout/PaymentMarks";
import { AcceptedBadges, SecureFields } from "@/components/checkout/SecureFields";
import { useMilestones } from "@/components/deal/DealPanels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionUser } from "@/hooks/use-session";
import { getDealByRef } from "@/lib/deals";
import { getDealPricing, requestFxQuote, PAY_CURRENCIES, type FxQuote } from "@/lib/fx-quotes.functions";
import { translateText, useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { DEFAULT_METHOD, METHOD_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-methods";
import { startDealFunding, type PaymentResult } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/pay/$dealId")({
  head: () => ({ meta: [{ title: "Secure payment | Insight" }, { name: "description", content: "Pay into your Insight deal. The amount stays held until delivery is confirmed." }] }),
  component: CheckoutPage,
});

type PayCurrency = (typeof PAY_CURRENCIES)[number];
const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = { mada: CreditCard, credit_card: CreditCard, bank_transfer: Building2 };
const METHOD_HINT: Record<PaymentMethod, readonly [string, string]> = {
  mada: ["Saudi debit cards", "بطاقات الصراف السعودية"],
  credit_card: ["Visa and Mastercard", "فيزا وماستركارد"],
  bank_transfer: ["Best for large amounts", "الأنسب للمبالغ الكبيرة"],
};
const QUOTE_SECONDS = 15 * 60;
/** Customer-facing payment reference (never the provider's id; D-68). */
const insightRef = (id: string) => `PAY-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function CheckoutPage() {
  const { dealId: ref } = Route.useParams();
  const { text } = useLocale();
  const qc = useQueryClient();
  const { user } = useSessionUser();
  const dealQ = useQuery({ queryKey: ["deal", ref], queryFn: () => getDealByRef(ref) });
  const deal = dealQ.data ?? null;
  const milestonesQ = useMilestones(deal?.id);
  const pricingFn = useServerFn(getDealPricing);
  const quoteFn = useServerFn(requestFxQuote);
  const fundFn = useServerFn(startDealFunding);
  const [method, setMethod] = useState<PaymentMethod>(DEFAULT_METHOD);
  const [payCurrency, setPayCurrency] = useState<PayCurrency | undefined>(undefined);
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const paidQuote = useRef<FxQuote | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const pricing = useQuery({
    queryKey: ["checkout-pricing", deal?.id, payCurrency, method],
    queryFn: () => pricingFn({ data: { dealId: deal!.id, payCurrency, method } }),
    enabled: !!deal,
  });
  const methods = pricing.data?.methods ?? [];
  const allowed = (m: PaymentMethod) => methods.find((x) => x.method === m)?.allowed ?? false;
  // Start on the first available method.
  useEffect(() => { if (methods.length && !allowed(method)) { const first = PAYMENT_METHODS.find((m) => allowed(m)); if (first) setMethod(first); } }, [methods.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const perMilestone = (deal as any)?.funding_mode === "per_milestone";
  const nextToFund = perMilestone ? (milestonesQ.data ?? []).find((m) => m.status === "pending") ?? null : null;
  const isBuyer = !!user && deal?.buyer_id === user.id;
  const canFund = !!deal && !deal.frozen && isBuyer && deal.terms_status === "agreed" && !!deal.seller_id &&
    (perMilestone ? ["pending_funding", "in_progress"].includes(deal.status) && !!nextToFund : deal.status === "pending_funding");

  // Lock the amount (15-minute rate) whenever the method or currency changes.
  const currency = payCurrency ?? (pricing.data?.payIn.payCurrency as PayCurrency | undefined);
  const [quoteTick, setQuoteTick] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  useEffect(() => {
    if (!canFund || !pricing.data || !allowed(method)) { setQuote(null); return; }
    let live = true;
    setQuoteError(null);
    // Keep the previous amount on screen (dimmed) so the new one counts over from it; paying waits for the new quote.
    setQuoteLoading(true);
    quoteFn({ data: { dealId: deal!.id, method, payCurrency: currency } })
      .then((q) => { if (live) setQuote(q); })
      .catch((e) => { if (live) { setQuote(null); setQuoteError(e instanceof Error ? e.message : "Quote unavailable."); } })
      .finally(() => { if (live) setQuoteLoading(false); });
    return () => { live = false; };
  }, [canFund, method, currency, pricing.data?.payIn.payCurrency, deal?.id, quoteTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const secondsLeft = quote ? Math.max(0, Math.floor((new Date(quote.expires_at).getTime() - now) / 1000)) : 0;
  const expired = !!quote && secondsLeft === 0;
  const pay = useMutation({
    // Hold the processing screen for a moment so the buyer can follow each step.
    mutationFn: async (simulateDecline?: boolean) => {
      paidQuote.current = quote;
      const [r] = await Promise.all([fundFn({ data: { dealId: deal!.id, quoteId: quote!.id, ...(simulateDecline ? { simulateDecline: true } : {}) } }), sleep(2400)]);
      return r;
    },
    onSuccess: (r: PaymentResult) => { void qc.invalidateQueries({ queryKey: ["deal", ref] }); if (!r.ok) setQuote(null); },
  });
  const simulated = true; // only the simulated provider is connected today
  const money = (n: number, c: string) => formatMoney(n, c);
  const mmss = useMemo(() => `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`, [secondsLeft]);

  if (dealQ.isPending) return <CheckoutSkeleton />;
  if (!deal) return <p data-no-localize>{text("Deal not found.", "الصفقة غير موجودة.")}</p>;

  if (pay.data) {
    return <ResultScreen r={pay.data} q={paidQuote.current} dealRef={ref} dealTitle={deal.title} method={method}
      onRetry={() => { pay.reset(); setQuoteTick((t) => t + 1); }} />;
  }

  if (!canFund) {
    return (
      <div data-no-localize><div className="mx-auto max-w-lg py-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-primary"><Lock className="size-7" /></span>
        <h1 className="mt-4 text-2xl font-bold">{text("Nothing to pay right now", "لا يوجد ما يُدفع الآن")}</h1>
        <p className="mt-3 text-muted-foreground">{deal.terms_status !== "agreed" ? text("Both parties must accept the terms before paying.", "يجب أن يوافق الطرفان على الشروط قبل الدفع.") : text("This deal is not waiting for your payment.", "هذه الصفقة لا تنتظر دفعاً منك.")}</p>
        <Button asChild className="mt-6"><Link to="/deals/$dealId" params={{ dealId: ref }}>{text("Back to the deal", "العودة إلى الصفقة")}</Link></Button>
      </div></div>
    );
  }

  const payLabel = quote ? `${text("Pay", "ادفع")} ${money(quote.total, quote.target_currency)}` : text("Preparing your amount…", "جارٍ تجهيز المبلغ…");

  return (
    <div data-no-localize className="min-w-0">
      {pay.isPending && <ProcessingOverlay method={method} />}
      <Link to="/deals/$dealId" params={{ dealId: ref }} className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 ltr:rotate-180 ltr:group-hover:-translate-x-0.5" />{text("Back to the deal", "العودة إلى الصفقة")}</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-bold"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Lock className="size-5" /></span>{text("Secure payment", "الدفع الآمن")}</h1>
        <AcceptedBadges />
      </div>
      <Stepper />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold">{text("How would you like to pay?", "كيف تريد أن تدفع؟")}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup">
              {PAYMENT_METHODS.map((m, i) => {
                const c = methods.find((x) => x.method === m); const ok = c?.allowed ?? false; const Icon = METHOD_ICON[m]; const on = method === m;
                const loading = pricing.isPending && !c;
                return (
                  <button key={m} type="button" role="radio" aria-checked={on} disabled={!ok} onClick={() => setMethod(m)}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className={`group relative flex min-h-[84px] items-start gap-3 overflow-hidden rounded-2xl border bg-card p-4 text-start transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both disabled:cursor-not-allowed disabled:opacity-55 ${on ? "border-primary shadow-[0_10px_30px_-16px_rgb(19_128_101/0.65)] ring-2 ring-primary/25" : "border-border enabled:hover:-translate-y-0.5 enabled:hover:border-primary/50 enabled:hover:shadow-md"} enabled:active:scale-[0.99]`}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-accent text-primary"}`}><Icon className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block">{text(METHOD_LABEL[m][0], METHOD_LABEL[m][1])}</b>
                      {loading ? <span className="checkout-skeleton mt-1.5 block h-3 w-24" />
                        : !ok && c?.reason ? <span className="mt-0.5 block text-xs text-muted-foreground">{text(c.reason[0], c.reason[1])}</span>
                        : <span className="mt-0.5 block text-xs text-muted-foreground">{text(METHOD_HINT[m][0], METHOD_HINT[m][1])}</span>}
                      {METHOD_BRANDS[m].length > 0 && <PaymentMarks brands={[...METHOD_BRANDS[m]]} size="sm" className="mt-2" />}
                    </span>
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all ${on ? "border-primary bg-primary text-primary-foreground checkout-pop" : "border-border"}`}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
                  </button>
                );
              })}
              <div className="relative flex min-h-[84px] items-center justify-between gap-3 rounded-2xl border border-dashed p-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: "180ms" }}>
                <span className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-black px-4 opacity-60" aria-hidden><img src="/brand/payments/applepay-white.svg" alt="" className="h-6 w-auto" /></span>
                <span className="shrink-0 rounded-full bg-gold-subtle px-2.5 py-1 text-[11px] font-semibold text-gold-foreground">{text("Apple Pay · soon", "Apple Pay · قريباً")}</span>
              </div>
            </div>
          </fieldset>

          <div>
            <p className="text-sm font-semibold">{text("Pay in", "الدفع بعملة")}</p>
            <div role="radiogroup" aria-label={text("Pay-in currency", "عملة الدفع")} className="mt-2 flex flex-wrap gap-2" dir="ltr">
              {PAY_CURRENCIES.map((c) => {
                const on = currency === c;
                return <button key={c} type="button" role="radio" aria-checked={on} onClick={() => setPayCurrency(c)}
                  className={`h-9 min-w-14 rounded-full border px-3 text-sm font-semibold tabular-nums transition-all active:scale-95 ${on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-primary/50 hover:text-primary"}`}>{c}</button>;
              })}
            </div>
          </div>

          <SecureFields method={method} simulated={simulated} />

          {quoteError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive animate-in fade-in">{quoteError}</p>}
          {pay.isError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive animate-in fade-in">{(pay.error as Error).message}</p>}

          {/* Pay bar: sticky at the bottom on phones so the total and the button are always in reach. */}
          <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="mb-2 flex items-center justify-between text-sm lg:hidden">
              <span className="text-muted-foreground">{text("Total", "الإجمالي")}</span>
              {quote ? <b className="tabular-nums"><AnimatedMoney value={quote.total} currency={quote.target_currency} /></b> : <span className="checkout-skeleton h-4 w-24" />}
            </div>
            <Button size="lg" className="group relative h-14 w-full overflow-hidden rounded-2xl text-base shadow-[0_14px_30px_-14px_rgb(19_128_101/0.8)] transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 enabled:active:scale-[0.99]" disabled={!quote || quoteLoading || expired || pay.isPending} onClick={() => pay.mutate(false)}>
              {quote && !expired && <span className="checkout-sheen pointer-events-none absolute inset-0" />}
              <Lock className="size-4" />
              <span className="relative">{payLabel}</span>
            </Button>
            {quote && !expired && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <CountdownRing seconds={secondsLeft} total={QUOTE_SECONDS} />
                <span>{text("Amount and exchange rate held for", "المبلغ وسعر الصرف ثابتان لمدة")} <bdi className="font-semibold tabular-nums text-foreground">{mmss}</bdi></span>
              </div>
            )}
            {expired && (
              <p role="status" className="mt-3 flex items-center justify-center gap-2 text-xs text-warning">{text("The held amount expired.", "انتهت مدة تثبيت المبلغ.")}
                <button type="button" className="inline-flex items-center gap-1 font-semibold underline" onClick={() => setQuoteTick((t) => t + 1)}><RotateCcw className="size-3" />{text("Get a new amount", "احصل على مبلغ جديد")}</button></p>
            )}
            {simulated && quote && !expired && <p className="mt-1 text-center"><button type="button" className="text-xs text-muted-foreground underline" disabled={pay.isPending || quoteLoading} onClick={() => pay.mutate(true)}>{text("Simulate a declined payment (demo)", "محاكاة رفض الدفع (تجريبي)")}</button></p>}
          </div>
        </div>

        <aside className="lg:sticky lg:top-6">
          <Card className="overflow-hidden"><CardContent className="p-0">
            <div className="relative overflow-hidden bg-brand-strong p-5 text-white">
              <svg aria-hidden className="pointer-events-none absolute -end-8 -top-8 size-36 opacity-[0.12]" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96" fill="none" stroke="white" strokeWidth="2" /><circle cx="100" cy="100" r="64" fill="none" stroke="white" strokeWidth="2" /><circle cx="100" cy="100" r="32" fill="none" stroke="white" strokeWidth="2" /></svg>
              <p className="text-xs text-white/70">{text("You are paying into", "تدفع في الصفقة")}</p>
              <p className="mt-1 text-lg font-semibold">{deal.title}</p>
              <p className="mt-0.5 font-mono text-xs text-white/70" dir="ltr">{deal.ref}{nextToFund ? ` · ${text("milestone", "المرحلة")} ${nextToFund.seq}` : ""}</p>
            </div>
            <div className="p-5">
              {quote ? (
                <dl aria-busy={quoteLoading} className={`space-y-3 text-sm transition-opacity duration-200 ${quoteLoading ? "opacity-45" : "opacity-100"}`}>
                  <Row k={quote.milestone ? text("Milestone amount", "مبلغ المرحلة") : text("Deal amount", "مبلغ الصفقة")} v={money(quote.customer_amount, quote.target_currency)} />
                  <Row k={text("Your share of Insight's fee", "حصتك من رسوم إنسايت")} v={money(quote.fee, quote.target_currency)} />
                  <Row k={quote.breakdown.buyerVatRate === 0 ? text("VAT", "الضريبة") : `${text("VAT", "الضريبة")} ${Math.round(quote.breakdown.buyerVatRate * 100)}%`} v={quote.breakdown.buyerVatRate === 0 ? text("None", "لا توجد") : money(quote.vat, quote.target_currency)} />
                  <div className="flex items-baseline justify-between gap-3 border-t pt-3"><dt className="font-semibold">{text("Total", "الإجمالي")}</dt><dd className="text-2xl font-bold tabular-nums text-primary"><bdi><AnimatedMoney value={quote.total} currency={quote.target_currency} /></bdi></dd></div>
                  {quote.source_currency !== quote.target_currency && <p className="rounded-lg bg-muted px-2.5 py-1.5 text-xs leading-5 text-muted-foreground">{text("Rate", "سعر الصرف")}: <bdi dir="ltr">1 {quote.source_currency} = {quote.customer_rate} {quote.target_currency}</bdi></p>}
                </dl>
              ) : (
                <div className="space-y-3" aria-label={text("Preparing your amount…", "جارٍ تجهيز المبلغ…")}>
                  {[0, 1, 2].map((i) => <div key={i} className="flex justify-between"><span className="checkout-skeleton h-4 w-28" /><span className="checkout-skeleton h-4 w-16" /></div>)}
                  <div className="flex justify-between border-t pt-3"><span className="checkout-skeleton h-5 w-16" /><span className="checkout-skeleton h-7 w-28" /></div>
                </div>
              )}
              <ul className="mt-5 space-y-2.5 rounded-xl bg-accent/60 p-4 text-xs leading-5">
                {[[ShieldCheck, text("Held in the deal, not paid to the other party yet", "يُحفظ في الصفقة، ولا يُحوَّل للطرف الآخر الآن")],
                  [SearchCheck, text("Paid out only after delivery and your checking time", "لا يُحوَّل إلا بعد التسليم ومدة الفحص")],
                  [RotateCcw, text("Something wrong? Open a case before the money moves", "هناك خطأ؟ افتح طلباً قبل أن يتحرك المبلغ")]].map(([Icon, t], i) => {
                  const I = Icon as typeof ShieldCheck;
                  return <li key={i} className="flex items-start gap-2"><I className="mt-0.5 size-4 shrink-0 text-primary" /><span>{t as string}</span></li>;
                })}
              </ul>
            </div>
          </CardContent></Card>
          <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">{simulated
            ? text("Demo: the payment provider is simulated. At launch, payments are processed by a licensed payment provider and card details never pass through Insight.", "نسخة تجريبية: مزوّد الدفع محاكى. عند الإطلاق تُعالَج المدفوعات عبر مزوّد دفع مرخّص، ولا تمر بيانات البطاقة على إنسايت.")
            : text("Payments are processed by a licensed payment provider. Card details never pass through Insight.", "تُعالَج المدفوعات عبر مزوّد دفع مرخّص، ولا تمر بيانات البطاقة على إنسايت.")}</p>
        </aside>
      </div>
    </div>
  );
}

/** Where the buyer is: terms agreed → pay → held in the deal. */
function Stepper({ done = false }: { done?: boolean }) {
  const { text } = useLocale();
  const steps = [text("Terms agreed", "الشروط متفق عليها"), text("Payment", "الدفع"), text("Held in the deal", "محفوظ في الصفقة")];
  const current = done ? 3 : 1;
  return (
    <ol className="mt-5 flex items-center gap-2 text-xs sm:text-sm" aria-label={text("Payment steps", "خطوات الدفع")}>
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <li key={s} className="flex min-w-0 flex-1 items-center gap-2" aria-current={state === "now" ? "step" : undefined}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${state === "done" ? "bg-primary text-primary-foreground" : state === "now" ? "bg-primary/15 text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground"}`}>{state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}</span>
            <span className={`truncate ${state === "next" ? "text-muted-foreground" : "font-medium"}`}>{s}</span>
            {i < steps.length - 1 && <span className="h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-muted"><span className={`block h-full bg-primary transition-all duration-700 ${i < current ? "w-full" : "w-0"}`} /></span>}
          </li>
        );
      })}
    </ol>
  );
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 8; const c = 2 * Math.PI * r; const f = Math.max(0, Math.min(1, seconds / total));
  const tone = seconds < 60 ? "text-warning" : "text-primary";
  return (
    <svg viewBox="0 0 20 20" className={`size-5 -rotate-90 ${tone}`} aria-hidden>
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f)} style={{ transition: "stroke-dashoffset 1s linear" }} />
    </svg>
  );
}

/** Counts up to a new amount so changes of method or currency are easy to notice. */
function AnimatedMoney({ value, currency }: { value: number; currency: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current; const t0 = performance.now(); const dur = 550; let raf = 0;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(value); from.current = value; return; }
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur); const e = 1 - (1 - p) ** 3;
      setShown(start + (value - start) * e);
      if (p < 1) raf = requestAnimationFrame(step); else { from.current = value; setShown(value); }
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value]);
  return <>{formatMoney(shown, currency)}</>;
}

function ProcessingOverlay({ method }: { method: PaymentMethod }) {
  const { text } = useLocale();
  const steps = [
    text("Securing the connection", "تأمين الاتصال"),
    method === "bank_transfer" ? text("Preparing the transfer", "تجهيز التحويل") : text("Confirming with your card issuer", "التأكيد مع جهة إصدار البطاقة"),
    text("Holding the amount in the deal", "حفظ المبلغ في الصفقة"),
  ];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(steps.length - 1, x + 1)), 800); return () => clearInterval(t); }, [steps.length]);
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="relative mx-auto grid size-16 place-items-center">
          <span className="checkout-pulse absolute inset-0 rounded-full bg-primary/30" />
          <span className="relative grid size-16 place-items-center rounded-full bg-primary text-primary-foreground"><Lock className="size-7" /></span>
        </div>
        <p className="mt-4 text-center font-semibold">{text("Processing your payment", "جارٍ معالجة الدفع")}</p>
        <p className="mt-1 text-center text-xs text-muted-foreground">{text("Please keep this page open.", "يرجى إبقاء هذه الصفحة مفتوحة.")}</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted"><span className="checkout-progress block h-full rounded-full bg-primary" style={{ ["--dur" as string]: "2.4s" }} /></div>
        <ol className="mt-4 space-y-2 text-sm">
          {steps.map((s, k) => (
            <li key={s} className={`flex items-center gap-2 transition-opacity duration-300 ${k <= i ? "opacity-100" : "opacity-40"}`}>
              <span className={`grid size-5 place-items-center rounded-full ${k < i ? "bg-primary text-primary-foreground" : k === i ? "border-2 border-primary border-t-transparent animate-spin" : "border-2 border-border"}`}>{k < i && <Check className="size-3" strokeWidth={3} />}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ResultScreen({ r, q, dealRef, dealTitle, method, onRetry }: { r: PaymentResult; q: FxQuote | null; dealRef: string; dealTitle: string; method: PaymentMethod; onRetry: () => void }) {
  const { text } = useLocale();
  if (!r.ok) {
    return (
      <div data-no-localize><div className="mx-auto max-w-lg py-10 text-center">
        <span className="checkout-pop mx-auto grid size-20 place-items-center rounded-full bg-destructive/10 text-destructive"><XCircle className="size-10" /></span>
        <h1 className="mt-5 text-2xl font-bold">{text("The payment did not go through", "لم يكتمل الدفع")}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{text("No money was taken. You can try again or choose another payment method.", "لم يُخصم أي مبلغ. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.")}</p>
        {r.message && <p className="mt-4 rounded-xl border bg-muted/60 px-4 py-3 text-sm">{text(r.message, translateText(r.message))}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={onRetry}><RotateCcw className="size-4" />{text("Try again", "حاول مرة أخرى")}</Button>
          <Button asChild variant="outline"><Link to="/deals/$dealId" params={{ dealId: dealRef }}>{text("Back to the deal", "العودة إلى الصفقة")}</Link></Button>
        </div>
      </div></div>
    );
  }
  const next = [
    { icon: Wallet, t: text("Payment held in the deal", "المبلغ محفوظ في الصفقة"), d: text("Done just now", "تم الآن"), done: true },
    { icon: Truck, t: text("The other party delivers", "الطرف الآخر يسلّم"), d: text("We have told them to start", "أبلغناه بالبدء"), done: false },
    { icon: SearchCheck, t: text("You check what you received", "تفحص ما استلمته"), d: text("Within the agreed checking time", "خلال مدة الفحص المتفق عليها"), done: false },
    { icon: PackageCheck, t: text("Paid out to the other party", "يُحوَّل للطرف الآخر"), d: text("Only after you confirm, or the checking time ends", "بعد تأكيدك فقط، أو انتهاء مدة الفحص"), done: false },
  ];
  return (
    <div data-no-localize><div className="mx-auto max-w-xl py-6">
      <div className="text-center">
        <div className="relative mx-auto grid size-24 place-items-center">
          <span className="checkout-pulse absolute inset-0 rounded-full bg-primary/25" />
          <svg viewBox="0 0 52 52" className="checkout-pop relative size-24" aria-hidden>
            <circle cx="26" cy="26" r="24" className="fill-primary" />
            <path d="M15 27l7 7 15-16" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="checkout-draw" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold animate-in fade-in slide-in-from-bottom-2 fill-mode-both delay-300">{text("Payment received", "تم استلام الدفع")}</h1>
        <p className="mt-2 leading-7 text-muted-foreground animate-in fade-in fill-mode-both delay-500">{text("The amount is now held in the deal. The other party is told to deliver; you confirm when you receive it.", "المبلغ الآن محفوظ في الصفقة. سيُبلَّغ الطرف الآخر بالتسليم، وتؤكد أنت عند الاستلام.")}</p>
      </div>

      <Card className="mt-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 fill-mode-both delay-500 duration-500"><CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-5 py-3">
          <img src="/brand/insight-logo.svg" alt="Insight" className="h-5 w-auto" />
          <span className="text-xs text-muted-foreground">{new Date().toLocaleString()}</span>
        </div>
        <dl className="space-y-3 p-5 text-sm">
          <Row k={text("Deal", "الصفقة")} v={`${dealTitle} · ${dealRef}`} />
          {r.transactionId && <Row k={text("Payment reference", "مرجع الدفع")} v={insightRef(r.transactionId)} mono />}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><dt className="text-muted-foreground">{text("Paid with", "طريقة الدفع")}</dt><dd className="flex items-center gap-2">{METHOD_BRANDS[method].length > 0 && <PaymentMarks brands={[...METHOD_BRANDS[method]]} size="sm" />}<span>{text(METHOD_LABEL[method][0], METHOD_LABEL[method][1])}</span></dd></div>
          {q && <div className="flex items-baseline justify-between border-t pt-3"><dt className="font-semibold">{text("Amount paid", "المبلغ المدفوع")}</dt><dd className="text-xl font-bold tabular-nums text-primary"><bdi>{formatMoney(q.total, q.target_currency)}</bdi></dd></div>}
        </dl>
      </CardContent></Card>

      <div className="mt-6">
        <p className="text-sm font-semibold">{text("What happens next", "ماذا يحدث بعد ذلك")}</p>
        <ol className="mt-3 space-y-0">
          {next.map((s, i) => (
            <li key={i} className="relative flex gap-3 pb-5 last:pb-0 animate-in fade-in slide-in-from-bottom-1 fill-mode-both" style={{ animationDelay: `${700 + i * 120}ms` }}>
              {i < next.length - 1 && <span className="absolute start-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 bg-border" />}
              <span className={`relative grid size-9 shrink-0 place-items-center rounded-full ${s.done ? "bg-primary text-primary-foreground" : "bg-accent text-primary"}`}><s.icon className="size-4" /></span>
              <span className="pt-1"><b className="block text-sm">{s.t}</b><span className="text-xs text-muted-foreground">{s.d}</span></span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild size="lg"><Link to="/deals/$dealId" params={{ dealId: dealRef }}>{text("Go to the deal", "اذهب إلى الصفقة")}</Link></Button>
        <Button size="lg" variant="outline" onClick={() => window.print()}><Printer className="size-4" />{text("Print receipt", "اطبع الإيصال")}</Button>
      </div>
    </div></div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true">
      <span className="checkout-skeleton block h-4 w-32" />
      <span className="checkout-skeleton block h-9 w-56" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <span key={i} className="checkout-skeleton block h-[84px] rounded-2xl" />)}</div>
        <span className="checkout-skeleton block h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><dt className="text-muted-foreground">{k}</dt><dd className={`text-end tabular-nums ${mono ? "font-mono text-xs tracking-wider" : ""}`}><bdi>{v}</bdi></dd></div>;
}
