import { BadgeCheck } from "@/components/icons";
import { IconTile } from "@/components/site/Marketing";
import { PackageCheck, Wallet } from "@/components/icons";
import { cap, feePayerLabel, rolesFor } from "@/lib/roles";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicPricing } from "@/lib/public-pricing.functions";
import { normalizeCountry } from "@/lib/fees";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { gccCountries, type FeePayer } from "@/lib/deals";
import { DEAL_TYPE_META, MilestoneEditor, toInput, type EditableMilestone } from "@/components/deal/DealPanels";
import { createTypedDeal } from "@/lib/deal-milestones.functions";
import { DEAL_TYPES, DEAL_TYPE_DEFAULTS, validateMilestones, type DealType } from "@/lib/milestones";

import { CustodyNote, FormStepper } from "@/components/deal/DealPresentation";
import { useLocale } from "@/lib/locale";
import { ShareLink } from "@/components/share/ShareLink";
import { DEAL_TEMPLATES, templateMilestoneAmounts, type DealTemplate } from "@/lib/deal-templates";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import { fxCurrencies } from "@/lib/fx";
import { retentionFormValues } from "@/lib/milestone-editor";

export const Route = createFileRoute("/_authenticated/deals/new")({
  head: () => ({
    meta: [
      { title: "Create a deal | Insight" },
      {
        name: "description",
        content: "Open a new escrow deal and invite the other party with a secure link.",
      },
      { property: "og:title", content: "Create an escrow deal" },
      { property: "og:description", content: "Set the amount, terms, and delivery date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewDeal,
});

const blankRow = (): EditableMilestone => ({ title: "", amount: "", dueDate: "", evidenceRequired: "", kind: "work" });

function NewDeal() {
  const { text, locale } = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [dealType, setDealType] = useState<DealType | null>(null);
  const R = rolesFor(dealType);
  const RC = { payer: cap(R.payer), payee: cap(R.payee) };
  const [useMilestones, setUseMilestones] = useState(false);
  const [rows, setRows] = useState<EditableMilestone[]>([blankRow(), blankRow()]);
  const [retention, setRetention] = useState("5");
  const [retentionEnabled, setRetentionEnabled] = useState(false);
  const [fundingMode, setFundingMode] = useState<"upfront" | "per_milestone">("upfront");
  const [dlp, setDlp] = useState("90");
  const [revisions, setRevisions] = useState("2");
  const createFn = useServerFn(createTypedDeal);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BHD"); // D-69: launch from Bahrain; every currency stays available
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [counterpartyEmail, setCounterpartyEmail] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [feePayer, setFeePayer] = useState<FeePayer>("buyer");
  const [inspectionDays, setInspectionDays] = useState("3");
  const [shippingRequired, setShippingRequired] = useState(true);
  const [quantity, setQuantity] = useState("1");
  const [supplierCountry, setSupplierCountry] = useState("BH");
  const [deliveryCountry, setDeliveryCountry] = useState("BH");
  const [shippingResponsibility, setShippingResponsibility] = useState<"seller" | "buyer" | "none">("seller");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [refundConditions, setRefundConditions] = useState("");
  const [cancellationConditions, setCancellationConditions] = useState("");
  const [autoRelease, setAutoRelease] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ ref: string; invite_token: string } | null>(null);

  const numericAmount = Number(amount) || 0;
  // Live summary: the same server pricing as the public calculator (indicative until the deal quote).
  const pricingFn = useServerFn(publicPricing);
  const [debounced, setDebounced] = useState(numericAmount);
  useEffect(() => { const t = setTimeout(() => setDebounced(numericAmount), 400); return () => clearTimeout(t); }, [numericAmount]);
  const codes = ["SA", "BH", "AE", "KW", "QA", "OM", "OTHER"] as const;
  const asCode = (c: string) => (codes as readonly string[]).includes(normalizeCountry(c) ?? "") ? (normalizeCountry(c) as (typeof codes)[number]) : "SA";
  const live = useQuery({
    queryKey: ["new-deal-pricing", debounced, currency, feePayer, supplierCountry, deliveryCountry],
    queryFn: () => pricingFn({ data: { amount: debounced, currency: currency as "SAR", payer: feePayer as "buyer", buyerCountry: asCode(deliveryCountry), supplierCountry: asCode(supplierCountry) } }),
    enabled: debounced > 0,
    staleTime: 60_000,
  });
  const lb = live.data && live.data.available ? live.data.breakdown : null;
  const milestonesOn = dealType === "contracting" || (useMilestones && (dealType === "services" || dealType === "freelance"));
  const planError = dealType && milestonesOn
    ? validateMilestones(numericAmount, currency, rows.map(toInput), dealType)
    : null;

  // Templates (founder, 27 Oct): pre-fill everything; the user can still change any field.
  const [template, setTemplate] = useState<DealTemplate | null>(null);
  const [templatePct, setTemplatePct] = useState<number[] | null>(null);
  function applyTemplate(tp: DealTemplate) {
    const L = (v: readonly [string, string]) => (locale === "en" ? v[0] : v[1]);
    setTemplate(tp);
    setRole(tp.role);
    chooseType(tp.type);
    setTitle(L(tp.title));
    setDescription(L(tp.description));
    setAcceptanceCriteria(L(tp.acceptance));
    setRefundConditions(L(tp.refund));
    setInspectionDays(String(tp.inspectionDays));
    setShippingRequired(tp.shipping);
    setShippingResponsibility(tp.shipping ? "seller" : "none");
    if (tp.revisions != null) setRevisions(String(tp.revisions));
    if (tp.retentionPercent) { setRetentionEnabled(true); setRetention(String(tp.retentionPercent)); setDlp(String(tp.defectsLiabilityDays ?? 90)); }
    else setRetentionEnabled(false);
    if (tp.milestones?.length) {
      setUseMilestones(true);
      const amounts = templateMilestoneAmounts(numericAmount, tp.milestones.map((m) => m.pct), currency);
      setRows(tp.milestones.map((m, i) => ({ title: L(m.title), amount: amounts[i] ?? "", dueDate: "", evidenceRequired: L(m.evidence), kind: m.kind })));
      setTemplatePct(tp.milestones.map((m) => m.pct));
    } else { setUseMilestones(false); setTemplatePct(null); }
  }
  // Keep template milestone amounts in step with the deal amount until the user edits the plan.
  useEffect(() => {
    if (!templatePct) return;
    const amounts = templateMilestoneAmounts(numericAmount, templatePct, currency);
    setRows((r) => r.map((row, i) => ({ ...row, amount: amounts[i] ?? row.amount })));
  }, [numericAmount, currency, templatePct]);
  // People you created deals with before: one tap fills the email.
  const recent = useQuery({
    queryKey: ["recent-counterparties"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("counterparty_email, created_at").not("counterparty_email", "is", null).order("created_at", { ascending: false }).limit(50);
      return Array.from(new Set((data ?? []).map((d: any) => String(d.counterparty_email).toLowerCase()))).slice(0, 6);
    },
    staleTime: 300_000,
  });

  function chooseType(t: DealType) {
    setDealType(t);
    const d = DEAL_TYPE_DEFAULTS[t];
    setInspectionDays(String(d.inspectionDays));
    setShippingRequired(d.shipping);
    setShippingResponsibility(d.shipping ? "seller" : "none");
    setRevisions(String(d.revisions || 2));
  }

  const stepError = (k: number): string | null => {
    if (k === 0) return !dealType ? text("Choose a deal type first.", "اختر نوع الصفقة أولاً.") : title.trim().length < 3 ? text("Give the deal a short name (3 characters or more).", "اكتب اسماً مختصراً للصفقة (3 أحرف على الأقل).") : null;
    if (k === 1) return !(numericAmount > 0) ? text("Enter the deal amount.", "أدخل مبلغ الصفقة.") : planError;
    return null;
  };
  function goNext() {
    const controls = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea");
    for (const control of controls ?? []) {
      if (!control.closest("[hidden]") && !control.checkValidity()) { control.reportValidity(); return; }
    }
    const err = stepError(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep((v) => Math.min(2, v + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 2) { goNext(); return; }
    const invalid = Array.from(formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea") ?? []).find(control => !control.checkValidity());
    if (invalid) {
      const section = invalid.closest<HTMLElement>("[data-step]");
      if (section) setStep(Number(section.dataset["step"]));
      setTimeout(() => { invalid.focus(); invalid.reportValidity(); }, 0);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!dealType) throw new Error("Choose a deal type first.");
      if (planError) throw new Error(planError);
      const deal = await createFn({ data: {
        dealType,
        title,
        description,
        amount: numericAmount,
        currency: currency as "SAR",
        role,
        counterpartyEmail,
        dueAt: dueAt || null,
        feePayer,
        inspectionDays: Math.min(30, Math.max(1, Number(inspectionDays) || 1)),
        shippingRequired: dealType === "goods" && shippingRequired,
        quantity: Math.max(1, Number(quantity) || 1),
        supplierCountry,
        deliveryCountry,
        shippingResponsibility,
        acceptanceCriteria,
        refundConditions,
        cancellationConditions,
        autoRelease,
        revisionsIncluded: Math.min(20, Math.max(0, Number(revisions) || 0)),
        ...retentionFormValues(dealType === "contracting" && retentionEnabled, retention, dlp),
        fundingMode: milestonesOn ? fundingMode : "upfront",
        milestones: milestonesOn ? rows.map(toInput) : [],
      } });
      setCreated(deal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The deal could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const inviteUrl = `${typeof window === "undefined" ? "" : window.location.origin}/invite/${created.invite_token}`;
    return (
      <SiteShell>
        <div className="mx-auto max-w-2xl px-4 py-12" data-no-localize>
          <span className="grid size-14 place-items-center rounded-2xl bg-accent"><BadgeCheck className="size-7 text-primary" /></span>
          <h1 className="mt-5 text-3xl font-bold">{text("Your deal is ready", "صفقتك جاهزة")} <bdi className="text-muted-foreground">{created.ref}</bdi></h1>
          <p className="mt-3 text-lg leading-8 text-muted-foreground">{text("Send this link to the other party. They sign in, review the terms and accept them — nothing is paid before you both agree.", "أرسل هذا الرابط للطرف الآخر. يسجّل دخوله ويراجع الشروط ويوافق عليها، ولا يُدفع أي مبلغ قبل موافقتكما.")}</p>
          <Card className="mt-6">
            <CardContent className="p-6">
              <Label htmlFor="invite">{text("Invitation link", "رابط الدعوة")}</Label>
              <Input id="invite" readOnly value={inviteUrl} className="mt-2" dir="ltr" />
              <div className="mt-4"><ShareLink url={inviteUrl} message={locale === "en" ? `You are invited to an Insight deal: ${title}. The amount stays held until delivery is confirmed.\n${inviteUrl}` : `دعوة لصفقة عبر إنسايت: ${title}. يبقى المبلغ محفوظاً حتى تأكيد التسليم.\n${inviteUrl}`} /></div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline"><Link to="/deals/$dealId" params={{ dealId: created.ref }}>{text("Open the deal", "افتح الصفقة")}</Link></Button>
                <Button asChild variant="ghost"><Link to="/dashboard">{text("Back to home", "العودة للرئيسية")}</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteShell>
    );
  }

  const liveSummary = (<aside className="xl:sticky xl:top-6" data-no-localize><Card><CardContent className="p-6"><h3 className="font-semibold">{text("Live summary", "الملخص المباشر")}</h3><p className="mt-5 text-xs text-muted-foreground">{text("Deal amount", "مبلغ الصفقة")}</p><p className="mt-2 text-2xl font-semibold tabular-nums"><bdi>{formatMoney(numericAmount, currency)}</bdi></p>{live.isFetching && <p role="status" className="mt-3 text-xs text-muted-foreground">{text("Updating amounts…", "جارٍ تحديث المبالغ…")}</p>}{!live.isFetching && !lb && <p role="status" className="mt-3 text-xs text-muted-foreground">{text("Pricing unavailable. The final quote will be shown on the deal.", "التسعير غير متاح. يظهر العرض النهائي في الصفقة.")}</p>}<dl className="mt-5 space-y-4 border-t pt-4 text-sm">{([["Total fee", "إجمالي الرسوم", lb ? formatMoney(lb.fee, currency) : null], [`${RC.payer[0]} fee share + VAT`, `حصة ${R.payer.ar} + الضريبة`, lb ? `${formatMoney(lb.buyerShare, currency)} + ${lb.buyerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : formatMoney(lb.buyerVat, currency)}` : null], [`${RC.payee[0]} fee share + VAT`, `حصة ${R.payee.ar} + الضريبة`, lb ? `${formatMoney(lb.sellerShare, currency)} + ${lb.sellerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : formatMoney(lb.sellerVat, currency)}` : null], [`${RC.payee[0]} receives`, `يستلم ${R.payee.ar}`, lb ? formatMoney(lb.supplierNet, currency) : null], [`${RC.payer[0]} pays`, `يدفع ${R.payer.ar}`, lb ? formatMoney(lb.buyerTotal, currency) : null]] as const).map(([en,ar,v]) => <div key={en} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{text(en,ar)}</dt><dd className="break-words text-end tabular-nums"><bdi>{v ?? "—"}</bdi></dd></div>)}</dl><p className="mt-4 text-xs leading-6 text-muted-foreground">{text("Indicative, from the published fee table. The locked quote appears on the deal after both parties join.", "تقديرية من جدول الرسوم المنشور. يظهر العرض المقفل في الصفقة بعد انضمام الطرفين.")}</p><CustodyNote className="mt-5 border-t pt-4" /></CardContent></Card></aside>
  );

  return (
    <SiteShell>
      <div className="reveal min-w-0">
        <h1 className="text-3xl font-bold">{text("New deal", "صفقة جديدة")}</h1>
        <p className="mt-2 text-base text-muted-foreground">{text("Three short steps, then you get an invitation link for the other party.", "ثلاث خطوات قصيرة، ثم تحصل على رابط دعوة للطرف الآخر.")}</p>

        <div className="mt-6"><FormStepper current={step} /></div>
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form ref={formRef} noValidate className="min-w-0 space-y-5" onSubmit={handleSubmit}>
          <div data-step="0" hidden={step !== 0} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
          <fieldset data-no-localize className="min-w-0">
            <legend className="text-sm font-semibold">{text("Start from a ready template (optional)", "ابدأ من نموذج جاهز (اختياري)")}</legend>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {DEAL_TEMPLATES.map((tp) => (
                <button type="button" key={tp.id} onClick={() => applyTemplate(tp)} aria-pressed={template?.id === tp.id}
                  className={`min-w-44 shrink-0 rounded-xl border p-3 text-start text-sm transition ${template?.id === tp.id ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"}`}>
                  <b className="block">{text(tp.label[0], tp.label[1])}</b>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{text(tp.hint[0], tp.hint[1])}</span>
                </button>
              ))}
            </div>
            {template && <p className="mt-2 text-xs text-muted-foreground">{text("Filled from the template. You can change anything before you send it.", "عُبّئت الحقول من النموذج، ويمكنك تعديل أي شيء قبل الإرسال.")}</p>}
          </fieldset>
          <fieldset data-no-localize>
            <legend className="text-sm font-semibold">{text("Your role in the deal", "دورك في الصفقة")}</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2" role="radiogroup">
              {([["buyer", Wallet, ["I am paying", "أنا من يدفع"], ["You pay into the deal; nothing moves until you receive and check.", "تدفع في الصفقة، ولا يتحرك المبلغ قبل أن تستلم وتتأكد."], R.payer], ["seller", PackageCheck, ["I am being paid", "أنا من يستلم المبلغ"], ["You deliver what you agreed, knowing the money is already in the deal.", "تُنجز ما اتفقتما عليه وأنت تعلم أن مستحقك محفوظ في الصفقة."], R.payee]] as const).map(([value, Icon, title, hint, name]) => (
                <Button variant="outline" type="button" key={value} role="radio" aria-checked={role === value} aria-label={text(title[0], title[1])} onClick={() => setRole(value)}
                  className={`h-auto whitespace-normal flex items-start gap-4 rounded-2xl border bg-card p-5 text-start transition-all duration-200 active:scale-[0.99] ${role === value ? "border-primary ring-2 ring-primary/30" : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"}`}>
                  <IconTile icon={Icon} tone={role === value ? "brand" : "soft"} />
                  <span className="min-w-0"><b className="block text-base">{text(title[0], title[1])}{dealType && <span className="ms-1 text-sm font-normal text-muted-foreground">({text(name.en, name.ar)})</span>}</b><span className="mt-1 block text-sm leading-6 text-muted-foreground">{text(hint[0], hint[1])}</span></span>
                </Button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">{text("Deal type")}</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2" role="radiogroup">
              {DEAL_TYPES.map((t) => {
                const M = DEAL_TYPE_META[t];
                const Icon = M.icon;
                return (
                  <Button variant="outline" type="button" key={t} role="radio" aria-checked={dealType === t} onClick={() => chooseType(t)}
                    className={`h-auto justify-start whitespace-normal items-start gap-3 rounded-lg border p-4 text-start transition-all duration-200 active:scale-[0.99] ${dealType === t ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"}`}>
                    <Icon className="mt-0.5 size-6 shrink-0 text-primary" />
                    <span><b className="block">{M.label}</b><span className="mt-1 block text-xs text-muted-foreground">{M.hint}</span></span>
                  </Button>
                );
              })}
            </div>
          </fieldset>
          </div>
          {dealType && (<>
          <div data-step="0" hidden={step !== 0} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">{text("Deal title")}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{text("What is being delivered")}</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope, revisions, release conditions, refund conditions."
            />
          </div>
          </div>
          <div data-step="1" hidden={step !== 1} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">{text("Deal value")}</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                step={["BHD", "KWD", "OMR"].includes(currency) ? "0.001" : "0.01"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{text("Currency")}</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="SAR">{text("SAR \u2014 Saudi riyal")}</option>
                {fxCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          </div>
          <div data-step="0" hidden={step !== 0} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">{text("Quantity")}</Label>
              <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierCountry">{text(`${RC.payee[0]} country`, `دولة ${R.payee.ar}`)}</Label>
              <select id="supplierCountry" value={supplierCountry} onChange={(e) => setSupplierCountry(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {gccCountries.map((c) => (<option key={c.code} value={c.code}>{c.name}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryCountry">{text("Delivery country")}</Label>
              <select id="deliveryCountry" value={deliveryCountry} onChange={(e) => setDeliveryCountry(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {gccCountries.map((c) => (<option key={c.code} value={c.code}>{c.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">

            <div className="space-y-2">
              <Label htmlFor="dueAt">{text("Delivery date")}</Label>
              <Input
                id="dueAt"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>
          </div>
          <div data-step="1" hidden={step !== 1} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feePayer">{text("Who pays the escrow fee")}</Label>
              <select
                id="feePayer"
                value={feePayer}
                onChange={(e) => setFeePayer(e.target.value as FeePayer)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="buyer">{text(feePayerLabel("buyer", R)[0], feePayerLabel("buyer", R)[1])}</option>
                <option value="seller">{text(feePayerLabel("seller", R)[0], feePayerLabel("seller", R)[1])}</option>
                <option value="split">{text("Split half and half", "مناصفة بين الطرفين")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection">{text(`Inspection period for the ${R.payer.en} (days)`, `مدة الفحص لدى ${R.payer.ar} (أيام)`)}</Label>
              <Input
                id="inspection"
                type="number"
                min={1}
                max={30}
                required
                value={inspectionDays}
                onChange={(e) => setInspectionDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                After delivery the buyer has this long to accept, ask for a revision, or open a
                dispute. When it ends the funds release automatically.
              </p>
            </div>
          </div>
          {dealType === "goods" && (<label className="flex items-start gap-3 rounded-md border border-border p-4 text-sm">
            <input
              type="checkbox"
              checked={shippingRequired}
              onChange={(e) => setShippingRequired(e.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              <b>{text("This deal needs shipping")}</b>
              <span className="mt-1 block text-muted-foreground">
                The seller adds the carrier and tracking number before confirming delivery.
              </span>
            </span>
          </label>)}
          {dealType === "goods" && shippingRequired && (<div className="space-y-2">
            <Label htmlFor="shipResp">{text("Shipping responsibility")}</Label>
            <select id="shipResp" value={shippingResponsibility} onChange={(e) => setShippingResponsibility(e.target.value as "seller" | "buyer" | "none")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="seller">{text(`The ${R.payee.en} arranges and pays shipping`, `يرتّب ${R.payee.ar} الشحن ويدفعه`)}</option>
              <option value="buyer">{text(`The ${R.payer.en} arranges shipping`, `يرتّب ${R.payer.ar} الشحن`)}</option>
              <option value="none">{text("No shipping (service or digital)")}</option>
            </select>
          </div>)}
          <div className="space-y-2">
            <Label htmlFor="acceptance">{text("Acceptance criteria")}</Label>
            <Textarea id="acceptance" rows={2} value={acceptanceCriteria} onChange={(e) => setAcceptanceCriteria(e.target.value)} placeholder={text(`What must be true for the ${R.payer.en} to accept the delivery.`, `ما الذي يجب أن يتحقق ليقبل ${R.payer.ar} التسليم.`)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="refundCond">{text("Refund conditions")}</Label>
              <Textarea id="refundCond" rows={2} value={refundConditions} onChange={(e) => setRefundConditions(e.target.value)} placeholder={text(`When the ${R.payer.en} gets the money back.`, `متى يستعيد ${R.payer.ar} المبلغ.`)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancelCond">{text("Cancellation conditions")}</Label>
              <Textarea id="cancelCond" rows={2} value={cancellationConditions} onChange={(e) => setCancellationConditions(e.target.value)} placeholder="What happens if either side cancels before shipment." />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-md border border-border p-4 text-sm">
            <input type="checkbox" checked={autoRelease} onChange={(e) => setAutoRelease(e.target.checked)} className="mt-0.5 size-4" />
            <span>
              <b>{text("Release automatically when the inspection period ends")}</b>
              <span className="mt-1 block text-muted-foreground">
                Turn off if the buyer must always accept manually.
              </span>
            </span>
          </label>
          </div>
          <div data-step="2" hidden={step !== 2} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="counterparty">{text("Other party email")}</Label>
            <Input
              id="counterparty"
              type="email"
              value={counterpartyEmail}
              onChange={(e) => setCounterpartyEmail(e.target.value)}
              placeholder="them@example.com"
            />
            {(recent.data ?? []).length > 0 && (
              <div data-no-localize className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-muted-foreground">{text("Recent:", "سابقاً:")}</span>
                {(recent.data ?? []).map((e) => <button type="button" key={e} dir="ltr" onClick={() => setCounterpartyEmail(e)} className={`rounded-full border px-2.5 py-1 ${counterpartyEmail === e ? "border-primary bg-primary/5 text-primary" : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"}`}>{e}</button>)}
              </div>
            )}
          </div>

          </div>
          <div data-step="1" hidden={step !== 1} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
          {dealType === "freelance" && (
            <div className="space-y-2">
              <Label htmlFor="revisions">{text("Included revisions")}</Label>
              <Input id="revisions" type="number" min={0} max={20} dir="ltr" value={revisions} onChange={(e) => setRevisions(e.target.value)} />
            </div>
          )}
          {(dealType === "services" || dealType === "freelance") && (
            <label className="flex items-start gap-3 rounded-md border border-border p-4 text-sm">
              <input type="checkbox" checked={useMilestones} onChange={(e) => setUseMilestones(e.target.checked)} className="mt-0.5 size-4" />
              <span><b>{text("Pay in milestones")}</b><span className="mt-1 block text-muted-foreground">Split the deal into 2–20 milestones released one by one.</span></span>
            </label>
          )}
          {milestonesOn && (
            <div className="min-w-0 space-y-5" data-no-localize>
              <h2 className="font-semibold">{text("Milestones", "المراحل")}</h2>
              <MilestoneEditor rows={rows} onChange={(r) => { setTemplatePct(null); setRows(r); }} currency={currency} total={numericAmount} allowAdvance={dealType === "contracting"} />
              {dealType === "contracting" && (
                <fieldset className="min-w-0 space-y-3 border-t border-border pt-5">
                  <legend className="max-w-full text-sm font-semibold">{text("Do you want to retain a percentage as a guarantee after delivery?", "هل تريد حجز نسبة من المبلغ ضماناً بعد التسليم؟")}</legend>
                  <p className="text-xs leading-6 text-muted-foreground">{text("Part of the amount is held during the warranty period, then paid to the contractor if there are no defects.", "يُحجز جزء من المبلغ لفترة الضمان ثم يُحوّل للمقاول إن لم توجد عيوب")}</p>
                  <div className="flex gap-5">
                    {([false, true] as const).map(enabled => <label key={String(enabled)} className="flex items-center gap-2 text-sm"><input type="radio" name="retentionChoice" checked={retentionEnabled === enabled} onChange={() => setRetentionEnabled(enabled)} />{enabled ? text("Yes", "نعم") : text("No", "لا")}</label>)}
                  </div>
                  {retentionEnabled && <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="retention">{text("Retention %", "نسبة الضمان المحتجزة (%)")}</Label>
                      <Input id="retention" className="min-w-0 w-full" type="number" min={0} max={10} step="0.5" dir="ltr" value={retention} onChange={(e) => setRetention(e.target.value)} />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="dlp">{text("Defects liability period (days)", "فترة ضمان العيوب (أيام)")}</Label>
                      <Input id="dlp" className="min-w-0 w-full" type="number" min={0} max={365} dir="ltr" value={dlp} onChange={(e) => setDlp(e.target.value)} />
                    </div>
                  </div>}
                </fieldset>
              )}
              <div className="space-y-2 sm:max-w-sm">
                <Label htmlFor="funding">{text("Funding")}</Label>
                <select id="funding" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={fundingMode} onChange={(e) => setFundingMode(e.target.value as "upfront" | "per_milestone")}>
                  <option value="upfront">{text("Fund all upfront")}</option>
                  <option value="per_milestone">{text("Fund each milestone when it starts")}</option>
                </select>
                <p className="text-xs text-muted-foreground">{fundingMode === "per_milestone" ? text(`The ${R.payer.en} pays milestone 1 to start, then each next milestone before work on it begins. Each payment carries its share of the fee at that day's rate.`, `يدفع ${R.payer.ar} المرحلة الأولى للبدء، ثم كل مرحلة قبل بدء العمل عليها. تُحتسب لكل دفعة حصتها من الرسوم بسعر يومها.`) : text(`The ${R.payer.en} pays the whole contract once; each milestone is paid out from it.`, `يدفع ${R.payer.ar} العقد كاملاً مرة واحدة، وتُحوَّل كل مرحلة منه.`)}</p>
              </div>
              {planError && <p className="text-sm text-destructive">{planError}</p>}
            </div>
          )}
          </div>
          </>)}

          {step >= 1 && <div className="xl:hidden">{liveSummary}</div>}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5" data-no-localize>
            {step > 0 ? <Button type="button" variant="ghost" onClick={() => { setError(null); setStep((v) => v - 1); }}>{text("Back", "رجوع")}</Button> : <span />}
            {step < 2
              ? <Button key="next" type="button" size="lg" className="h-11 px-6" disabled={!dealType} onClick={(e) => { e.preventDefault(); goNext(); }}>{step === 0 ? text("Next: amount and terms", "التالي: المبلغ والشروط") : text("Next: the other party", "التالي: الطرف الآخر")}</Button>
              : <Button key="submit" type="submit" size="lg" className="h-11 px-6" disabled={busy || !dealType || !!planError}>{busy ? text("Saving…", "جارٍ الحفظ…") : text("Create deal and get invite link", "أنشئ الصفقة واحصل على رابط الدعوة")}</Button>}
          </div>
        </form>
        <div className="hidden xl:block">{liveSummary}</div>
        </div>
      </div>
    </SiteShell>
  );
}
