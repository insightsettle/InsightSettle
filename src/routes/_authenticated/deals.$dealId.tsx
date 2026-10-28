import { getDealPricing, requestFxQuote, PAY_CURRENCIES, type FxQuote } from "@/lib/fx-quotes.functions";
import { DEFAULT_METHOD, METHOD_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-methods";
import { CalendarClock as CalendarIcon, Check as CheckIcon, Coins as CoinsIcon, Copy as CopyIcon, Eye as EyeIcon } from "@/components/icons";
import { PayoutPlan } from "@/components/deal/PayoutPlan";
import { planDealPayouts } from "@/lib/payout-planner";
import { getAuctionDealView } from "@/lib/auction-client.functions";
import { AuctionDealScreen } from "@/components/auction/AuctionWinner";
import {
  acceptTerms,
  confirmDelivery as confirmDeliveryFn,
  rejectTerms as rejectTermsFn,
  requestRevision,
  requestTermsChange as requestTermsChangeFn,
  updateShipping as updateShippingFn,
} from "@/lib/deal-party.functions";
import { CustodyNote } from "@/components/deal/DealPresentation";
import { NextStepCard } from "@/components/deal/NextStep";
import { ACCEPT_LABEL, DELIVER_LABEL, RELEASE_LABEL, nextStepFor, type NextStepAction } from "@/lib/next-step";
import { paymentEventNote, quoteAmountLine } from "@/lib/deal-display";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import {
  AttachmentsCard,
  CancelPanel,
  DisputePanel,
  FrozenBanner,
  InvoiceCard,
  TermVersionsCard,
} from "@/components/site/DealExtras";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  FileSignature,
  LifeBuoy,
  Star,
  Timer,
  Truck,
  MessageSquare,
  Receipt,
  Scale,
  Send,
  Users,
  Wallet,
} from "@/components/icons";
import { useEffect, useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { ContractDashboard, EscrowStepper, FreelancePanel, ServicesPanel, ShipmentTracker, useMilestones } from "@/components/deal/DealPanels";
import { supabase as sbClient } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useSessionUser } from "@/hooks/use-session";
import {
  contactSupport,
  listDealMessages,
  listDealRatings,
  listDealTransactions,
  listTimeline,
  postDealMessage,
  submitRating,
} from "@/lib/deal-actions";
import { getDealByRef, shippingStatusLabels } from "@/lib/deals";
import { cap, feePayerLabel, poss, rolesFor, the, to } from "@/lib/roles";
import { formatDate, statusLabels, type DealStatus } from "@/lib/demo-data";
import {
  requestFundsRelease,
  startDealFunding,
  type PaymentResult,
} from "@/lib/payments.functions";
import { AnimatedNumber, PageSkeleton } from "@/components/motion/Motion";

