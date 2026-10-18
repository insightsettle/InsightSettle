import { getDealPricing, requestFxQuote, PAY_CURRENCIES, type FxQuote } from "@/lib/fx-quotes.functions";
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
import { quoteAmountLine } from "@/lib/deal-display";
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
import { Link, createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
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
import { feePayerLabels, getDealByRef, shippingStatusLabels } from "@/lib/deals";
import { formatDate, statusLabels, type DealStatus } from "@/lib/demo-data";
import {
  requestFundsRelease,
  startDealFunding,
  type PaymentResult,
} from "@/lib/payments.functions";

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
  if (query.isPending) return <p data-no-localize>{text('Loading…', 'جارٍ التحميل…')}</p>;
  if (query.data && (query.data.owner || query.data.buyer)) return <AuctionDealScreen refCode={dealId} />;
  return <OrdinaryDealPage />;
}

function OrdinaryDealPage() {
  const { dealId } = Route.useParams();
  const { locale, text } = useLocale();
  const queryClient = useQueryClient();
  const { user } = useSessionUser();

  const dealQuery = useQuery({ queryKey: ["deal", dealId], queryFn: () => getDealByRef(dealId) });
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
    queryClient.invalidateQueries({ queryKey: ["my-deals"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const action = useMutation({
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
  const pricing = useQuery({
    queryKey: ["deal-pricing", deal?.id, deal?.status, deal?.terms_version, payCurrency],
    queryFn: () => pricingFn({ data: { dealId: deal?.id ?? "", payCurrency } }),
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
          <h1 className="text-3xl font-bold">
            {dealQuery.isLoading ? "Loading deal…" : "Deal not found"}
          </h1>
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
  const canDecideTerms = !termsAgreed && bothJoined && !isCreator;
  const inspectionEnds = deal.auto_release_at ? new Date(deal.auto_release_at) : null;
  const hoursLeft = inspectionEnds
    ? Math.max(0, Math.round((inspectionEnds.getTime() - Date.now()) / 3600000))
    : null;
  const inspectionExpired = !!inspectionEnds && inspectionEnds.getTime() <= Date.now();
  const shippingNeeded = !!deal.shipping_status && deal.shipping_status !== "not_required";
  const counterpartyId = isBuyer ? deal.seller_id : deal.buyer_id;
  const myRating = (ratings.data ?? []).find((r) => r.rater_id === user?.id);
  const ratingAboutMe = (ratings.data ?? []).find((r) => r.ratee_id === user?.id);
  const dealClosed = status === "released" || status === "refunded";
  // Per-milestone funding (D-43): the buyer funds the next milestone while the contract is in progress.
  const perMilestone = (deal as any).funding_mode === "per_milestone";
  const nextToFund = perMilestone ? (milestonesQ.data ?? []).find((m: any) => m.status === "pending") ?? null : null;
  const canFund = isBuyer && (perMilestone ? ["pending_funding", "in_progress"].includes(status) && !!nextToFund : status === "pending_funding");

  return (
    <SiteShell>
      <div className="min-w-0">
        <nav className="mb-5 flex items-center gap-2 text-xs text-muted-foreground" data-no-localize><Link to="/dashboard" hash="saved-deals">{text("Deals", "الصفقات")}</Link><span>‹</span><bdi>{deal.ref}</bdi></nav>
        <header className="flex flex-wrap items-start justify-between gap-4" data-no-localize>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{deal.title}</h2><StatusBadge status={status} /><span className="rounded-full bg-gold-subtle px-3 py-1 text-xs font-medium text-gold-foreground">{text(({goods:"Goods",contracting:"Contracting & fit-out",services:"Services",freelance:"Freelance & digital work"} as Record<string,string>)[(deal as any).deal_type ?? "goods"] ?? "Goods")}</span></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{text("with", "مع")} {partyProfiles.data?.find((p) => p.id === counterpartyId)?.full_name ?? deal.counterparty_email ?? text("Other party", "الطرف الآخر")} ({text(partyProfiles.data?.find((p) => p.id === counterpartyId)?.country ?? (isBuyer ? deal.supplier_country : deal.delivery_country) ?? "—")}) · {text("created", "أُنشئت")} {new Date(deal.created_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB")} · <bdi>{deal.ref}</bdi></p><p className="mt-2 text-sm text-muted-foreground">{deal.description}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => document.getElementById("deal-actions")?.scrollIntoView({ behavior: "smooth", block: "start" })}>{text("Deal actions", "إجراءات الصفقة")}</Button>{canDecideTerms && <Button onClick={() => action.mutate(() => agreeFn({ data: { dealId: deal.id } }))}>{text("Accept the terms", "قبول الشروط")}</Button>}{isSeller && status === "held" && <Button onClick={() => action.mutate(() => deliverFn({ data: { dealId: deal.id } }))}>{text("Confirm delivery", "تأكيد التسليم")}</Button>}{isBuyer && ["delivered", "under_review"].includes(status) && <Button disabled={payment.isPending} onClick={() => payment.mutate(() => release({ data: { dealId: deal.id } }))}>{text("Release the funds", "الإفراج عن الأموال")}</Button>}</div>
        </header>
        {status === "delivered" && inspectionEnds && <div data-no-localize className="mt-5 flex gap-3 rounded-lg border border-warning/30 bg-warning-subtle p-4 text-warning"><Timer className="size-5 shrink-0" /><div><p className="text-sm font-medium">{text("Inspection ends", "ينتهي الفحص")} {inspectionEnds.toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" })} · {text("Riyadh time", "بتوقيت الرياض")}</p><p className="mt-1 text-xs">{text(deal.auto_release_enabled ? "If the buyer takes no action, the funds are released to the seller." : "Auto-release is off — the buyer must accept manually.", deal.auto_release_enabled ? "إذا لم يتخذ المشتري إجراءً، يُفرج عن الأموال للمورد." : "الإفراج التلقائي معطل — يجب قبول المشتري يدوياً.")}</p></div></div>}
        <div className="mt-6"><EscrowStepper status={deal.status} termsStatus={deal.terms_status} /></div>
        {(milestonesQ.data?.length ?? 0) > 0 && <div className="mt-6"><ContractDashboard deal={deal} milestones={milestonesQ.data ?? []} isBuyer={isBuyer} isSeller={isSeller} termVersions={termsQ.data ?? []} onDone={refresh} /></div>}
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold">{text("Amount summary", "ملخص المبلغ")}</h3><CustodyNote className="mt-3" /><p className="mt-5 text-xs text-muted-foreground">{text("Deal amount", "مبلغ الصفقة")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  <bdi dir="ltr">{money(amount)}</bdi>
                </p>
                <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
                  {fb && <><Info label={text("Your fee share", "حصتك من الرسوم")} value={money(isBuyer ? fb.buyerShare : fb.sellerShare)} /><Info label={(isBuyer ? fb.buyerVatRate : fb.sellerVatRate) === 0 ? text("No VAT", "لا توجد ضريبة") : `${text("VAT", "الضريبة")} ${Math.round((isBuyer ? fb.buyerVatRate : fb.sellerVatRate)*100)}% · ${text((isBuyer ? deal.delivery_country : deal.supplier_country) ?? "SA")}`} value={money(isBuyer ? fb.buyerVat : fb.sellerVat)} /><Info label="Platform fee" value={money(fb.fee)} /></>}
                  <Info
                    label="Fee paid by"
                    value={feePayerLabels[deal.fee_payer] ?? "Buyer pays the fee"}
                  />
                  {fb && (
                    <>
                      <Info label={text("Buyer fee share", "حصة المشتري من الرسوم")} value={`${money(fb.buyerShare)} + ${fb.buyerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : `VAT ${Math.round(fb.buyerVatRate * 100)}% ${text(deal.delivery_country ?? "SA")} ${money(fb.buyerVat)}`}`} />
                      <Info label={text("Supplier fee share", "حصة المورد من الرسوم")} value={`${money(fb.sellerShare)} + ${fb.sellerVatRate === 0 ? text("No VAT", "لا توجد ضريبة") : `VAT ${Math.round(fb.sellerVatRate * 100)}% ${text(deal.supplier_country ?? "SA")} ${money(fb.sellerVat)}`}`} />
                      <Info label="Buyer pays" value={pin && !perMilestone && pin.payCurrency !== deal.currency ? `${money(fb.buyerTotal)} ≈ ${money(pin.total, pin.payCurrency)}` : money(fb.buyerTotal)} />
                      <Info label="Supplier receives" value={money(fb.supplierNet)} />
                    </>
                  )}
                  <Info label="Inspection period" value={`${deal.inspection_days} day(s)`} />
                <Info label="Quantity" value={String(deal.quantity ?? 1)} />
                <Info label="Auto-release" value={deal.auto_release_enabled ? "On" : "Off — buyer must accept"} />
                {deal.acceptance_criteria && <Info label="Acceptance criteria" value={deal.acceptance_criteria} />}
                {deal.refund_conditions && <Info label="Refund conditions" value={deal.refund_conditions} />}
                  <Info label="Created" value={formatDate(deal.created_at)} />
                  <Info label="Due" value={deal.due_at ? formatDate(deal.due_at) : "No due date"} />
                </dl>
                {(deal.fee_override_flat != null || deal.fee_override_percent != null) && (
                  <p className="mt-3 rounded-md bg-primary/10 p-3 text-xs text-primary">
                    Insight applied a special fee to this deal.
                    {deal.fee_override_note ? ` ${deal.fee_override_note}` : ""}
                  </p>
                )}
                {perMilestone && <p data-no-localize className="mt-5 border-t pt-4 text-xs leading-6 text-muted-foreground">{text("This contract is funded milestone by milestone. Each milestone is paid at that day's exchange rate with its share of the fee; each funding gets its own tax invoice.", "يُموَّل هذا العقد مرحلةً بمرحلة. تُدفع كل مرحلة بسعر صرف يومها مع حصتها من الرسوم، ولكل تمويل فاتورة ضريبية مستقلة.")}</p>}
                {pin && !perMilestone && <div data-no-localize className="mt-5 border-t pt-4"><p className="text-xs text-muted-foreground">{text(isBuyer ? "Total paid" : "Supplier receives", isBuyer ? "إجمالي المدفوع" : "يستلم المورد")}</p><p className="mt-2 text-2xl font-semibold tabular-nums"><bdi>{isBuyer ? money(pin.total, pin.payCurrency) : fb ? money(fb.supplierNet) : "—"}</bdi></p><p className="mt-3 text-xs leading-6 text-muted-foreground">{text("FX rate and spread belong to the payment provider.", "سعر الصرف والفارق يعودان لمزوّد الدفع.")} <bdi>1 {deal.currency} = {pin.customerRate} {pin.payCurrency}</bdi></p></div>}
                {transactions.data?.filter((t) => t.kind === "funding" && t.status === "succeeded").map((t) => <p key={t.id} className="mt-3 text-xs text-muted-foreground">{text("Provider confirmation", "تأكيد مزوّد الدفع")}: <bdi>{t.provider_ref ?? "—"}</bdi> · {formatDate(t.created_at)}</p>)}
              </CardContent>
            </Card>

            {isSeller && fb && !["released", "refunded", "partially_refunded", "cancelled", "rejected", "completed"].includes(status) && (
              <PayoutPlan lines={planDealPayouts({ currency: deal.currency, supplierNet: fb.supplierNet, amount: Number(deal.amount), sellerShare: fb.sellerShare, sellerVat: fb.sellerVat, retentionPercent: Number((deal as any).retention_percent ?? 0), milestones: (milestonesQ.data ?? []).map((m: any) => ({ seq: m.seq, title: m.title, amount: Number(m.amount) })) })} />
            )}
            {shippingNeeded && (
              <Card>
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
                  {isSeller && status !== "released" && status !== "refunded" && (
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
                          .filter(([key]) => key !== "not_required")
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

            {(deal as any).deal_type === "freelance" && !milestonesQ.data?.length && <FreelancePanel deal={deal} files={filesQ.data ?? []} />}
            {(deal as any).deal_type === "services" && !milestonesQ.data?.length && <ServicesPanel deal={deal} files={filesQ.data ?? []} />}
            {!termsAgreed && (
              <Card className="border-warning/40 bg-warning/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <FileSignature className="size-5 text-warning" />
                    <h2 className="font-bold">{text("Deal terms need agreement")}</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No money can be funded until both sides accept the terms: value{" "}
                    {money(amount)}, {feePayerLabels[deal.fee_payer] ?? "buyer pays the fee"},
                    buyer inspection period of {deal.inspection_days} day(s)
                    {deal.due_at ? `, delivery by ${formatDate(deal.due_at)}` : ""}.
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
                          <BadgeCheck /> Accept the terms
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
                <h2 id="deal-actions" className="scroll-mt-6 font-bold">{text("Deal actions", "إجراءات الصفقة")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Actions depend on your side of the deal and its current status. Every money
                  movement is recorded below with its status.
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
                                setQuote(await getQuote({ data: { dealId: deal.id, payCurrency: payCurrency ?? (pricing.data?.payIn.payCurrency as (typeof PAY_CURRENCIES)[number] | undefined) } }));
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
                            {text("Get exchange-rate quote", "اطلب عرض سعر الصرف")}
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
                      <Wallet /> {payment.isPending ? text("Starting payment…", "جارٍ بدء الدفع…") : nextToFund ? text(`Fund milestone ${nextToFund.seq}`, `موّل المرحلة ${nextToFund.seq}`) : text("Fund the deal", "موّل الصفقة")}
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
                  {isSeller && status === "held" && (
                    <Button
                      onClick={() =>
                        action.mutate(() => deliverFn({ data: { dealId: deal.id } }))
                      }
                    >
                      <BadgeCheck /> Confirm delivery
                    </Button>
                  )}
                  {isBuyer && (status === "delivered" || status === "under_review") && (
                    <Button
                      onClick={() =>
                        payment.mutate(() => release({ data: { dealId: deal.id } }))
                      }
                      disabled={payment.isPending}
                    >
                      <Wallet /> {payment.isPending ? "Requesting provider payout…" : "Release the funds"}
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
                <CustodyNote className="mt-3" />

                {action.error && (
                  <p className="mt-3 text-sm text-destructive">{(action.error as Error).message}</p>
                )}

                {status === "delivered" && inspectionEnds && (
                  <div className="mt-4 flex gap-2 rounded-md border border-primary/30 bg-primary/5 p-4">
                    <Timer className="size-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">
                        {inspectionExpired
                          ? "The inspection period has ended"
                          : `Inspection period ends in ${hoursLeft} hour(s)`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {inspectionExpired
                          ? "The funds can now be released to the seller. If something is wrong, open a dispute before releasing."
                          : `Ends ${formatDate(deal.auto_release_at ?? "")}. If the buyer takes no action, the funds are released to the seller.`}
                      </p>
                    </div>
                  </div>
                )}

                {paymentNotice && (
                  <div
                    className={`mt-4 rounded-md border p-4 text-sm ${
                      paymentNotice.ok
                        ? "border-primary/40 bg-primary/5"
                        : "border-destructive/40 bg-destructive/5"
                    }`}
                  >
                    <p className="font-semibold">
                      {paymentNotice.ok ? "Payment recorded" : "Payment could not be completed"}
                    </p>
                    <p className="mt-1 text-muted-foreground">{paymentNotice.message}</p>
                  </div>
                )}

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

                <DisputePanel deal={deal} isParty={isBuyer || isSeller} />
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
                <CustodyNote className="mt-3" />
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
                        {formatDate(t.created_at)} · {t.provider}
                        {t.provider_ref ? ` · ${t.provider_ref}` : ""}
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
                <Info
                  label="Buyer"
                  value={
                    deal.buyer_id ? (isBuyer ? "You" : "Other party (joined)") : "Awaiting buyer"
                  }
                />
                <Info
                  label="Seller"
                  value={
                    deal.seller_id
                      ? isSeller
                        ? "You"
                        : "Other party (joined)"
                      : "Awaiting seller"
                  }
                />
                {partyProfiles.data?.map((p) => <div data-no-localize key={p.id} className="mt-4 border-t pt-4"><p className="text-xs text-muted-foreground">{text(p.id === deal.buyer_id ? "Buyer" : "Supplier", p.id === deal.buyer_id ? "المشتري" : "المورد")}</p><p className="mt-1 text-sm font-medium">{p.full_name ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{text(p.country ?? "—")}</p>{p.verification_status === "verified" && <p className="mt-2 flex items-center gap-1 text-xs text-primary"><BadgeCheck className="size-3" />{text("Verified", "موثق")}</p>}</div>)}
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
                        <p className="text-xs text-muted-foreground">
                          {formatDate(e.created_at)}
                          {e.note ? ` · ${text(e.note.includes("Funds are held by a licensed payment provider") ? "Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record." : e.note)}` : ""}
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
      </div>
    </SiteShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const { text } = useLocale();
  return (
    <div className="mt-3 flex items-center justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{text(label)}</dt>
      <dd className="min-w-0 break-words text-end text-sm font-semibold tabular-nums">{text(value)}</dd>
    </div>
  );
}
