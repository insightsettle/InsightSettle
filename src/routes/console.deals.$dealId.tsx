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
import { computeFee, usePlatformSettings } from "@/lib/platform-settings";

export const Route = createFileRoute("/console/deals/$dealId")({
  component: StaffDealPage,
});

const statusOptions = Object.keys(statusLabels) as DealStatus[];

function StaffDealPage() {
  const { dealId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchDeal = useServerFn(getDealForStaff);
  const changeStatus = useServerFn(setDealStatus);
  const changeFee = useServerFn(setFeeOverride);
  const sendMessage = useServerFn(postStaffMessage);
  const { settings } = usePlatformSettings();

  const detail = useQuery({
    queryKey: ["staff-deal", dealId],
    queryFn: () => fetchDeal({ data: { ref: dealId } }),
  });

  const [nextStatus, setNextStatus] = useState<DealStatus>("held");
  const [reason, setReason] = useState("");
  const [percent, setPercent] = useState("");
  const [flat, setFlat] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [message, setMessage] = useState("");
  const [settleRef, setSettleRef] = useState<Record<string, string>>({});
  const [settleReason, setSettleReason] = useState<Record<string, string>>({});

  const dealUuid = detail.data?.deal.id ?? null;
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
    queryFn: () => loadTransactions({ data: { dealId: dealUuid! } }),
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
      changeStatus({ data: vars }),
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
    return <p className="mt-10 text-sm text-muted-foreground">Loading deal…</p>;
  }
  if (!detail.data) {
    return (
      <div className="mt-10">
        <p className="text-sm text-muted-foreground">This deal reference does not exist.</p>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/console/deals">
            <ArrowLeft /> Back to all deals
          </Link>
        </Button>
      </div>
    );
  }

  const { deal, events, messages } = detail.data;
  const baseFee = computeFee(deal.amount, settings.fees).fee;
  const effectiveFee =
    deal.feeOverrideFlat !== null
      ? deal.feeOverrideFlat
      : deal.feeOverridePercent !== null
        ? (deal.amount * deal.feeOverridePercent) / 100
        : baseFee;

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

      <div className="mt-5">
        <StaffDealActions dealId={deal.id} frozen={!!deal.frozen} />
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.3fr_.9fr]">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold">Change deal status</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                The reason is written into the deal log and is visible to both parties.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setNextStatus(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      nextStatus === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is the status changing?"
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
                {statusMutation.isPending ? "Saving…" : `Set status to ${statusLabels[nextStatus]}`}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Percent className="size-5 text-primary" />
                <h3 className="font-bold">Special fee offer</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Standard fee for this amount is {formatSAR(baseFee)}. Set a percentage or a fixed
                amount for high-value deals.
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
                  Fixed fee (SAR)
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
                placeholder="Note shown to the client (optional)"
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
              <p className="mt-3 text-sm">
                Fee charged to this deal:{" "}
                <b>
                  {formatSAR(effectiveFee)}
                  {effectiveFee !== baseFee ? " (special offer active)" : ""}
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
                <h3 className="font-bold">Payment records</h3>
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Input
                        className="max-w-sm"
                        value={noteText[t.id] ?? ""}
                        onChange={(e) => setNoteText((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        placeholder="Internal reconciliation note"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={noteMutation.isPending || (noteText[t.id] ?? "").trim().length < 2}
                        onClick={() => noteMutation.mutate({ transactionId: t.id, note: noteText[t.id]!.trim() })}
                      >
                        Add note
                      </Button>
                    </div>
                    {simulated && t.kind === "funding" && (t.status === "pending" || t.status === "processing") && (
                      <div className="mt-3 space-y-2 rounded-md border border-dashed border-warning/50 p-3">
                        <p className="text-xs font-semibold text-warning">Testing tool — simulated provider</p>
                        <Input
                          value={settleReason[t.id] ?? ""}
                          onChange={(e) =>
                            setSettleReason((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                          placeholder="Decline reason code, e.g. CARD_DECLINED"
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
                              reason: `Simulated provider decline: ${settleReason[t.id]!.trim()}`,
                            })
                          }
                        >
                          Simulate provider decline
                        </Button>
                      </div>
                    )}
                    {!simulated && (t.status === "pending" || t.status === "processing") && (
                      <p className="mt-2 text-xs text-muted-foreground">Waiting for the payment provider.</p>
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
                <h3 className="font-bold">Conversation</h3>
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
                  <p className="text-sm text-muted-foreground">No messages on this deal yet.</p>
                )}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Reply as Insight support"
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
              <p className="text-sm text-muted-foreground">Deal value</p>
              <p className="mt-1 text-3xl font-extrabold">
                {deal.currency} {deal.amount.toLocaleString("en-GB")}
              </p>
              <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
                <Row label="Created" value={formatDate(deal.createdAt)} />
                <Row label="Due" value={deal.dueAt ? formatDate(deal.dueAt) : "—"} />
                <Row label="Standard fee" value={formatSAR(baseFee)} />
                <Row label="Fee charged" value={formatSAR(effectiveFee)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <h3 className="font-bold">Parties</h3>
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
                <p className="font-semibold">Dispute reason</p>
                <p className="mt-1 text-sm text-muted-foreground">{deal.disputedReason}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold">Activity log</h3>
              <ol className="mt-5 space-y-5 border-l border-border pl-5">
                {events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-card bg-primary" />
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.createdAt)}
                      {e.actorName ? ` · ${e.actorName}` : ""}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </li>
                ))}
                {events.length === 0 && (
                  <li className="text-sm text-muted-foreground">No activity recorded.</li>
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
  return (
    <div className="mt-3 flex items-start justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-all text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}
