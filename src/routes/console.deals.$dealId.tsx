import { StaffDealActions } from "@/components/site/StaffOps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageSquare, Percent, Receipt, Send, Users } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getDealForStaff,
  postStaffMessage,
  setDealStatus,
  setFeeOverride,
} from "@/lib/admin.functions";
import { formatDate, formatSAR, statusLabels, type DealStatus } from "@/lib/demo-data";
import {
  addReconciliationNote,
  getPaymentProviderStatus,
  listDealTransactionsForStaff,
  settleTransaction,
} from "@/lib/payments.functions";
import { getDealPricing } from "@/lib/fx-quotes.functions";
import { formatMoney } from "@/lib/money";
import { useLocale } from "@/lib/locale";
import { staffAction } from "@/lib/operations.functions";
import { getStaffOverview } from "@/lib/staff.functions";
import { submitStaffStatus } from "@/lib/staff-display";

export const Route = createFileRoute("/console/deals/$dealId")({
  head: () => ({ meta: [
    { title: "Deal operations | Insight staff console" },
    { name: "description", content: "Review and manage a deal in the Insight staff console." },
    { property: "og:title", content: "Deal operations | Insight staff console" },
    { property: "og:description", content: "Review and manage a deal in the Insight staff console." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: StaffDealPage,
});

const statusOptions = Object.keys(statusLabels) as DealStatus[];

function StaffDealPage() {
  const { dealId } = Route.useParams();
  const { text } = useLocale();
  const cancelStaff = useServerFn(staffAction);
  const overviewFn = useServerFn(getStaffOverview);
  const overview = useQuery({ queryKey: ["staff-overview"], queryFn: () => overviewFn() });
  const queryClient = useQueryClient();
  const fetchDeal = useServerFn(getDealForStaff);
  const changeStatus = useServerFn(setDealStatus);
  const changeFee = useServerFn(setFeeOverride);
  const sendMessage = useServerFn(postStaffMessage);

  const detail = useQuery({
    queryKey: ["staff-deal", dealId],
    queryFn: () => fetchDeal({ data: { ref: dealId } }),
  });

  const [pickedStatus, setNextStatus] = useState<DealStatus | null>(null);
  const [reason, setReason] = useState("");
  const [percent, setPercent] = useState("");
  const [flat, setFlat] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [message, setMessage] = useState("");
  const [settleRef, setSettleRef] = useState<Record<string, string>>({});
  const [settleReason, setSettleReason] = useState<Record<string, string>>({});

  const dealUuid = detail.data?.deal.id ?? null;
  const pricingFn = useServerFn(getDealPricing);
  const pricing = useQuery({
    queryKey: ["staff-deal-pricing", dealUuid, detail.data?.deal.status],
    queryFn: () => pricingFn({ data: { dealId: dealUuid ?? "" } }),
    enabled: !!dealUuid,
  });
  const loadTransactions = useServerFn(listDealTransactionsForStaff);
  const settle = useServerFn(settleTransaction);
  const addNote = useServerFn(addReconciliationNote);
  const providerStatus = useQuery({ queryKey: ["payment-provider"], queryFn: () => getPaymentProviderStatus() });
  const simulated = providerStatus.data ? !providerStatus.data.connected : true;
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const noteMutation = useMutation({
    mutationFn: (vars: { transactionId: string; note: string }) => addNote({ data: vars }),
    onSuccess: () => {
      setNoteText({});
      refresh();
    },
  });
  const transactions = useQuery({
    queryKey: ["staff-deal-transactions", dealUuid],
    queryFn: () => loadTransactions({ data: { dealId: dealUuid ?? "" } }),
    enabled: !!dealUuid,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-deal", dealId] });
    queryClient.invalidateQueries({ queryKey: ["staff-deal-transactions", dealUuid] });
  };

  const settleMutation = useMutation({
    mutationFn: (vars: {
      transactionId: string;
      outcome: "succeeded" | "failed";
      providerRef: string | null;
      reason: string | null;
    }) => settle({ data: vars }),
    onSuccess: () => {
      setSettleRef({});
      setSettleReason({});
      refresh();
      queryClient.invalidateQueries({ queryKey: ["all-deals"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { dealId: string; status: DealStatus; reason: string }) =>
      submitStaffStatus(vars, cancelStaff, changeStatus),
    onSuccess: () => {
      setReason("");
      refresh();
      queryClient.invalidateQueries({ queryKey: ["all-deals"] });
    },
  });
  const feeMutation = useMutation({
    mutationFn: (vars: {
      dealId: string;
      percent: number | null;
      flat: number | null;
      note: string | null;
    }) => changeFee({ data: vars }),
    onSuccess: refresh,
  });
  const messageMutation = useMutation({
    mutationFn: (vars: { dealId: string; body: string }) => sendMessage({ data: vars }),
    onSuccess: () => {
      setMessage("");
      refresh();
    },
  });

  if (detail.isLoading) {
    return <p className="mt-10 text-sm text-muted-foreground">{text("Loading deal…")}</p>;
  }
  if (!detail.data) {
    return (
      <div className="mt-10">
        <p className="text-sm text-muted-foreground">{text("This deal reference does not exist.")}</p>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/console/deals">
            <ArrowLeft /> Back to all deals
          </Link>
        </Button>
      </div>
    );
  }

  const { deal, events, messages } = detail.data;
  // Highlight the real current status until staff pick a different one.
  const nextStatus = (pickedStatus ?? deal.status) as DealStatus;
  const money = (n: number, c: string = deal.currency) => formatMoney(n, c);
  const fb = pricing.data?.breakdown ?? null;
  const effectiveFee = fb?.fee ?? 0;
  const raw = overview.data?.deals.find(d => d.id === dealUuid);
  const milestones = overview.data?.milestones.filter(m => m.deal_id === dealUuid).sort((a,b) => a.seq-b.seq) ?? [];
  const hasOverride = deal.feeOverrideFlat !== null || deal.feeOverridePercent !== null;

  return (
    <div className="mt-6">
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/console/deals">
          <ArrowLeft /> Back to all deals
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">{deal.ref}</p>
          <h2 className="mt-1 text-2xl font-extrabold">{deal.title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {deal.description || "No description was added."}
          </p>
        </div>
        <StatusBadge status={deal.status as DealStatus} className="px-4 py-2" />
      </div>

      {raw?.deal_type === "contracting" && <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card><CardContent className="p-0"><h3 className="border-b px-5 py-4 font-semibold">{text("Milestones", "المراحل")}</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted text-muted-foreground"><tr>{[["Name","الاسم"],["%","٪"],["Amount","المبلغ"],["Retention","الاحتفاظ"],["Status","الحالة"]].map(([en,ar]) => <th key={en} className="px-4 py-3 text-start font-medium">{text(en ?? "",ar)}</th>)}</tr></thead><tbody className="divide-y divide-border">{milestones.map(m => <tr key={m.id}><td className="px-4 py-3">{m.title}</td><td className="px-4 py-3 tabular-nums"><bdi>{deal.amount > 0 ? (m.amount/deal.amount*100).toFixed(1) : "0"}%</bdi></td><td className="whitespace-nowrap px-4 py-3 tabular-nums"><bdi>{money(m.amount)}</bdi></td><td className="whitespace-nowrap px-4 py-3 tabular-nums"><bdi>{money(m.retention_amount)}</bdi></td><td className="px-4 py-3"><StatusBadge status={m.status as DealStatus} /></td></tr>)}</tbody></table></div></CardContent></Card>
        <Card><CardContent className="p-5"><h3 className="font-semibold">{text("Retention & defects liability", "الاحتفاظ وضمان العيوب")}</h3><Row label={text("Retention", "الاحتفاظ")} value={`${raw.retention_percent}%`} /><Row label={text("Held retention", "مبلغ الاحتفاظ")} value={money(milestones.reduce((sum,m) => sum + Number(m.retention_amount),0))} /><Row label={text("Defects liability period", "مدة ضمان العيوب")} value={`${raw.defects_liability_days} ${text("days", "أيام")}`} /><Row label={text("Handover", "التسليم النهائي")} value={raw.handover_at ? formatDate(raw.handover_at) : "—"} /><Row label={text("Retention release", "إفراج الاحتفاظ")} value={raw.retention_released_at ? formatDate(raw.retention_released_at) : raw.retention_release_at ? formatDate(raw.retention_release_at) : "—"} /></CardContent></Card>
      </div>}
      <div className="mt-5">
        <StaffDealActions dealId={deal.id} frozen={!!deal.frozen} />
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.3fr_.9fr]">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold">{text("Change deal status", "تغيير حالة الصفقة")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                The reason is written into the deal log and is visible to both parties.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {statusOptions.map((s) => (
                  <Button variant="outline" size="sm"
                    key={s}
                    onClick={() => setNextStatus(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      nextStatus === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {text(statusLabels[s])}
                  </Button>
                ))}
              </div>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={text("Why is the status changing?", "سبب تغيير الحالة")} required
                className="mt-3"
                rows={3}
              />
              <Button
                className="mt-3"
                disabled={reason.trim().length < 3 || statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    dealId: deal.id,
                    status: nextStatus,
                    reason: reason.trim(),
                  })
                }
              >
                {statusMutation.isPending ? text("Saving…", "جارٍ الحفظ…") : `${text("Set status to", "تعيين الحالة إلى")} ${text(statusLabels[nextStatus])}`}
              </Button>
            {statusMutation.isError && <p role="alert" className="mt-2 text-sm text-destructive">{text(statusMutation.error.message)}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Percent className="size-5 text-primary" />
                <h3 className="font-bold">{text("Special fee offer")}</h3>
              </div>
              <p key={`fee-${effectiveFee}`} className="mt-1 text-sm text-muted-foreground">
                {text("Fee for this deal", "رسوم هذه الصفقة")}: <bdi>{money(effectiveFee)}</bdi>. {text("Set a percentage or a fixed amount for high-value deals.", "حدد نسبة أو مبلغاً ثابتاً للصفقات الكبيرة.")}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Fee percentage
                  <Input
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    placeholder={String(deal.feeOverridePercent ?? "")}
                    inputMode="decimal"
                    className="mt-1"
                  />
                </label>
                <label className="text-sm">
                  Fixed fee (deal currency)
                  <Input
                    value={flat}
                    onChange={(e) => setFlat(e.target.value)}
                    placeholder={String(deal.feeOverrideFlat ?? "")}
                    inputMode="decimal"
                    className="mt-1"
                  />
                </label>
              </div>
              <Input
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                placeholder={text("Note shown to the client (optional)")}
                className="mt-3"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    feeMutation.mutate({
                      dealId: deal.id,
                      percent: percent.trim() ? Number(percent) : null,
                      flat: flat.trim() ? Number(flat) : null,
                      note: offerNote.trim() || null,
                    })
                  }
                  disabled={feeMutation.isPending || (!percent.trim() && !flat.trim())}
                >
                  Apply offer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPercent("");
                    setFlat("");
                    setOfferNote("");
                    feeMutation.mutate({
                      dealId: deal.id,
                      percent: null,
                      flat: null,
                      note: null,
                    });
                  }}
                >
                  Remove offer
                </Button>
              </div>
              <p key={`charged-${effectiveFee}`} className="mt-3 text-sm">
                {text("Fee charged to this deal", "الرسوم المحصلة لهذه الصفقة")}:{" "}
                <b>
                  {money(effectiveFee)}
                  {hasOverride ? " (special offer active)" : ""}
                </b>
              </p>
              {deal.feeOverrideNote && (
                <p className="mt-1 text-xs text-muted-foreground">Note: {deal.feeOverrideNote}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                <h3 className="font-bold">{text("Payment records")}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {simulated
                  ? "In this demo the payment provider is simulated and confirms each money step automatically. Staff can view provider status and add internal reconciliation notes."
                  : "Payment provider status for every money movement. The outcome and reason are shown to both parties."}
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
                      {formatDate(t.created_at)} · {t.provider}
                      {t.provider_ref ? ` · ${t.provider_ref}` : ""}
                    </p>
                    {t.error_message && (
                      <p className="mt-2 text-sm text-destructive">{t.error_message}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Input
                        className="max-w-sm"
                        value={noteText[t.id] ?? ""}
                        onChange={(e) => setNoteText((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        placeholder={text("Internal reconciliation note")}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={noteMutation.isPending || (noteText[t.id] ?? "").trim().length < 2}
                        onClick={() => noteMutation.mutate({ transactionId: t.id, note: (noteText[t.id] ?? "").trim() })}
                      >
                        Add note
                      </Button>
                    </div>
                    {simulated && t.kind === "funding" && (t.status === "pending" || t.status === "processing") && (
                      <div className="mt-3 space-y-2 rounded-md border border-dashed border-warning/50 p-3">
                        <p className="text-xs font-semibold text-warning">{text("Testing tool — simulated provider")}</p>
                        <Input
                          value={settleReason[t.id] ?? ""}
                          onChange={(e) =>
                            setSettleReason((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                          placeholder={text("Decline reason code, e.g. CARD_DECLINED")}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={settleMutation.isPending || !(settleReason[t.id] ?? "").trim()}
                          onClick={() =>
                            settleMutation.mutate({
                              transactionId: t.id,
                              outcome: "failed",
                              providerRef: null,
                              reason: `Simulated provider decline: ${(settleReason[t.id] ?? "").trim()}`,
                            })
                          }
                        >
                          Simulate provider decline
                        </Button>
                      </div>
                    )}
                    {!simulated && (t.status === "pending" || t.status === "processing") && (
                      <p className="mt-2 text-xs text-muted-foreground">{text("Waiting for the payment provider.")}</p>
                    )}
                  </div>
                ))}
                {(transactions.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No payments recorded for this deal yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                <h3 className="font-bold">{text("Conversation")}</h3>
              </div>
              <div className="mt-4 space-y-3">
                {messages.length ? (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-md p-4 ${m.authorKind === "staff" ? "bg-primary/10" : "bg-muted"}`}
                    >
                      <div className="flex justify-between gap-3 text-xs">
                        <b>{m.authorName}</b>
                        <span className="text-muted-foreground">{formatDate(m.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm">{m.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{text("No messages on this deal yet.")}</p>
                )}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={text("Reply as Insight support")}
                className="mt-4"
                rows={3}
              />
              <Button
                className="mt-3"
                disabled={!message.trim() || messageMutation.isPending}
                onClick={() => messageMutation.mutate({ dealId: deal.id, body: message.trim() })}
              >
                <Send /> Send as Insight support
              </Button>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{text("Deal value")}</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">
                <bdi dir="ltr">{money(deal.amount)}</bdi>
              </p>
              <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
                <Row label="Created" value={formatDate(deal.createdAt)} />
                <Row label="Due" value={deal.dueAt ? formatDate(deal.dueAt) : "—"} />
                {fb && <Row label="Fee charged" value={money(fb.fee)} />}
                {fb && (
                  <>
                    <Row label="Buyer share + VAT" value={`${money(fb.buyerShare)} + ${money(fb.buyerVat)} (${Math.round(fb.buyerVatRate * 100)}%)`} />
                    <Row label="Supplier share + VAT" value={`${money(fb.sellerShare)} + ${money(fb.sellerVat)} (${Math.round(fb.sellerVatRate * 100)}%)`} />
                    <Row label="Buyer funds" value={money(fb.buyerTotal)} />
                    <Row label="Supplier receives" value={money(fb.supplierNet)} />
                    {pricing.data && (
                      <Row label={pricing.data.locked ? "Pricing" : "Pricing (live preview)"} value={pricing.data.locked ? "Locked by funding quote" : "Not funded yet"} />
                    )}
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <h3 className="font-bold">{text("Parties")}</h3>
              </div>
              <Row label="Created by" value={deal.createdByName ?? deal.createdByEmail ?? "—"} />
              <Row label="Buyer" value={deal.buyerName ?? deal.buyerEmail ?? "Not joined"} />
              <Row label="Buyer email" value={deal.buyerEmail ?? "—"} />
              <Row label="Seller" value={deal.sellerName ?? deal.sellerEmail ?? "Not joined"} />
              <Row label="Seller email" value={deal.sellerEmail ?? "—"} />
              <Row label="Invited email" value={deal.counterpartyEmail ?? "—"} />
            </CardContent>
          </Card>

          {deal.disputedReason && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-5">
                <p className="font-semibold">{text("Dispute reason")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{deal.disputedReason}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold">{text("Activity log")}</h3>
              <ol className="mt-5 space-y-5 border-s border-border ps-5">
                {events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute start-[-1.6rem] top-1 size-3 rounded-full border-2 border-card bg-primary" />
                    <p className="text-sm font-medium">{text(e.title)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.createdAt)}
                      {e.actorName ? ` · ${e.actorName}` : ""}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </li>
                ))}
                {events.length === 0 && (
                  <li className="text-sm text-muted-foreground">{text("No activity recorded.")}</li>
                )}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { text } = useLocale();
  return (
    <div className="mt-3 flex items-start justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{text(label)}</dt>
      <dd className="break-all text-end text-sm font-semibold">{value}</dd>
    </div>
  );
}
