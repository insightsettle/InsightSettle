import { requestFxQuote, type FxQuote } from "@/lib/fx-quotes.functions";
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
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useSessionUser } from "@/hooks/use-session";
import {
  agreeToTerms,
  confirmDelivery,
  contactSupport,
  listDealMessages,
  listDealRatings,
  listDealTransactions,
  listTimeline,
  openDispute,
  postDealMessage,
  rejectTerms,
  requestReview,
  requestTermsChange,
  submitRating,
  updateShipping,
} from "@/lib/deal-actions";
import { feePayerLabels, getDealByRef, shippingStatusLabels, splitFee } from "@/lib/deals";
import { calcFee, formatDate, formatSAR, statusLabels, type DealStatus } from "@/lib/demo-data";
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
  const queryClient = useQueryClient();
  const { user } = useSessionUser();

  const dealQuery = useQuery({ queryKey: ["deal", dealId], queryFn: () => getDealByRef(dealId) });
  const deal = dealQuery.data ?? null;

  const timeline = useQuery({
    queryKey: ["deal-timeline", deal?.id],
    queryFn: () => listTimeline(deal!.id),
    enabled: !!deal,
  });
  const messages = useQuery({
    queryKey: ["deal-messages", deal?.id],
    queryFn: () => listDealMessages(deal!.id),
    enabled: !!deal,
  });

  const transactions = useQuery({
    queryKey: ["deal-transactions", deal?.id],
    queryFn: () => listDealTransactions(deal!.id),
    enabled: !!deal,
  });

  const ratings = useQuery({
    queryKey: ["deal-ratings", deal?.id],
    queryFn: () => listDealRatings(deal!.id),
    enabled: !!deal,
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
    queryClient.invalidateQueries({ queryKey: ["my-deals"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const action = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
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
  const standardFee = calcFee(amount).fee;
  const fee =
    deal.fee_override_flat !== null && deal.fee_override_flat !== undefined
      ? Number(deal.fee_override_flat)
      : deal.fee_override_percent !== null && deal.fee_override_percent !== undefined
        ? (amount * Number(deal.fee_override_percent)) / 100
        : standardFee;

  const isBuyer = !!user && deal.buyer_id === user.id;
  const isSeller = !!user && deal.seller_id === user.id;
  const bothJoined = !!deal.buyer_id && !!deal.seller_id;

  const sides = splitFee(amount, fee, deal.fee_payer);
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

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/dashboard">
            <ArrowLeft /> Back to dashboard
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">{deal.ref}</p>
            <h1 className="mt-2 text-3xl font-extrabold">{deal.title}</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              {deal.description || "No description was added for this deal."}
            </p>
          </div>
          <StatusBadge status={status} className="px-4 py-2" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.8fr]">
          <div className="space-y-6">
            {!termsAgreed && (
              <Card className="border-warning/40 bg-warning/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <FileSignature className="size-5 text-warning" />
                    <h2 className="font-bold">Deal terms need agreement</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No money can be funded until both sides accept the terms: value{" "}
                    {formatSAR(amount)}, {feePayerLabels[deal.fee_payer] ?? "buyer pays the fee"},
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
                        <Button onClick={() => action.mutate(() => agreeToTerms(deal.id))}>
                          <BadgeCheck /> Accept the terms
                        </Button>
                        <Button
                          variant="outline"
                          disabled={termsNote.trim().length < 3}
                          onClick={() =>
                            action.mutate(() => requestTermsChange(deal.id, termsNote.trim()))
                          }
                        >
                          Request a change
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={termsNote.trim().length < 3}
                          onClick={() =>
                            action.mutate(() => rejectTerms(deal.id, termsNote.trim()))
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
                <h2 className="font-bold">What you can do now</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Actions depend on your side of the deal and its current status. Every money
                  movement is recorded below with its status.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {isBuyer && status === "pending_funding" && deal.currency !== "SAR" && (
                    <div className="w-full rounded-lg border p-4 text-sm">
                      {quote && !quoteExpired ? (
                        <div className="space-y-1" dir="ltr">
                          <div>
                            {deal.currency} {quote.source_amount.toLocaleString()} × {quote.customer_rate} ={" "}
                            SAR {quote.customer_amount.toLocaleString()}
                          </div>
                          <div>
                            Insight fee SAR {quote.fee.toLocaleString()} · VAT SAR {quote.vat.toLocaleString()}
                          </div>
                          <div className="font-bold">Total SAR {quote.total.toLocaleString()}</div>
                          <div className="text-muted-foreground">
                            Rate locked until {new Date(quote.expires_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-muted-foreground">
                            {quoteExpired
                              ? "Your exchange rate has expired. Please request a new quote."
                              : "Lock an exchange rate for 15 minutes before paying."}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!termsAgreed}
                            onClick={async () => {
                              try {
                                setQuote(await getQuote({ data: { dealId: deal.id } }));
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
                            Get exchange-rate quote
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {isBuyer && status === "pending_funding" && (
                    <Button
                      onClick={() =>
                        payment.mutate(() =>
                          fund({
                            data: {
                              dealId: deal.id,
                              fee,
                              ...(quote && !quoteExpired ? { quoteId: quote.id } : {}),
                            },
                          }),
                        )
                      }
                      disabled={
                        !bothJoined ||
                        !termsAgreed ||
                        payment.isPending ||
                        (deal.currency !== "SAR" && (!quote || quoteExpired))
                      }
                    >
                      <Wallet /> {payment.isPending ? "Starting payment…" : "Fund the deal"}
                    </Button>
                  )}
                  {isSeller && status === "held" && (
                    <Button
                      onClick={() =>
                        action.mutate(() => confirmDelivery(deal.id, deal.inspection_days))
                      }
                    >
                      <BadgeCheck /> Confirm delivery
                    </Button>
                  )}
                  {isBuyer && (status === "delivered" || status === "under_review") && (
                    <Button
                      onClick={() =>
                        payment.mutate(() => release({ data: { dealId: deal.id, fee } }))
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
                          : `Ends ${formatDate(deal.auto_release_at!)}. If the buyer takes no action, the funds are released to the seller.`}
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
                      onClick={() => action.mutate(() => requestReview(deal.id, reviewNote.trim()))}
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
            <AttachmentsCard deal={deal} isParty={isBuyer || isSeller} />
            <TermVersionsCard deal={deal} />
            <InvoiceCard deal={deal} />

            {shippingNeeded && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Truck className="size-5 text-primary" />
                    <h2 className="font-bold">Shipping and tracking</h2>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <p>
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
                            updateShipping(deal.id, {
                              carrier: carrier.trim(),
                              tracking: tracking.trim(),
                              status: shippingState,
                              eta: shipEta || null,
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

            {dealClosed && bothJoined && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Star className="size-5 text-primary" />
                    <h2 className="font-bold">Rate the other party</h2>
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
                  <h2 className="font-bold">Payment records</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Funding, payouts, and refunds with the exact status both parties can see.
                </p>
                <div className="mt-4 space-y-3">
                  {(transactions.data ?? []).map((t) => (
                    <div key={t.id} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold capitalize">
                          {t.kind} · <bdi dir="ltr">{formatSAR(t.amount)}</bdi>
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
                <h2 className="font-bold">Timeline</h2>
                {timeline.isLoading ? (
                  <p className="mt-3 text-sm text-muted-foreground">Loading activity…</p>
                ) : (
                  <ol className="mt-5 space-y-5 border-l border-border pl-5">
                    {(timeline.data ?? []).map((e) => (
                      <li key={e.id} className="relative">
                        <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-card bg-primary" />
                        <p className="font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(e.created_at)}
                          {e.note ? ` · ${e.note}` : ""}
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

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-primary" />
                  <h2 className="font-bold">Deal conversation</h2>
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

          <aside className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Deal value</p>
                <p className="mt-1 text-3xl font-extrabold">
                  {deal.currency} {amount.toLocaleString("en-GB")}
                </p>
                <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
                  <Info label="Platform fee" value={formatSAR(fee)} />
                  {fee !== standardFee && (
                    <Info label="Standard fee" value={formatSAR(standardFee)} />
                  )}
                  <Info
                    label="Fee paid by"
                    value={feePayerLabels[deal.fee_payer] ?? "Buyer pays the fee"}
                  />
                  <Info label="Buyer pays" value={formatSAR(sides.buyerPays)} />
                  <Info label="Seller receives" value={formatSAR(sides.sellerReceives)} />
                  <Info label="Inspection period" value={`${deal.inspection_days} day(s)`} />
                <Info label="Quantity" value={String(deal.quantity ?? 1)} />
                <Info label="Auto-release" value={deal.auto_release_enabled ? "On" : "Off — buyer must accept"} />
                {deal.acceptance_criteria && <Info label="Acceptance criteria" value={deal.acceptance_criteria} />}
                {deal.refund_conditions && <Info label="Refund conditions" value={deal.refund_conditions} />}
                  <Info label="Created" value={formatDate(deal.created_at)} />
                  <Info label="Due" value={deal.due_at ? formatDate(deal.due_at) : "No due date"} />
                </dl>
                {fee !== standardFee && (
                  <p className="mt-3 rounded-md bg-primary/10 p-3 text-xs text-primary">
                    Insight applied a special fee to this deal.
                    {deal.fee_override_note ? ` ${deal.fee_override_note}` : ""}
                  </p>
                )}
                <p className="mt-4 text-xs text-warning">
                  Payment is confirmed by the payment provider (simulated in this demo). Funds are held by a licensed payment provider. Insight runs the deal rules and keeps the record.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  <h2 className="font-bold">Parties</h2>
                </div>
                <Info
                  label="Buyer"
                  value={
                    deal.buyer_id ? (isBuyer ? "You" : "Invited buyer joined") : "Awaiting buyer"
                  }
                />
                <Info
                  label="Seller"
                  value={
                    deal.seller_id
                      ? isSeller
                        ? "You"
                        : "Invited seller joined"
                      : "Awaiting seller"
                  }
                />
                <Info label="Invited email" value={deal.counterparty_email ?? "—"} />
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
                  <h2 className="font-bold">Note for Insight</h2>
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
  return (
    <div className="mt-3 flex items-center justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}