/** Insight's own payment reference. Customers never see the provider's name or reference format (founder, 27 Oct). */
const insightRef = (id: string) => `PAY-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export const Route = createFileRoute("/_authenticated/deals/$dealId")({
  head: ({ params }) => ({
    meta: [
      { title: `Deal ${params.dealId} | Insight` },
      {
        name: "description",
        content: "Review escrow deal parties, fees, timeline, messages, and available actions.",
      },
      { property: "og:title", content: `Insight deal ${params.dealId}` },
      { property: "og:description", content: "A complete record of an Insight escrow deal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealPage,
});

function DealPage() {
  const { dealId } = Route.useParams();
  const viewFn = useServerFn(getAuctionDealView);
  const query = useQuery({ queryKey: ['auction-deal-view', dealId], queryFn: () => viewFn({ data: { ref: dealId } }) });
  const { text } = useLocale();
  if (query.isPending) return <PageSkeleton label={text("Loading…", "جارٍ التحميل…")} />;
  if (query.data && (query.data.owner || query.data.buyer)) return <AuctionDealScreen refCode={dealId} />;
  return <OrdinaryDealPage />;
}

function OrdinaryDealPage() {
  const { dealId } = Route.useParams();
  const { locale, text } = useLocale();
  const queryClient = useQueryClient();
  const { user } = useSessionUser();

  const dealQuery = useQuery({ queryKey: ["deal", dealId], queryFn: () => getDealByRef(dealId) });
  const navigate = useNavigate();
  const deal = dealQuery.data ?? null;

  const timeline = useQuery({
    queryKey: ["deal-timeline", deal?.id],
    queryFn: () => listTimeline(deal?.id ?? ""),
    enabled: !!deal,
  });
  const messages = useQuery({
    queryKey: ["deal-messages", deal?.id],
    queryFn: () => listDealMessages(deal?.id ?? ""),
    enabled: !!deal,
  });

  const transactions = useQuery({
    queryKey: ["deal-transactions", deal?.id],
    queryFn: () => listDealTransactions(deal?.id ?? ""),
    enabled: !!deal,
  });

  const milestonesQ = useMilestones(deal?.id);
  const termsQ = useQuery({
    queryKey: ["deal-terms-all", deal?.id],
    enabled: !!deal,
    queryFn: async () => (await sbClient.from("deal_term_versions").select("*").eq("deal_id", deal?.id ?? "").order("version")).data ?? [],
  });
  const filesQ = useQuery({
    queryKey: ["deal-files-list", deal?.id],
    enabled: !!deal,
    queryFn: async () => ((await sbClient.from("deal_attachments").select("id, file_name, category").eq("deal_id", deal?.id ?? "")).data ?? []) as any[],
  });

  const ratings = useQuery({
    queryKey: ["deal-ratings", deal?.id],
    queryFn: () => listDealRatings(deal?.id ?? ""),
    enabled: !!deal,
  });

  const partyProfiles = useQuery({
    queryKey: ["deal-party-profiles", deal?.buyer_id, deal?.seller_id],
    enabled: !!deal,
    queryFn: async () => {
      const ids = [deal?.buyer_id, deal?.seller_id].filter((id): id is string => !!id);
      if (!ids.length) return [];
      return (await sbClient.from("profiles").select("id, full_name, country, verification_status").in("id", ids)).data ?? [];
    },
  });
  const [message, setMessage] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [termsNote, setTermsNote] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [shippingState, setShippingState] = useState("shipped");
  const [shipEta, setShipEta] = useState("");
  const [ratingScore, setRatingScore] = useState("5");
  const [ratingComment, setRatingComment] = useState("");
  const [paymentNotice, setPaymentNotice] = useState<PaymentResult | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
    queryClient.invalidateQueries({ queryKey: ["deal-timeline", deal?.id] });
    queryClient.invalidateQueries({ queryKey: ["deal-messages", deal?.id] });
    queryClient.invalidateQueries({ queryKey: ["deal-transactions", deal?.id] });
    queryClient.invalidateQueries({ queryKey: ["deal-ratings", deal?.id] });
    queryClient.invalidateQueries({ queryKey: ["deal-milestones", deal?.id] });
    queryClient.invalidateQueries({ queryKey: ["deal-terms-all", deal?.id] });
    queryClient.invalidateQueries({ queryKey: ["invoice", deal?.id] });
    queryClient.invalidateQueries({ queryKey: ["deal-pricing", deal?.id] });
    queryClient.invalidateQueries({ queryKey: ["my-deals"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const action = useMutation({
    meta: { successToast: text("Done. The deal is updated.", "تم. حُدّثت الصفقة.") },
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      setReviewNote("");
      setDisputeReason("");
      setSupportNote("");
      setMessage("");
      setTermsNote("");
      setRatingComment("");
      refresh();
    },
  });

  const fund = useServerFn(startDealFunding);
  const agreeFn = useServerFn(acceptTerms);
  const changeFn = useServerFn(requestTermsChangeFn);
  const rejectFn = useServerFn(rejectTermsFn);
  const deliverFn = useServerFn(confirmDeliveryFn);
  const reviewFn = useServerFn(requestRevision);
  const shipFn = useServerFn(updateShippingFn);
  const pricingFn = useServerFn(getDealPricing);
  const [payCurrency, setPayCurrency] = useState<(typeof PAY_CURRENCIES)[number] | undefined>(undefined);
  const [payMethod, setPayMethod] = useState<PaymentMethod>(DEFAULT_METHOD);
  const pricing = useQuery({
    queryKey: ["deal-pricing", deal?.id, deal?.status, deal?.terms_version, payCurrency, payMethod],
    queryFn: () => pricingFn({ data: { dealId: deal?.id ?? "", payCurrency, method: payMethod } }),
    enabled: !!deal,
  });
  const release = useServerFn(requestFundsRelease);
  const getQuote = useServerFn(requestFxQuote);
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const quoteExpired = !!quote && new Date(quote.expires_at).getTime() <= nowTick;
  const payment = useMutation({
    mutationFn: async (fn: () => Promise<PaymentResult>) => fn(),
    onSuccess: (result) => {
      setPaymentNotice(result);
      if (result.ok) setQuote(null);
      refresh();
    },
    onError: (error: unknown) => {
      setPaymentNotice({
        ok: false,
        status: "failed",
        provider: "unknown",
        providerLabel: "Payments",
        message:
          error instanceof Error
            ? error.message
            : "The payment could not be started. Please try again or contact Insight support.",
      });
    },
  });

  if (!deal)
    return (
      <SiteShell>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          {dealQuery.isLoading ? <PageSkeleton label={text("Loading deal…", "جارٍ تحميل الصفقة…")} /> : <h1 className="text-3xl font-bold">{text("Deal not found", "الصفقة غير موجودة")}</h1>}
          <Button asChild className="mt-6">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </SiteShell>
    );

  const amount = Number(deal.amount);
  const status = (
    Object.keys(statusLabels).includes(deal.status) ? deal.status : "pending_funding"
  ) as DealStatus;
  const money = (n: number, c: string = deal.currency) => formatMoney(n, c);
  const fb = pricing.data?.breakdown ?? null;
  const pin = pricing.data?.payIn ?? null;

  const isBuyer = !!user && deal.buyer_id === user.id;
  const isSeller = !!user && deal.seller_id === user.id;
  const bothJoined = !!deal.buyer_id && !!deal.seller_id;

  const termsAgreed = deal.terms_status === "agreed";
  const isCreator = !!user && deal.created_by === user.id;
  const canDecideTerms = !deal.frozen && !termsAgreed && bothJoined && !isCreator;
  const inspectionEnds = deal.auto_release_at ? new Date(deal.auto_release_at) : null;
  const hoursLeft = inspectionEnds
    ? Math.max(0, Math.ceil((inspectionEnds.getTime() - nowTick) / 60000))
    : null;
  const inspectionExpired = !!inspectionEnds && inspectionEnds.getTime() <= nowTick;
  const shippingNeeded = !!deal.shipping_status && deal.shipping_status !== "not_required";
  const counterpartyId = isBuyer ? deal.seller_id : deal.buyer_id;
  const myRating = (ratings.data ?? []).find((r) => r.rater_id === user?.id);
  const ratingAboutMe = (ratings.data ?? []).find((r) => r.ratee_id === user?.id);
  const dealClosed = ["released", "completed", "refunded", "partially_refunded"].includes(status);
  // Per-milestone funding (D-43): the buyer funds the next milestone while the contract is in progress.
  const perMilestone = (deal as any).funding_mode === "per_milestone";
  const nextToFund = perMilestone ? (milestonesQ.data ?? []).find((m: any) => m.status === "pending") ?? null : null;
  const canFund = !deal.frozen && isBuyer && (perMilestone ? ["pending_funding", "in_progress"].includes(status) && !!nextToFund : status === "pending_funding");
  const deadlineFmt = (l: string) => inspectionEnds ? inspectionEnds.toLocaleString(l, { timeZone: "Asia/Riyadh", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : "";
  const R = rolesFor((deal as any).deal_type);
  const [payerT, payeeT, toPayee, payerPoss, payeePoss] = [the(R.payer), the(R.payee), to(R.payee), poss(R.payer), poss(R.payee)];
  const fpl = feePayerLabel(deal.fee_payer, R);
  const nextStep = nextStepFor({
    roles: R,
    status, termsAgreed, isBuyer, isSeller, bothJoined, canDecideTerms, shippingNeeded,
    shipped: !!deal.shipped_at || ["shipped", "in_transit", "out_for_delivery", "delivered"].includes(deal.shipping_status ?? ""),
    autoRelease: !!deal.auto_release_enabled, frozen: !!(deal as any).frozen, hasMilestones: (milestonesQ.data?.length ?? 0) > 0,
    nextMilestoneToFund: nextToFund ? Number(nextToFund.seq) : null,
    nextMilestoneAmount: nextToFund ? money(Number(nextToFund.amount)) : null,
    submittedMilestone: milestonesQ.data?.find(m => m.status === "submitted")?.seq,
    workingMilestone: milestonesQ.data?.find(m => ["funded", "revision_requested"].includes(m.status))?.seq,
    deadline: inspectionEnds ? [deadlineFmt("en-GB"), deadlineFmt("ar-SA")] : null,
  });
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const onNextStep = (a: NextStepAction) => {
    if (a === "accept-terms") action.mutate(() => agreeFn({ data: { dealId: deal.id } }));
    else if (a === "deliver") action.mutate(() => deliverFn({ data: { dealId: deal.id } }));
    else if (a === "release") payment.mutate(() => release({ data: { dealId: deal.id } }));
    else if (a === "scroll-pay" && canFund) void navigate({ to: "/pay/$dealId", params: { dealId: deal.ref } });
    else scrollTo(a === "scroll-pay" ? "deal-actions" : a === "scroll-ship" ? "shipping" : a === "scroll-terms" ? "terms" : a === "scroll-milestones" ? "milestones" : "dispute");
  };

  return (
    <SiteShell>
      <div className="reveal min-w-0">
        <nav className="mb-5 flex items-center gap-2 text-xs text-muted-foreground" data-no-localize><Link to="/dashboard" hash="saved-deals">{text("Deals", "الصفقات")}</Link><span>‹</span><bdi>{deal.ref}</bdi></nav>
        <header className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]" data-no-localize>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="min-w-0 break-words text-2xl font-semibold">{deal.title}</h2><RefChip value={deal.ref} /><StatusBadge status={status} /><span className="rounded-full bg-gold-subtle px-3 py-1 text-xs font-medium text-gold-foreground">{text(({goods:"Goods",contracting:"Contracting & fit-out",services:"Services",freelance:"Freelance & digital work"} as Record<string,string>)[(deal as any).deal_type ?? "goods"] ?? "Goods")}</span></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{text("with", "مع")} {partyProfiles.data?.find((p) => p.id === counterpartyId)?.full_name ?? (deal.counterparty_email !== user?.email ? deal.counterparty_email : null) ?? text("Other party", "الطرف الآخر")} ({text(partyProfiles.data?.find((p) => p.id === counterpartyId)?.country ?? (isBuyer ? deal.supplier_country : deal.delivery_country) ?? "—")}) · {text("created", "أُنشئت")} {new Date(deal.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB")} · <bdi>{deal.ref}</bdi></p><p className="mt-2 text-sm text-muted-foreground">{deal.description}</p></div>
          <div className="text-end"><p className="text-xs text-muted-foreground">{text("Deal value", "قيمة الصفقة")}</p><p className="mt-1 text-2xl font-bold tabular-nums"><bdi dir="ltr"><AnimatedNumber value={amount} format={(v) => money(v)} /></bdi></p></div>
        </header>
        <div className="mt-6"><EscrowStepper status={deal.status} termsStatus={deal.terms_status} /></div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => scrollTo("deal-actions")}>{text("Payment and actions", "الدفع والإجراءات")}</Button>
        <div className="mt-6"><NextStepCard step={nextStep} onAction={onNextStep} busy={action.isPending || payment.isPending} /></div>
                {["delivered", "under_review"].includes(status) && inspectionEnds && (
                  <div className="mt-4 flex gap-2 rounded-md border border-primary/30 bg-primary/5 p-4">
                    <Timer className="size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">
                        {inspectionExpired
                          ? text("The inspection period has ended", "انتهت مدة الفحص")
                          : text(`Inspection period ends in ${hoursLeft} minute(s)`, `تنتهي مدة الفحص خلال ${hoursLeft} دقيقة`)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {inspectionExpired
                          ? text(`The amount can now be paid out ${toPayee[0]}. If something is wrong, open a dispute first.`, `يمكن الآن تحويل المبلغ ${toPayee[1]}. إن كانت هناك مشكلة، افتح نزاعاً أولاً.`)
                          : deal.auto_release_enabled ? text(`Ends ${deadlineFmt("en-GB")} (Riyadh time). If ${payerT[0]} takes no action, the amount is paid out ${toPayee[0]}.`, `تنتهي ${deadlineFmt("ar-SA")} (بتوقيت الرياض). إن لم يتخذ ${payerT[1]} أي إجراء، يُحوَّل المبلغ ${toPayee[1]}.`) : text(`Automatic payout is off. ${cap1(payerT[0])} must confirm manually.`, `التحويل التلقائي غير مفعّل. يجب أن يؤكد ${payerT[1]} يدوياً.`)}
                      </p>
                    </div>
                  </div>
                )}
        <div data-no-localize className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">{([[EyeIcon, text("Inspection", "مدة الفحص"), text(`${deal.inspection_days} day(s)`, `${deal.inspection_days} أيام`)], [CalendarIcon, text("Delivery by", "التسليم قبل"), deal.due_at ? formatDate(deal.due_at) : text("Not set", "غير محدد")], [CoinsIcon, text("Currency", "العملة"), deal.currency]] as const).map(([I, label, value]) => <div key={label} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3 sm:p-4"><span className="hidden size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary sm:grid"><I className="size-4" /></span><div className="min-w-0"><p className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</p><p className="truncate text-sm font-semibold sm:text-base"><bdi>{value}</bdi></p></div></div>)}</div>
        {(action.error || paymentNotice) && <div className="mt-3" data-no-localize>{action.error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(action.error as Error).message}</p>}{paymentNotice && <p role="status" className={`rounded-xl border p-4 text-sm ${paymentNotice.ok ? "border-primary/40 bg-accent" : "border-destructive/40 bg-destructive/5"}`}><b>{paymentNotice.ok ? text("Payment recorded", "تم تسجيل الدفع") : text("Payment could not be completed", "تعذّر إكمال الدفع")}</b> · {paymentNotice.message}</p>}</div>}
        {(milestonesQ.data?.length ?? 0) > 0 && <div id="milestones" className="mt-6 scroll-mt-24"><ContractDashboard deal={deal} milestones={milestonesQ.data ?? []} isBuyer={isBuyer} isSeller={isSeller} termVersions={termsQ.data ?? []} onDone={refresh} /></div>}
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Card data-no-localize>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold">{text("The amount", "المبلغ")}</h3>
                <p className="mt-3 text-2xl font-bold tabular-nums"><bdi dir="ltr">{money(amount)}</bdi></p>
                {pricing.isError && <p role="alert" className="mt-3 text-sm text-destructive">{text("Payment breakdown unavailable. Please refresh and try again.", "تعذّر عرض تفاصيل الدفع. حدّث الصفحة وحاول مجدداً.")}</p>}
                {pricing.isPending && <p role="status" className="mt-3 text-sm text-muted-foreground">{text("Loading payment breakdown…", "جارٍ تحميل تفاصيل الدفع…")}</p>}
                {fb && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-background p-4">
                      <p className="text-sm text-muted-foreground">{isBuyer ? (status === "pending_funding" || perMilestone ? text("You pay", "تدفع") : text("You paid", "دفعتَ")) : text(`${cap1(payerT[0])} pays`, `يدفع ${payerT[1]}`)}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums"><bdi dir="ltr">{pin && !perMilestone ? money(pin.total, pin.payCurrency) : money(fb.buyerTotal)}</bdi></p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{pin && !perMilestone && pin.payCurrency !== deal.currency ? <>{text("Includes the fee share and VAT, at", "يشمل حصة الرسوم والضريبة، بسعر")} <bdi dir="ltr">1 {deal.currency} = {pin.customerRate} {pin.payCurrency}</bdi></> : text(`Includes ${payerPoss[0]} fee share and VAT`, `يشمل حصة ${payerPoss[1]} من الرسوم والضريبة`)}</p>
                    </div>
                    <div className="rounded-xl bg-background p-4">
                      <p className="text-sm text-muted-foreground">{isSeller ? text("You receive", "تستلم") : text(`${cap1(payeeT[0])} receives`, `يستلم ${payeeT[1]}`)}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums"><bdi dir="ltr">{money(fb.supplierNet)}</bdi></p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{text(`After ${payeePoss[0]} fee share and VAT, once ${payerT[0]} confirms`, `بعد حصة ${payeePoss[1]} من الرسوم وضريبتها، عند تأكيد ${payerT[1]}`)}</p>
                    </div>
                  </div>
                )}
                {perMilestone && <p className="mt-4 rounded-xl bg-accent p-4 text-sm leading-7 text-accent-foreground">{text("This contract is paid milestone by milestone. Each milestone is paid at that day's exchange rate with its share of the fee, and each payment gets its own tax invoice.", "يُدفع هذا العقد مرحلةً بمرحلة. تُدفع كل مرحلة بسعر صرف يومها مع حصتها من الرسوم، ولكل دفعة فاتورة ضريبية مستقلة.")}</p>}
                {fb && (
                  <section className="mt-4 border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-primary">{text("Payment breakdown", "تفصيل الدفع")}</h4>
                    <dl className="mt-3 space-y-3 text-sm">
                      <Info label={text("Deal amount", "مبلغ الصفقة")} value={money(amount)} />
                      <Info label={text(`${cap(R.payer)[0]} total`, `إجمالي ما يدفعه ${R.payer.ar}`)} value={money(fb.buyerTotal)} />
                      <Info label={text(`${cap(R.payee)[0]} receives`, `ما يستلمه ${R.payee.ar}`)} value={money(fb.supplierNet)} />
                      <Info label={text("Insight fee", "رسوم إنسايت")} value={money(fb.fee)} />
                      <Info label={text("Who pays the fee", "من يدفع الرسوم")} value={text(fpl[0], fpl[1])} />
                      <Info label={text(`${cap(R.payer)[0]}'s share (${deal.delivery_country ?? "—"})`, `حصة ${R.payer.ar} (${text(deal.delivery_country ?? "—")})`)} value={`${money(fb.buyerShare)} + ${fb.buyerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : `${text("VAT", "ضريبة")} ${Math.round(fb.buyerVatRate * 100)}% ${money(fb.buyerVat)}`}`} />
                      <Info label={text(`${cap(R.payee)[0]}'s share (${deal.supplier_country ?? "—"})`, `حصة ${R.payee.ar} (${text(deal.supplier_country ?? "—")})`)} value={`${money(fb.sellerShare)} + ${fb.sellerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : `${text("VAT", "ضريبة")} ${Math.round(fb.sellerVatRate * 100)}% ${money(fb.sellerVat)}`}`} />
                      {pin && <Info label={text(perMilestone ? "Latest milestone pay-in" : "Pay-in total", perMilestone ? "دفعة آخر مرحلة" : "إجمالي الدفع بعملة الدافع")} value={money(pin.total, pin.payCurrency)} />}
                      {pin && pin.payCurrency !== deal.currency && <Info label={pricing.data?.locked ? text("Locked exchange rate", "سعر الصرف المقفل") : text("Indicative exchange rate", "سعر الصرف التقديري")} value={`1 ${deal.currency} = ${pin.customerRate} ${pin.payCurrency}`} />}
                    </dl>
                    {pin && pin.payCurrency !== deal.currency && <details className="mt-3"><summary className="cursor-pointer text-xs text-primary">{text("Exchange-rate spread", "فارق سعر الصرف")}</summary><Info label={text("Provider rate", "سعر المزوّد")} value={String(pin.providerRate)} /><Info label={text("Provider spread", "فارق المزوّد")} value={money(pin.fxSpread, pin.payCurrency)} /><p className="mt-2 text-xs text-muted-foreground">{text("The exchange rate and its spread belong to the payment provider.", "سعر الصرف وفارقه يعودان لمزوّد الدفع.")}</p></details>}
                  </section>
                )}
                <section className="mt-3 border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-primary">{text("What you agreed", "ما اتفقتما عليه")}</h4>
                  <dl className="mt-3 space-y-3 text-sm">
                    {deal.acceptance_criteria && <Info label={text("Accepted when", "متى يُقبل التسليم")} value={deal.acceptance_criteria} />}
                    <Info label={text("Inspection period", "مدة الفحص")} value={text(`${deal.inspection_days} day(s) after delivery`, `${deal.inspection_days} يوم بعد التسليم`)} />
                    <Info label={text("Automatic payout", "التحويل التلقائي")} value={deal.auto_release_enabled ? text("On, at the end of the inspection period", "مفعّل عند نهاية مدة الفحص") : text(`Off — ${payerT[0]} confirms`, `غير مفعّل، يؤكد ${payerT[1]}`)} />
                    <Info label={text("Quantity", "الكمية")} value={String(deal.quantity ?? 1)} />
                    {deal.unit_price != null && <Info label={text("Unit price", "سعر الوحدة")} value={money(Number(deal.unit_price))} />}
                    <Info label={text("Shipping responsibility", "مسؤولية الشحن")} value={deal.shipping_responsibility === "seller" ? text(R.payee.en, R.payee.ar) : deal.shipping_responsibility === "buyer" ? text(R.payer.en, R.payer.ar) : text("No shipping", "بدون شحن")} />
                    {deal.cancellation_conditions && <Info label={text("Cancellation conditions", "شروط الإلغاء")} value={deal.cancellation_conditions} />}
                    {deal.refund_conditions && <Info label={text("Refund conditions", "شروط الاسترداد")} value={deal.refund_conditions} />}
                    <Info label={text("Delivery by", "التسليم قبل")} value={deal.due_at ? formatDate(deal.due_at) : text("No date set", "بدون موعد")} />
                    <Info label={text("Created", "أُنشئت")} value={formatDate(deal.created_at)} />
                  </dl>
                </section>
                {(deal.fee_override_flat != null || deal.fee_override_percent != null) && (
                  <p className="mt-3 rounded-md bg-accent p-3 text-xs text-accent-foreground">
                    {text("Insight applied a special fee to this deal.", "طبّقت إنسايت رسوماً خاصة على هذه الصفقة.")}
                    {deal.fee_override_note ? ` ${deal.fee_override_note}` : ""}
                  </p>
                )}
                {transactions.data?.filter((t) => t.kind === "funding" && t.status === "succeeded").map((t) => <p key={t.id} className="mt-3 text-xs text-muted-foreground">{text("Payment confirmation", "تأكيد الدفع")}: <bdi>{insightRef(t.id)}</bdi> · {formatDate(t.created_at)}</p>)}
                <CustodyNote className="mt-4 border-t border-border pt-4" />
              </CardContent>
            </Card>

            {fb && (
              <PayoutPlan lines={planDealPayouts({ currency: deal.currency, supplierNet: fb.supplierNet, amount: Number(deal.amount), sellerShare: fb.sellerShare, sellerVat: fb.sellerVat, retentionPercent: Number((deal as any).retention_percent ?? 0), milestones: (milestonesQ.data ?? []).map((m: any) => ({ seq: m.seq, title: m.title, amount: Number(m.amount) })) })} />
            )}
            {shippingNeeded && <ShipmentTracker deal={deal} />}
            {shippingNeeded && (
              <Card id="shipping" className="scroll-mt-24">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Truck className="size-5 text-primary" />
                    <h2 className="font-bold">{text("Shipping & delivery", "الشحن والتسليم")}</h2>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <p className="rounded-lg bg-muted p-3">
                      <span className="text-muted-foreground">Status: </span>
                      {shippingStatusLabels[deal.shipping_status ?? "preparing"] ??
                        deal.shipping_status}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Carrier: </span>
                      {deal.shipping_carrier || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Tracking: </span>
                      <bdi dir="ltr">{deal.shipping_tracking || "—"}</bdi>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Shipped: </span>
                      {deal.shipped_at ? formatDate(deal.shipped_at) : "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Estimated delivery: </span>
                      {deal.estimated_delivery_at ? formatDate(deal.estimated_delivery_at) : "—"}
                    </p>
                  </div>
                  <div data-no-localize className="mt-3 grid gap-3 sm:grid-cols-2">{[[text("Delivered", "تم التسليم"), deal.delivered_at ? formatDate(deal.delivered_at) : "—"], [text("Destination", "الوجهة"), text(deal.delivery_country ?? "—")]].map(([label,value]) => <div key={label} className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}</div>
                  {isSeller && status === "held" && !deal.frozen && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        placeholder="Carrier (e.g. Aramex)"
                      />
                      <Input
                        value={tracking}
                        onChange={(e) => setTracking(e.target.value)}
                        placeholder="Tracking number"
                      />
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={shippingState}
                        onChange={(e) => setShippingState(e.target.value)}
                      >
                        {Object.entries(shippingStatusLabels)
                          .filter(([key]) => !["not_required", "delivered"].includes(key))
                          .map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                      </select>
                      <Input
                        type="date"
                        value={shipEta}
                        onChange={(e) => setShipEta(e.target.value)}
                        aria-label="Estimated delivery"
                        className="sm:col-span-3"
                      />
                      <Button
                        className="sm:col-span-3"
                        variant="outline"
                        onClick={() =>
                          action.mutate(() =>
                            shipFn({
                              data: {
                                dealId: deal.id,
                                carrier: carrier.trim(),
                                tracking: tracking.trim(),
                                status: shippingState,
                                eta: shipEta || null,
                              },
                            }),
                          )
                        }
                      >
                        Update shipping
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(deal as any).deal_type === "freelance" && <FreelancePanel deal={deal} files={filesQ.data ?? []} />}
            {(deal as any).deal_type === "services" && !milestonesQ.data?.length && <ServicesPanel deal={deal} files={filesQ.data ?? []} />}
            {!termsAgreed && (
              <Card id="terms" className="scroll-mt-24 border-warning/40 bg-warning/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <FileSignature className="size-5 text-warning" />
                    <h2 className="font-bold">{text("Deal terms need agreement")}</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground" data-no-localize>
                    {text(`Nothing is paid until both sides accept the terms: value ${money(amount)}, ${fpl[0].toLowerCase()}, an inspection period of ${deal.inspection_days} day(s) for ${payerT[0]}${deal.due_at ? `, delivery by ${formatDate(deal.due_at)}` : ""}.`,
                      `لا يُدفع أي مبلغ قبل أن يوافق الطرفان على الشروط: القيمة ${money(amount)}، ${fpl[1]}، ومدة فحص ${deal.inspection_days} يوم لدى ${payerT[1]}${deal.due_at ? `، والتسليم قبل ${formatDate(deal.due_at)}` : ""}.`)}
                  </p>
                  {deal.terms_note && (
                    <p className="mt-2 rounded-md bg-background p-3 text-sm">
                      <b>Note from the other party:</b> {deal.terms_note}
                    </p>
                  )}
                  {canDecideTerms ? (
                    <>
                      <Textarea
                        value={termsNote}
                        onChange={(e) => setTermsNote(e.target.value)}
                        rows={2}
                        className="mt-3"
                        placeholder="Optional: what should change before you accept?"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button onClick={() => action.mutate(() => agreeFn({ data: { dealId: deal.id } }))}>
                          <BadgeCheck /> {text(ACCEPT_LABEL[0], ACCEPT_LABEL[1])}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={termsNote.trim().length < 3}
                          onClick={() =>
                            action.mutate(() => changeFn({ data: { dealId: deal.id, note: termsNote.trim() } }))
                          }
                        >
                          Request a change
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={termsNote.trim().length < 3}
                          onClick={() =>
                            action.mutate(() => rejectFn({ data: { dealId: deal.id, note: termsNote.trim() } }))
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {bothJoined
                        ? "Waiting for the other party to review and accept the terms."
                        : "Share the invitation link so the other party can review the terms."}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <h2 id="deal-actions" className="scroll-mt-24 font-bold">{text("Payment and actions", "الدفع والإجراءات")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {text("Every payment is recorded below with its status.", "يُسجَّل كل دفع وتحويل أدناه مع حالته.")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canFund && (
                    <div className="w-full rounded-lg border p-4 text-sm">
                      {quote && !quoteExpired ? (
                        <div className="space-y-3" data-no-localize>
                          {quote.milestone && <Info label={text("Milestone", "المرحلة")} value={`${quote.milestone.seq} · ${quote.milestone.title} · ${money(quote.milestone.amount)}`} />}
                          <Info label={text(quote.milestone ? "Milestone amount (provider conversion + provider spread)" : "Deal amount (provider conversion + provider spread)", quote.milestone ? "مبلغ المرحلة (تحويل المزوّد + فارق المزوّد)" : "مبلغ الصفقة (تحويل المزوّد + فارق المزوّد)")} value={money(quoteAmountLine(quote), quote.target_currency)} />
                          <Info label={text("Your fee share", "حصتك من الرسوم")} value={money(quote.fee, quote.target_currency)} />
                          <Info label={quote.breakdown.buyerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : `${text("VAT", "الضريبة")} ${Math.round(quote.breakdown.buyerVatRate * 100)}%`} value={money(quote.vat, quote.target_currency)} />
                          <Info label={text("Payment method", "طريقة الدفع")} value={text(METHOD_LABEL[quote.method][0], METHOD_LABEL[quote.method][1])} />
                          <div className="border-t pt-3"><Info label={text("Total", "الإجمالي")} value={money(quote.total, quote.target_currency)} /></div>
                          <p className="text-xs leading-6 text-muted-foreground">{text("Rate", "السعر")}: <bdi>1 {deal.currency} = {quote.customer_rate} {quote.target_currency}</bdi> ({text("provider rate", "سعر المزوّد")} <bdi>{quote.payIn.providerRate}</bdi>; {text("the difference is kept by the provider", "الفارق يحتفظ به المزوّد")}). {text("Fees and VAT converted at the provider rate; the provider spread is included in the deal amount line.", "تُحوّل الرسوم والضريبة بسعر المزوّد؛ ويُدرج فارق المزوّد في بند مبلغ الصفقة.")}</p>
                          <p className="text-xs text-muted-foreground">{text("Rate locked until", "السعر ثابت حتى")} {new Date(quote.expires_at).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-GB")}</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-muted-foreground">
                            {quoteExpired
                              ? text("Your exchange rate has expired. Please request a new quote.", "انتهت صلاحية سعر الصرف. اطلب عرضاً جديداً.")
                              : nextToFund
                                ? text(`Next: fund milestone ${nextToFund.seq} (${money(Number(nextToFund.amount))}). Lock an exchange rate for 15 minutes before paying.`, `التالي: تمويل المرحلة ${nextToFund.seq} (${money(Number(nextToFund.amount))}). ثبّت سعر الصرف لمدة 15 دقيقة قبل الدفع.`)
                                : text("Lock an exchange rate for 15 minutes before paying.", "ثبّت سعر الصرف لمدة 15 دقيقة قبل الدفع.")}
                          </span>
                          <label className="flex items-center gap-2" data-no-localize>
                            <span className="text-muted-foreground">{text("Pay by", "طريقة الدفع")}</span>
                            <select
                              aria-label={text("Payment method", "طريقة الدفع")}
                              className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                              value={payMethod}
                              onChange={(e) => { setQuote(null); setPayMethod(e.target.value as PaymentMethod); }}
                            >
                              {PAYMENT_METHODS.map((m) => {
                                const c = pricing.data?.methods?.find((x) => x.method === m);
                                return <option key={m} value={m} disabled={c ? !c.allowed : false}>{text(METHOD_LABEL[m][0], METHOD_LABEL[m][1])}{c && !c.allowed ? text(" (not available)", " (غير متاحة)") : ""}</option>;
                              })}
                            </select>
                          </label>
                          {(() => { const c = pricing.data?.methods?.find((x) => x.method === payMethod); return c && !c.allowed && c.reason ? <span role="status" className="w-full text-xs text-warning">{text(c.reason[0], c.reason[1])}</span> : null; })()}
                          <label className="flex items-center gap-2" data-no-localize>
                            <span className="text-muted-foreground">{text("Pay in", "الدفع بعملة")}</span>
                            <select
                              aria-label={text("Pay-in currency", "عملة الدفع")}
                              className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                              value={payCurrency ?? pricing.data?.payIn.payCurrency ?? ""}
                              onChange={(e) => { setQuote(null); setPayCurrency(e.target.value as (typeof PAY_CURRENCIES)[number]); }}
                            >
                              {PAY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!termsAgreed}
                            onClick={async () => {
                              try {
                                setQuote(await getQuote({ data: { dealId: deal.id, method: payMethod, payCurrency: payCurrency ?? (pricing.data?.payIn.payCurrency as (typeof PAY_CURRENCIES)[number] | undefined) } }));
                              } catch (e) {
                                setPaymentNotice({
                                  ok: false,
                                  status: "failed",
                                  provider: "fx",
                                  providerLabel: "FX",
                                  message: e instanceof Error ? e.message : "Quote unavailable.",
                                });
                              }
                            }}
                          >
                            {text("Show my amount", "اعرض المبلغ بعملتك")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {canFund && (
                    <Button
                      onClick={() =>
                        payment.mutate(() =>
                          fund({
                            data: {
                              dealId: deal.id,
                              ...(quote && !quoteExpired ? { quoteId: quote.id } : {}),
                            },
                          }),
                        )
                      }
                      disabled={
                        !bothJoined ||
                        !termsAgreed ||
                        payment.isPending ||
                        !quote || quoteExpired
                      }
                    >
                      <Wallet /> {payment.isPending ? text("Starting payment…", "جارٍ بدء الدفع…") : nextToFund ? text(`Pay milestone ${nextToFund.seq}`, `ادفع المرحلة ${nextToFund.seq}`) : text("Pay for the deal", "ادفع مبلغ الصفقة")}
                    </Button>
                  )}
                  {canFund && quote && !quoteExpired && (
                    <Button
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={!bothJoined || !termsAgreed || payment.isPending}
                      onClick={() =>
                        payment.mutate(() => fund({ data: { dealId: deal.id, quoteId: quote.id, simulateDecline: true } }))
                      }
                    >
                      {text("Simulate a declined payment (demo)", "محاكاة رفض الدفع (تجريبي)")}
                    </Button>
                  )}
                  {isSeller && ["held", "under_review"].includes(status) && !deal.frozen && (
                    <Button
                      onClick={() =>
                        action.mutate(() => deliverFn({ data: { dealId: deal.id } }))
                      }
                    >
                      <BadgeCheck /> {text(DELIVER_LABEL[0], DELIVER_LABEL[1])}
                    </Button>
                  )}
                  {isBuyer && !deal.frozen && (status === "delivered" || status === "under_review") && (
                    <Button
                      onClick={() =>
                        payment.mutate(() => release({ data: { dealId: deal.id } }))
                      }
                      disabled={payment.isPending}
                    >
                      <Wallet /> {payment.isPending ? text("Requesting the payout…", "جارٍ طلب التحويل…") : text(RELEASE_LABEL[0], RELEASE_LABEL[1])}
                    </Button>
                  )}
                  {status === "released" && (
                    <p className="text-sm text-muted-foreground">
                      Funds were released to the seller. This deal is complete.
                    </p>
                  )}
                  {!bothJoined && (
                    <p className="text-sm text-muted-foreground">
                      The other party has not joined yet — share the invitation link first.
                    </p>
                  )}
                </div>





                {isBuyer && status === "delivered" && (
                  <div className="mt-5 rounded-md border border-border p-4">
                    <p className="text-sm font-semibold">Need a revision before releasing?</p>
                    <Textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      className="mt-2"
                      placeholder="Describe what still needs to change"
                    />
                    <Button
                      variant="outline"
                      className="mt-3"
                      disabled={reviewNote.trim().length < 3}
                      onClick={() => action.mutate(() => reviewFn({ data: { dealId: deal.id, note: reviewNote.trim() } }))}
                    >
                      Ask for a revision
                    </Button>
                  </div>
                )}

                <div id="dispute" className="scroll-mt-24"><DisputePanel deal={deal} isParty={isBuyer || isSeller} /></div>
              </CardContent>
            </Card>

            <FrozenBanner deal={deal} />
            <CancelPanel deal={deal} isParty={isBuyer || isSeller} />

            <TermVersionsCard deal={deal} />
            <InvoiceCard deal={deal} />


            {dealClosed && bothJoined && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Star className="size-5 text-primary" />
                    <h2 className="font-bold">{text("Rate the other party")}</h2>
                  </div>
                  {myRating ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      You rated this deal <bdi dir="ltr">{myRating.score}/5</bdi>
                      {myRating.comment ? ` — “${myRating.comment}”` : ""}
                    </p>
                  ) : counterpartyId ? (
                    <div className="mt-3 space-y-2">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={ratingScore}
                        onChange={(e) => setRatingScore(e.target.value)}
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={String(n)}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                      <Textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        rows={2}
                        placeholder="Optional comment about this trade"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          action.mutate(() =>
                            submitRating({
                              dealId: deal.id,
                              rateeId: counterpartyId,
                              score: Number(ratingScore),
                              comment: ratingComment.trim(),
                            }),
                          )
                        }
                      >
                        Submit rating
                      </Button>
                    </div>
                  ) : null}
                  {ratingAboutMe && (
                    <p className="mt-4 rounded-md bg-muted p-3 text-sm">
                      The other party rated you <bdi dir="ltr">{ratingAboutMe.score}/5</bdi>
                      {ratingAboutMe.comment ? ` — “${ratingAboutMe.comment}”` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Receipt className="size-5 text-primary" />
                  <h2 className="font-bold">{text("Payment records")}</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Funding, payouts, and refunds with the exact status both parties can see.
                </p>
                <div className="mt-4 space-y-3">
                  {(transactions.data ?? []).map((t) => (
                    <div key={t.id} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold capitalize">
                          {t.kind} · <bdi dir="ltr">{money(t.amount, t.currency)}</bdi>
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            t.status === "succeeded"
                              ? "bg-primary/10 text-primary"
                              : t.status === "failed"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-warning/10 text-warning"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(t.created_at)} · {text("Payment reference", "مرجع الدفع")}: <bdi>{insightRef(t.id)}</bdi>
                      </p>
                      {t.error_message && (
                        <p className="mt-2 text-sm text-destructive">{t.error_message}</p>
                      )}
                      {!t.error_message && t.note && (
                        <p className="mt-2 text-sm text-muted-foreground">{t.note}</p>
                      )}
                    </div>
                  ))}
                  {(transactions.data ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No payments have been recorded for this deal yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>


            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-primary" />
                  <h2 className="font-bold">{text("Deal conversation")}</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Talk to the other party and to Insight support in one place.
                </p>
                <div className="mt-4 space-y-3">
                  {(messages.data ?? []).map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-md p-4 ${m.author_kind === "staff" ? "bg-primary/10" : "bg-muted"}`}
                    >
                      <div className="flex justify-between gap-3 text-xs">
                        <b>{m.author_name}</b>
                        <span className="text-muted-foreground">{formatDate(m.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm">{m.body}</p>
                    </div>
                  ))}
                  {(messages.data ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  )}
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="mt-4"
                  placeholder="Write a message"
                />
                <Button
                  className="mt-3"
                  disabled={!message.trim() || action.isPending}
                  onClick={() => action.mutate(() => postDealMessage(deal.id, message.trim()))}
                >
                  <Send /> Send message
                </Button>
              </CardContent>
            </Card>
          </div>

          <aside className="min-w-0 space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  <h2 className="font-bold">{text("Parties")}</h2>
                </div>
                <div data-no-localize>
                <Info
                  label={text(cap(R.payer)[0], cap(R.payer)[1])}
                  value={deal.buyer_id ? (isBuyer ? text("You", "أنت") : text("The other party (joined)", "الطرف الآخر (انضم)")) : text("Not joined yet", "لم ينضم بعد")}
                />
                <Info
                  label={text(cap(R.payee)[0], cap(R.payee)[1])}
                  value={deal.seller_id ? (isSeller ? text("You", "أنت") : text("The other party (joined)", "الطرف الآخر (انضم)")) : text("Not joined yet", "لم ينضم بعد")}
                />
                </div>
                {partyProfiles.data?.map((p) => <div data-no-localize key={p.id} className="mt-4 border-t pt-4"><p className="text-xs text-muted-foreground">{text(p.id === deal.buyer_id ? cap(R.payer)[0] : cap(R.payee)[0], p.id === deal.buyer_id ? R.payer.ar : R.payee.ar)}</p><p className="mt-1 text-sm font-medium">{p.full_name ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{text(p.country ?? "—")}</p>{p.verification_status === "verified" && <p className="mt-2 flex items-center gap-1 text-xs text-primary"><BadgeCheck className="size-3" />{text("Verified", "موثق")}</p>}</div>)}
                {isCreator && <Info label="You invited" value={deal.counterparty_email ?? "—"} />}
              </CardContent>
            </Card>

            <AttachmentsCard deal={deal} isParty={isBuyer || isSeller} />
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold">{text("Deal log", "سجل الصفقة")}</h2>
                {timeline.isLoading ? (
                  <p className="mt-3 text-sm text-muted-foreground">Loading activity…</p>
                ) : (
                  <ol className="mt-5 space-y-5 border-s border-border ps-5">
                    {(timeline.data ?? []).map((e) => (
                      <li key={e.id} className="relative">
                        <span className="absolute -start-[1.6rem] top-1 size-3 rounded-full border-2 border-card bg-primary" />
                        <p className="text-sm font-medium" data-no-localize>{text(e.title)}</p>
                        <p className="text-xs text-muted-foreground" data-no-localize>
                          {formatDate(e.created_at)}
                          {e.note ? ` · ${(() => { const corrected = paymentEventNote(e.note, transactions.data ?? []); return corrected ? text(corrected[0], corrected[1]) : text(e.note.includes("Funds are held by a licensed payment provider") ? "Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record." : e.note); })()}` : ""}
                        </p>
                      </li>
                    ))}
                    {(timeline.data ?? []).length === 0 && (
                      <li className="text-sm text-muted-foreground">No activity yet.</li>
                    )}
                  </ol>
                )}
              </CardContent>
            </Card>



            {!bothJoined && (
              <Card className="border-warning/40 bg-warning/5">
                <CardContent className="p-5">
                  <div className="flex gap-2">
                    <CalendarDays className="size-5 text-warning" />
                    <div>
                      <p className="font-semibold">Action required</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Share the invitation link so the other party can join this deal.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="size-5 text-primary" />
                  <h2 className="font-bold">{text("Note for Insight")}</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a note about this deal for the Insight team to review.
                </p>
                <Textarea
                  value={supportNote}
                  onChange={(e) => setSupportNote(e.target.value)}
                  rows={3}
                  className="mt-3"
                  placeholder="What do you need help with?"
                />
                <Button
                  variant="outline"
                  className="mt-3"
                  disabled={supportNote.trim().length < 3}
                  onClick={() => action.mutate(() => contactSupport(deal.id, supportNote.trim()))}
                >
                  Send to Insight
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
        {nextStep?.mine && nextStep.primary && <>
          <div aria-hidden="true" className="h-24 lg:hidden" />
          <div data-no-localize className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-20px_rgb(12_42_34/0.4)] backdrop-blur lg:hidden">
            <Button className="h-14 w-full rounded-2xl text-base" disabled={action.isPending || payment.isPending} onClick={() => nextStep.primary && onNextStep(nextStep.primary.action)}>{text(nextStep.primary.label[0], nextStep.primary.label[1])}</Button>
          </div>
        </>}
      </div>
    </SiteShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const { text } = useLocale();
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3">
      <dt className="text-sm text-muted-foreground">{text(label)}</dt>
      <dd className="min-w-0 break-words text-end text-sm font-semibold tabular-nums">{text(value)}</dd>
    </div>
  );
}

function cap1(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** The deal reference with a one-tap copy, for sharing with the other party. */
function RefChip({ value }: { value: string }) {
  const { text } = useLocale();
  const [copied, setCopied] = useState(false);
  return <button type="button" onClick={() => { void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary" aria-label={text(`Copy deal reference ${value}`, `انسخ رقم الصفقة ${value}`)}>
    <bdi dir="ltr" className="tabular-nums">{value}</bdi>{copied ? <CheckIcon className="size-3.5 text-primary" /> : <CopyIcon className="size-3.5" />}
  </button>;
}
