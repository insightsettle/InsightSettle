import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, FileText, History, Lock, Paperclip, Receipt, Scale, XCircle } from "@/components/icons";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  addDisputeEvidence,
  dealFileUrl,
  getOpenDispute,
  getTaxInvoices,
  listAttachments,
  listTermVersions,
  uploadDealFile,
} from "@/lib/deal-actions";
import type { DealRow } from "@/lib/deals";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { cancelDeal, openDisputeCase } from "@/lib/operations.functions";
import { auctionDisputeOptions } from '@/lib/auction-console-display';

const reasonLabels: Record<string, string> = {
  not_received: "Item not received",
  wrong_item: "Wrong item",
  damaged: "Damaged item",
  quantity_mismatch: "Quantity mismatch",
  quality_issue: "Quality issue",
  late_delivery: "Late delivery",
  other: "Other",
};

const outcomeLabels: Record<string, [string, string]> = {
  full_release: ["Full payout to the payee", "تحويل كامل المبلغ للمستفيد"],
  full_refund: ["Full refund to the payer", "استرداد كامل المبلغ للدافع"],
  partial_settlement: ["Partial settlement", "تسوية جزئية"],
};

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function useRefresh(deal: DealRow) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries();
    void deal;
  };
}

export function FrozenBanner({ deal }: { deal: DealRow }) {
  if (!deal.frozen) return null;
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex gap-3 p-5">
        <Lock className="size-5 text-destructive" />
        <div>
          <p className="font-semibold">Insight has put this deal on hold</p>
          <p className="mt-1 text-sm text-muted-foreground">{deal.frozen_reason ?? "Under review."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DisputePanel({ deal, isParty }: { deal: DealRow & { deal_type?: string }; isParty: boolean }) {
  const { text } = useLocale();
  const refresh = useRefresh(deal);
  const open = useServerFn(openDisputeCase);
  const [reason, setReason] = useState("not_received");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dispute = useQuery({ queryKey: ["dispute", deal.id], queryFn: () => getOpenDispute(deal.id) });

  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      setDetails("");
      setNote("");
      setFile(null);
      setError(null);
      refresh();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Something went wrong."),
  });

  const d = dispute.data;
  const canOpen = isParty && ["held", "delivered", "under_review"].includes(deal.status) && !deal.frozen;

  if (d && (d.status !== "resolved" || deal.status === "disputed")) {
    return (
      <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 text-destructive" />
          <p className="font-semibold">{text("Dispute: ", "نزاع: ")}{text(reasonLabels[d.reason] ?? d.reason)}</p>
        </div>
        <p className="mt-1 text-muted-foreground">{d.details}</p>
        <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
          <span>{text("Response by: ", "الرد قبل: ")}{fmt(d.response_deadline)}</span>
          <span>{text("Evidence by: ", "الإثباتات قبل: ")}{fmt(d.evidence_deadline)}</span>
          <span>{text("Decision by: ", "القرار قبل: ")}{fmt(d.resolution_deadline)}</span>
        </div>
        {d.status !== "resolved" && isParty && (
          <div className="mt-3 space-y-2">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={text("Add your response or evidence note", "أضف ردك أو ملاحظة الإثبات")} />
            <input type="file" accept="image/*,video/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full min-w-0 text-xs" />
            <Button
              size="sm"
              variant="outline"
              disabled={(!note.trim() && !file) || act.isPending}
              onClick={() => act.mutate(() => addDisputeEvidence(deal.id, d.id, note.trim(), file))}
            >
              {text("Submit evidence", "إرسال الإثبات")}
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-destructive">{error}</p>}
      </div>
    );
  }

  if (d?.status === "resolved" && d.outcome) {
    return (
      <div className="mt-4 rounded-md border p-4 text-sm">
        <p className="font-semibold">
          {text("Dispute decision: ", "قرار النزاع: ")}{outcomeLabels[d.outcome] ? text(outcomeLabels[d.outcome]?.[0] ?? d.outcome, outcomeLabels[d.outcome]?.[1] ?? d.outcome) : d.outcome}
          {d.outcome === "partial_settlement" && text(` (payer ${d.buyer_percent}%)`, ` (الدافع ${d.buyer_percent}%)`)}
        </p>
        <p className="mt-1 text-muted-foreground">{d.resolution_note}</p>
      </div>
    );
  }

  if (!canOpen) return null;
  return (
    <div className="mt-4 rounded-md border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-center gap-2">
        <Scale className="size-4 text-warning" />
        <p className="text-sm font-semibold">{text("Open a dispute", "فتح نزاع")}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {text("The funds are frozen immediately. The other party has 48 hours to respond and both sides have 72 hours to add evidence.", "يُجمَّد المبلغ فوراً. لدى الطرف الآخر 48 ساعة للرد، ولدى الطرفين 72 ساعة لإضافة الإثباتات.")}
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {Object.entries(reasonLabels).filter(([key]) => deal.deal_type !== 'auction' || key !== 'quality_issue').map(([k, v]) => (
          <option key={k} value={k}>
            {text(v)}
          </option>
        ))}
        {auctionDisputeOptions(deal.deal_type ?? '').map(o => <option key={o.value} value={o.value}>{text(o.en,o.ar)}</option>)}
      </select>
      <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="mt-2" placeholder={text("Explain the problem in detail", "اشرح المشكلة بالتفصيل")} />
      <Button
        variant="outline"
        className="mt-3"
        disabled={details.trim().length < 10 || act.isPending}
        onClick={() => act.mutate(() => open({ data: { dealId: deal.id, reason, details: details.trim() } }))}
      >
        {text("Open a dispute", "فتح نزاع")}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function CancelPanel({ deal, isParty }: { deal: DealRow; isParty: boolean }) {
  const refresh = useRefresh(deal);
  const cancel = useServerFn(cancelDeal);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const shipped = !!deal.shipped_at || ["shipped", "in_transit", "out_for_delivery", "delivered"].includes(deal.shipping_status ?? "");
  if (!isParty || !["pending_funding", "held"].includes(deal.status) || shipped) return null;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <XCircle className="size-5 text-muted-foreground" />
          <h2 className="font-bold">Cancel this deal</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {deal.status === "pending_funding"
            ? "Before the payment is secured the deal can be cancelled right away. Any payment already made is refunded in full."
            : "The funds are secured but nothing has shipped. Insight applies the agreed cancellation terms."}
        </p>
        {deal.cancellation_conditions && <p className="mt-2 text-sm">Agreed terms: {deal.cancellation_conditions}</p>}
        <Textarea rows={2} className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancelling" />
        <Button
          variant="outline"
          className="mt-3"
          disabled={reason.trim().length < 3}
          onClick={async () => {
            try {
              const r = await cancel({ data: { dealId: deal.id, reason: reason.trim() } });
              setMsg(r.status === "cancelled" ? "The deal was cancelled." : "Cancellation request sent to Insight.");
              setReason("");
              refresh();
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Could not cancel.");
            }
          }}
        >
          {deal.status === "pending_funding" ? "Cancel deal" : "Request cancellation"}
        </Button>
        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}

const fileCategories = [
  ["contract", "Contract"],
  ["invoice", "Invoice"],
  ["product_image", "Product image"],
  ["specification", "Product specification"],
  ["shipping_document", "Shipping document"],
  ["other", "Other document"],
] as const;

export function AttachmentsCard({ deal, isParty }: { deal: DealRow; isParty: boolean }) {
  const qc = useQueryClient();
  const files = useQuery({ queryKey: ["deal-files", deal.id], queryFn: () => listAttachments(deal.id) });
  const [category, setCategory] = useState("contract");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Paperclip className="size-5 text-primary" />
          <h2 className="font-bold">Deal files</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(files.data ?? []).map((f) => (
            <li key={f.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <button
                type="button"
                className="min-w-0 break-all text-start text-primary hover:underline"
                onClick={async () => window.open(await dealFileUrl(f.file_path), "_blank")}
              >
                <FileText className="me-1 inline size-4" />
                {f.file_name}
              </button>
              <span className="text-xs text-muted-foreground">
                {fileCategories.find((c) => c[0] === f.category)?.[1] ?? f.category.replace(/_/g, " ")}
              </span>
            </li>
          ))}
          {files.data?.length === 0 && <li className="text-muted-foreground">No files yet.</li>}
        </ul>
        {isParty && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              {fileCategories.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="file"
              disabled={busy}
              className="w-full min-w-0 text-xs"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                setError(null);
                try {
                  await uploadDealFile(deal.id, f, category);
                  qc.invalidateQueries({ queryKey: ["deal-files", deal.id] });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload failed.");
                } finally {
                  setBusy(false);
                  e.target.value = "";
                }
              }}
            />
          </div>
        )}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function TermVersionsCard({ deal }: { deal: DealRow }) {
  const { text } = useLocale();
  const versions = useQuery({ queryKey: ["deal-terms", deal.id, deal.terms_version], queryFn: () => listTermVersions(deal.id) });
  if (!versions.data?.length) return null;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <History className="size-5 text-primary" />
          <h2 className="font-bold">{text("Terms history", "سجل الشروط")}</h2>
        </div>
        <ol className="mt-3 space-y-3 text-sm">
          {versions.data.map((v) => {
            const s = v.snapshot as Record<string, any>;
            return (
              <li key={v.id} className="rounded-md border p-3">
                <p className="font-semibold">
                  {text("Version", "النسخة")} {v.version}
                  {v.version === deal.terms_version && text(" · current", " · الحالية")}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <bdi>{formatMoney(Number(s["amount"]), s["currency"] ?? deal.currency)}</bdi> · {text("Qty", "الكمية")} {s["quantity"] ?? 1} · {text("Inspection", "الفحص")} {text(`${s["inspection_days"]} days`, `${s["inspection_days"]} أيام`)}
                  {s["due_at"] ? text(` · due ${s["due_at"]}`, ` · التسليم قبل ${s["due_at"]}`) : ""}
                </p>
                {v.note && <p className="mt-1 text-xs">{v.note}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{fmt(v.created_at)}</p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

export function InvoiceCard({ deal }: { deal: DealRow }) {
  const { text } = useLocale();
  const inv = useQuery({ queryKey: ["invoice", deal.id, deal.status], queryFn: () => getTaxInvoices(deal.id), refetchInterval: 20_000 });
  if (!inv.data?.length) return null;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Receipt className="size-5 text-primary" />
          <h2 className="font-bold">{inv.data.length > 1 ? text("Insight fee invoices", "فواتير رسوم إنسايت") : text("Insight fee invoice", "فاتورة رسوم إنسايت")}</h2>
        </div>
        {inv.data.map((i) => (
          <p key={i.invoice_number} className="mt-2 text-sm">
            <bdi>{i.invoice_number}</bdi> · {text("Fee", "الرسوم")} <bdi>{formatMoney(Number(i.fee), i.currency)}</bdi> + {Number(i.vat_rate) === 0 ? text("No VAT", "لا توجد ضريبة") : <>{text("VAT", "الضريبة")} <bdi>{(Number(i.vat_rate) * 100).toFixed(0)}%</bdi></>} <bdi>{formatMoney(Number(i.vat), i.currency)}</bdi> = <b><bdi>{formatMoney(Number(i.total), i.currency)}</bdi></b>
          </p>
        ))}
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href={`/invoice/${deal.ref}`} target="_blank" rel="noreferrer">
            {text("Open printable invoice", "فتح الفاتورة للطباعة")}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
