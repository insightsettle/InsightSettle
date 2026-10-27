import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Building2, CheckCircle2, CreditCard, Lock, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AcceptedBadges, SecureFields } from "@/components/checkout/SecureFields";
import { useMilestones } from "@/components/deal/DealPanels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionUser } from "@/hooks/use-session";
import { getDealByRef } from "@/lib/deals";
import { getDealPricing, requestFxQuote, PAY_CURRENCIES, type FxQuote } from "@/lib/fx-quotes.functions";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { DEFAULT_METHOD, METHOD_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-methods";
import { startDealFunding, type PaymentResult } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/pay/$dealId")({
  head: () => ({ meta: [{ title: "Secure payment | Insight" }, { name: "description", content: "Pay into your Insight deal. The amount stays held until delivery is confirmed." }] }),
  component: CheckoutPage,
});

type PayCurrency = (typeof PAY_CURRENCIES)[number];
const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = { mada: CreditCard, credit_card: CreditCard, bank_transfer: Building2 };

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
  useEffect(() => {
    if (!canFund || !pricing.data || !allowed(method)) { setQuote(null); return; }
    let live = true;
    setQuoteError(null);
    quoteFn({ data: { dealId: deal!.id, method, payCurrency: currency } })
      .then((q) => { if (live) setQuote(q); })
      .catch((e) => { if (live) { setQuote(null); setQuoteError(e instanceof Error ? e.message : "Quote unavailable."); } });
    return () => { live = false; };
  }, [canFund, method, currency, pricing.data?.payIn.payCurrency, deal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const secondsLeft = quote ? Math.max(0, Math.floor((new Date(quote.expires_at).getTime() - now) / 1000)) : 0;
  const expired = !!quote && secondsLeft === 0;
  const pay = useMutation({
    mutationFn: (simulateDecline?: boolean) => fundFn({ data: { dealId: deal!.id, quoteId: quote!.id, ...(simulateDecline ? { simulateDecline: true } : {}) } }),
    onSuccess: (r: PaymentResult) => { void qc.invalidateQueries({ queryKey: ["deal", ref] }); if (!r.ok) setQuote(null); },
  });
  const simulated = true; // only the simulated provider is connected today
  const money = (n: number, c: string) => formatMoney(n, c);
  const mmss = useMemo(() => `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`, [secondsLeft]);

  if (dealQ.isPending) return <p data-no-localize className="text-muted-foreground">{text("Loading…", "جارٍ التحميل…")}</p>;
  if (!deal) return <p data-no-localize>{text("Deal not found.", "الصفقة غير موجودة.")}</p>;

  // Result screen
  if (pay.data) {
    const r = pay.data;
    return (
      <div data-no-localize className="mx-auto max-w-lg py-10 text-center">
        {r.ok ? <CheckCircle2 className="mx-auto size-14 text-primary" /> : <XCircle className="mx-auto size-14 text-destructive" />}
        <h1 className="mt-4 text-2xl font-bold">{r.ok ? text("Payment received", "تم استلام الدفع") : text("The payment did not go through", "لم يكتمل الدفع")}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{r.ok
          ? text("The amount is now held in the deal. The other party is told to deliver; you confirm when you receive it.", "المبلغ الآن محفوظ في الصفقة. سيُبلَّغ الطرف الآخر بالتسليم، وتؤكد أنت عند الاستلام.")
          : text("No money was taken. You can try again or choose another payment method.", "لم يُخصم أي مبلغ. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild><Link to="/deals/$dealId" params={{ dealId: ref }}>{text("Back to the deal", "العودة إلى الصفقة")}</Link></Button>
          {!r.ok && <Button variant="outline" onClick={() => pay.reset()}>{text("Try again", "حاول مرة أخرى")}</Button>}
        </div>
      </div>
    );
  }

  if (!canFund) {
    return (
      <div data-no-localize className="mx-auto max-w-lg py-10 text-center">
        <h1 className="text-2xl font-bold">{text("Nothing to pay right now", "لا يوجد ما يُدفع الآن")}</h1>
        <p className="mt-3 text-muted-foreground">{deal.terms_status !== "agreed" ? text("Both parties must accept the terms before paying.", "يجب أن يوافق الطرفان على الشروط قبل الدفع.") : text("This deal is not waiting for your payment.", "هذه الصفقة لا تنتظر دفعاً منك.")}</p>
        <Button asChild className="mt-6"><Link to="/deals/$dealId" params={{ dealId: ref }}>{text("Back to the deal", "العودة إلى الصفقة")}</Link></Button>
      </div>
    );
  }

  return (
    <div data-no-localize className="min-w-0">
      <Link to="/deals/$dealId" params={{ dealId: ref }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="size-4 ltr:rotate-180" />{text("Back to the deal", "العودة إلى الصفقة")}</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Lock className="size-6 text-primary" />{text("Secure payment", "الدفع الآمن")}</h1>
        <AcceptedBadges />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold">{text("How would you like to pay?", "كيف تريد أن تدفع؟")}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
              {PAYMENT_METHODS.map((m) => {
                const c = methods.find((x) => x.method === m); const ok = c?.allowed ?? false; const Icon = METHOD_ICON[m];
                return (
                  <button key={m} type="button" role="radio" aria-checked={method === m} disabled={!ok} onClick={() => setMethod(m)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-start transition disabled:cursor-not-allowed disabled:opacity-50 ${method === m ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}>
                    <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                    <span className="min-w-0"><b className="block">{text(METHOD_LABEL[m][0], METHOD_LABEL[m][1])}</b>
                      {!ok && c?.reason && <span className="mt-0.5 block text-xs text-muted-foreground">{text(c.reason[0], c.reason[1])}</span>}</span>
                  </button>
                );
              })}
              <button type="button" role="radio" aria-checked={false} disabled className="flex cursor-not-allowed items-start gap-3 rounded-xl border p-4 text-start opacity-50">
                <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" /><span><b className="block">Apple Pay</b><span className="mt-0.5 block text-xs text-muted-foreground">{text("Coming soon", "قريباً")}</span></span>
              </button>
            </div>
          </fieldset>

          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{text("Pay in", "الدفع بعملة")}</span>
            <select aria-label={text("Pay-in currency", "عملة الدفع")} className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={currency ?? ""} onChange={(e) => setPayCurrency(e.target.value as PayCurrency)}>
              {PAY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <SecureFields method={method} simulated={simulated} />

          {quoteError && <p role="alert" className="text-sm text-destructive">{quoteError}</p>}
          {pay.isError && <p role="alert" className="text-sm text-destructive">{(pay.error as Error).message}</p>}
          <Button size="lg" className="h-12 w-full text-base" disabled={!quote || expired || pay.isPending} onClick={() => pay.mutate(false)}>
            <Lock className="size-4" />
            {pay.isPending ? text("Processing…", "جارٍ المعالجة…") : quote ? `${text("Pay", "ادفع")} ${money(quote.total, quote.target_currency)}` : text("Preparing your amount…", "جارٍ تجهيز المبلغ…")}
          </Button>
          {quote && !expired && <p className="text-center text-xs text-muted-foreground">{text("Amount and exchange rate held for", "المبلغ وسعر الصرف ثابتان لمدة")} <bdi className="font-semibold tabular-nums">{mmss}</bdi></p>}
          {expired && <p role="status" className="text-center text-xs text-warning">{text("The held amount expired. Change the method or currency, or reload, for a new amount.", "انتهت مدة تثبيت المبلغ. غيّر الطريقة أو العملة أو أعد تحميل الصفحة لمبلغ جديد.")}</p>}
          {simulated && quote && !expired && <p className="text-center"><button type="button" className="text-xs text-muted-foreground underline" disabled={pay.isPending} onClick={() => pay.mutate(true)}>{text("Simulate a declined payment (demo)", "محاكاة رفض الدفع (تجريبي)")}</button></p>}
        </div>

        <aside className="lg:sticky lg:top-6">
          <Card><CardContent className="p-6">
            <p className="text-xs text-muted-foreground">{text("You are paying into", "تدفع في الصفقة")}</p>
            <p className="mt-1 font-semibold">{deal.title}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{deal.ref}{nextToFund ? ` · ${text("milestone", "المرحلة")} ${nextToFund.seq}` : ""}</p>
            {quote ? (
              <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
                <Row k={quote.milestone ? text("Milestone amount", "مبلغ المرحلة") : text("Deal amount", "مبلغ الصفقة")} v={money(quote.customer_amount, quote.target_currency)} />
                <Row k={text("Your share of Insight's fee", "حصتك من رسوم إنسايت")} v={money(quote.fee, quote.target_currency)} />
                <Row k={quote.breakdown.buyerVatRate === 0 ? text("VAT", "الضريبة") : `${text("VAT", "الضريبة")} ${Math.round(quote.breakdown.buyerVatRate * 100)}%`} v={quote.breakdown.buyerVatRate === 0 ? text("None", "لا توجد") : money(quote.vat, quote.target_currency)} />
                <div className="border-t pt-3"><Row strong k={text("Total", "الإجمالي")} v={money(quote.total, quote.target_currency)} /></div>
                {quote.source_currency !== quote.target_currency && <p className="text-xs leading-5 text-muted-foreground">{text("Rate", "سعر الصرف")}: <bdi dir="ltr">1 {quote.source_currency} = {quote.customer_rate} {quote.target_currency}</bdi></p>}
              </dl>
            ) : <p className="mt-5 border-t pt-4 text-sm text-muted-foreground">{text("Preparing your amount…", "جارٍ تجهيز المبلغ…")}</p>}
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-accent/60 p-3 text-xs leading-5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>{text("Your payment stays held in the deal and is paid to the other party only after delivery and the checking time. If something is wrong, you open a case before the money moves.",
                "يبقى مبلغك محفوظاً في الصفقة، ولا يُحوَّل للطرف الآخر إلا بعد التسليم ومدة الفحص. وإن كان هناك خطأ تفتح طلباً قبل أن يتحرك المبلغ.")}</p>
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

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><dt className={strong ? "font-semibold" : "text-muted-foreground"}>{k}</dt><dd className={`text-end tabular-nums ${strong ? "text-lg font-bold" : ""}`}><bdi>{v}</bdi></dd></div>;
}
