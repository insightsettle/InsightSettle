import { BadgeCheck } from "lucide-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { formatMoney } from "@/lib/money";
import { fxCurrencies } from "@/lib/fx";

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
  const { text } = useLocale();
  const [dealType, setDealType] = useState<DealType | null>(null);
  const [useMilestones, setUseMilestones] = useState(false);
  const [rows, setRows] = useState<EditableMilestone[]>([blankRow(), blankRow()]);
  const [retention, setRetention] = useState("5");
  const [fundingMode, setFundingMode] = useState<"upfront" | "per_milestone">("upfront");
  const [dlp, setDlp] = useState("90");
  const [revisions, setRevisions] = useState("2");
  const createFn = useServerFn(createTypedDeal);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("5000");
  const [currency, setCurrency] = useState("SAR");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [counterpartyEmail, setCounterpartyEmail] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [feePayer, setFeePayer] = useState<FeePayer>("buyer");
  const [inspectionDays, setInspectionDays] = useState("3");
  const [shippingRequired, setShippingRequired] = useState(true);
  const [quantity, setQuantity] = useState("1");
  const [supplierCountry, setSupplierCountry] = useState("SA");
  const [deliveryCountry, setDeliveryCountry] = useState("SA");
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
    const err = stepError(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep((v) => Math.min(2, v + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 2) { goNext(); return; }
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
        retentionPercent: Math.min(10, Math.max(0, Number(retention) || 0)),
        defectsLiabilityDays: Math.min(365, Math.max(0, Math.round(Number(dlp) || 0))),
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
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>{text("Copy link", "انسخ الرابط")}</Button>
                <Button asChild variant="outline"><Link to="/deals/$dealId" params={{ dealId: created.ref }}>{text("Open the deal", "افتح الصفقة")}</Link></Button>
                <Button asChild variant="ghost"><Link to="/dashboard">{text("Back to home", "العودة للرئيسية")}</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="min-w-0">
        <h1 className="text-3xl font-bold">{text("New deal", "صفقة جديدة")}</h1>
        <p className="mt-2 text-base text-muted-foreground">{text("Three short steps, then you get an invitation link for the other party.", "ثلاث خطوات قصيرة، ثم تحصل على رابط دعوة للطرف الآخر.")}</p>

        <div className="mt-6"><FormStepper current={step} /></div>
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form className="min-w-0 space-y-5" onSubmit={handleSubmit}>
          <div hidden={step !== 0} className="space-y-5">
          <fieldset>
            <legend className="text-sm font-semibold">{text("Deal type")}</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2" role="radiogroup">
              {DEAL_TYPES.map((t) => {
                const M = DEAL_TYPE_META[t];
                const Icon = M.icon;
                return (
                  <Button variant="outline" type="button" key={t} role="radio" aria-checked={dealType === t} onClick={() => chooseType(t)}
                    className={`h-auto justify-start whitespace-normal items-start gap-3 rounded-lg border p-4 text-start transition ${dealType === t ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}>
                    <Icon className="mt-0.5 size-6 shrink-0 text-primary" />
                    <span><b className="block">{M.label}</b><span className="mt-1 block text-xs text-muted-foreground">{M.hint}</span></span>
                  </Button>
                );
              })}
            </div>
          </fieldset>
          </div>
          {dealType && (<>
          <div hidden={step !== 0} className="space-y-5">
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
          <div hidden={step !== 1} className="space-y-5">
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
          <div hidden={step !== 0} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">{text("Quantity")}</Label>
              <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <p className="text-xs text-muted-foreground" dir="ltr">
                {text("Unit price", "سعر الوحدة")}: {formatMoney(numericAmount / Math.max(1, Number(quantity) || 1), currency)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierCountry">{text("Supplier country")}</Label>
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
              <Label htmlFor="role">{text("Your side of the deal")}</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "buyer" | "seller")}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="buyer">{text("I am paying (buyer)")}</option>
                <option value="seller">{text("I am delivering (seller)")}</option>
              </select>
            </div>
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
          <div hidden={step !== 1} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feePayer">{text("Who pays the escrow fee")}</Label>
              <select
                id="feePayer"
                value={feePayer}
                onChange={(e) => setFeePayer(e.target.value as FeePayer)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="buyer">{text("Buyer pays the fee")}</option>
                <option value="seller">{text("Seller pays the fee")}</option>
                <option value="split">{text("Split 50/50")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection">{text("Buyer inspection period (days)")}</Label>
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
              <option value="seller">{text("Seller arranges and pays shipping")}</option>
              <option value="buyer">{text("Buyer arranges shipping")}</option>
              <option value="none">{text("No shipping (service or digital)")}</option>
            </select>
          </div>)}
          <div className="space-y-2">
            <Label htmlFor="acceptance">{text("Acceptance criteria")}</Label>
            <Textarea id="acceptance" rows={2} value={acceptanceCriteria} onChange={(e) => setAcceptanceCriteria(e.target.value)} placeholder="What must be true for the buyer to accept the delivery." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="refundCond">{text("Refund conditions")}</Label>
              <Textarea id="refundCond" rows={2} value={refundConditions} onChange={(e) => setRefundConditions(e.target.value)} placeholder="When the buyer gets the money back." />
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
          <div hidden={step !== 2} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="counterparty">{text("Other party email")}</Label>
            <Input
              id="counterparty"
              type="email"
              value={counterpartyEmail}
              onChange={(e) => setCounterpartyEmail(e.target.value)}
              placeholder="them@example.com"
            />
          </div>

          </div>
          <div hidden={step !== 1} className="space-y-5">
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
            <div className="space-y-3 rounded-md border border-border p-4">
              <p className="font-semibold">Milestones</p>
              <MilestoneEditor rows={rows} onChange={setRows} currency={currency} total={numericAmount} allowAdvance={dealType === "contracting"} />
              {dealType === "contracting" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="retention">{text("Retention %")}</Label>
                    <Input id="retention" type="number" min={0} max={10} step="0.5" dir="ltr" value={retention} onChange={(e) => setRetention(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dlp">{text("Defects liability period (days)")}</Label>
                    <Input id="dlp" type="number" min={0} max={365} dir="ltr" value={dlp} onChange={(e) => setDlp(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="space-y-2 sm:max-w-sm">
                <Label htmlFor="funding">{text("Funding")}</Label>
                <select id="funding" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={fundingMode} onChange={(e) => setFundingMode(e.target.value as "upfront" | "per_milestone")}>
                  <option value="upfront">{text("Fund all upfront")}</option>
                  <option value="per_milestone">{text("Fund each milestone when it starts")}</option>
                </select>
                <p className="text-xs text-muted-foreground">{fundingMode === "per_milestone" ? text("The buyer funds milestone 1 to start, then each next milestone before work on it begins. Each funding is charged its share of the fee at that day's rate.") : text("The buyer funds the whole contract once; each milestone is released from it.")}</p>
              </div>
              {planError && <p className="text-sm text-destructive">{planError}</p>}
            </div>
          )}
          </div>
          </>)}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5" data-no-localize>
            {step > 0 ? <Button type="button" variant="ghost" onClick={() => { setError(null); setStep((v) => v - 1); }}>{text("Back", "رجوع")}</Button> : <span />}
            {step < 2
              ? <Button key="next" type="button" size="lg" className="h-11 px-6" disabled={!dealType} onClick={(e) => { e.preventDefault(); goNext(); }}>{step === 0 ? text("Next: amount and terms", "التالي: المبلغ والشروط") : text("Next: the other party", "التالي: الطرف الآخر")}</Button>
              : <Button key="submit" type="submit" size="lg" className="h-11 px-6" disabled={busy || !dealType || !!planError}>{busy ? text("Saving…", "جارٍ الحفظ…") : text("Create deal and get invite link", "أنشئ الصفقة واحصل على رابط الدعوة")}</Button>}
          </div>
        </form>
        <aside className="xl:sticky xl:top-6" data-no-localize><Card><CardContent className="p-6"><h3 className="font-semibold">{text("Live summary", "الملخص المباشر")}</h3><p className="mt-5 text-xs text-muted-foreground">{text("Deal amount", "مبلغ الصفقة")}</p><p className="mt-2 text-2xl font-semibold tabular-nums"><bdi>{formatMoney(numericAmount, currency)}</bdi></p><dl className="mt-5 space-y-4 border-t pt-4 text-sm">{([["Total fee", "إجمالي الرسوم", lb ? formatMoney(lb.fee, currency) : null], ["Buyer fee share + VAT", "حصة المشتري + الضريبة", lb ? `${formatMoney(lb.buyerShare, currency)} + ${lb.buyerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : formatMoney(lb.buyerVat, currency)}` : null], ["Supplier fee share + VAT", "حصة المورد + الضريبة", lb ? `${formatMoney(lb.sellerShare, currency)} + ${lb.sellerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : formatMoney(lb.sellerVat, currency)}` : null], ["Supplier receives", "يستلم المورد", lb ? formatMoney(lb.supplierNet, currency) : null], ["Buyer pays", "يدفع المشتري", lb ? formatMoney(lb.buyerTotal, currency) : null]] as const).map(([en,ar,v]) => <div key={en} className="flex justify-between gap-3"><dt className="text-muted-foreground">{text(en,ar)}</dt><dd className="tabular-nums"><bdi>{v ?? "—"}</bdi></dd></div>)}</dl><p className="mt-4 text-xs leading-6 text-muted-foreground">{text("Indicative, from the published fee table. The locked quote appears on the deal after both parties join.", "تقديرية من جدول الرسوم المنشور. يظهر العرض المقفل في الصفقة بعد انضمام الطرفين.")}</p><CustodyNote className="mt-5 border-t pt-4" /></CardContent></Card></aside>
        </div>
      </div>
    </SiteShell>
  );
}
