import { useSessionUser } from "@/hooks/use-session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useLocale } from "@/lib/locale";
import { getStaffOverview } from "@/lib/staff.functions";
import { splitDisplay } from "@/lib/staff-display";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/site/StatusBadge";
import type { DealStatus } from "@/lib/demo-data";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  listDisputeCases,
  listInternalNotes,
  resolveDisputeCase,
  staffAction,
} from "@/lib/operations.functions";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Freeze, request documents, internal notes for one deal. */
export function StaffDealActions({ dealId, frozen }: { dealId: string; frozen: boolean }) {
  const { text } = useLocale();
  const qc = useQueryClient();
  const run = useServerFn(staffAction);
  const notesFn = useServerFn(listInternalNotes);
  const notes = useQuery({ queryKey: ["internal-notes", dealId], queryFn: () => notesFn({ data: { dealId } }) });
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const act = useMutation({
    mutationFn: (action: "freeze" | "unfreeze" | "request_documents" | "internal_note") =>
      run({ data: { action, dealId, note: note.trim() } }),
    onSuccess: () => {
      setNote("");
      setMsg("Saved and recorded in the audit log.");
      qc.invalidateQueries();
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "Action failed."),
  });
  const ok = note.trim().length >= 3 && !act.isPending;
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-bold">{text("Staff actions")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{text("Every action needs a reason and is written to the audit log.")}</p>
        <Textarea rows={2} className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder={text("Reason / note")} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={frozen ? "outline" : "destructive"} disabled={!ok} onClick={() => act.mutate(frozen ? "unfreeze" : "freeze")}>
            {text(frozen ? "Unfreeze deal" : "Freeze deal")}
          </Button>
          <Button size="sm" variant="outline" disabled={!ok} onClick={() => act.mutate("request_documents")}>
            {text("Request documents")}
          </Button>
          <Button size="sm" variant="outline" disabled={!ok} onClick={() => act.mutate("internal_note")}>
            {text("Add internal note")}
          </Button>
        </div>
        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
        {(notes.data ?? []).length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {(notes.data ?? []).map((n) => (
              <li key={n.id} className="rounded-md border p-2">
                <p>{n.note}</p>
                <p className="text-xs text-muted-foreground">Internal · {fmt(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Restrict / suspend / reactivate a member. */
export function AccountStateControl({ userId, state }: { userId: string; state?: string | null | undefined }) {
  const { text } = useLocale();
  const qc = useQueryClient();
  const run = useServerFn(staffAction);
  const [next, setNext] = useState<"active" | "restricted" | "suspended">("restricted");
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Account: {state ?? "active"}</span>
      <select value={next} onChange={(e) => setNext(e.target.value as typeof next)} className="h-8 rounded-md border border-input bg-background px-2">
        <option value="active">{text("Active")}</option>
        <option value="restricted">{text("Restricted")}</option>
        <option value="suspended">{text("Suspended")}</option>
      </select>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={text("Reason")} className="h-8 w-40" />
      <Button
        size="sm"
        variant="outline"
        disabled={note.trim().length < 3}
        onClick={async () => {
          await run({ data: { action: "account_state", userId, state: next, note: note.trim() } });
          setNote("");
          qc.invalidateQueries();
        }}
      >
        Apply
      </Button>
    </div>
  );
}

/** Existing decision controls, with read-only case positions and settlement allocation. */
export function LiveDisputes({ auctionOnly = false }: { auctionOnly?: boolean } = {}) {
  const { text } = useLocale();
  const qc = useQueryClient();
  const listFn = useServerFn(listDisputeCases);
  const overviewFn = useServerFn(getStaffOverview);
  const overview = useQuery({ queryKey: ["staff-overview"], queryFn: () => overviewFn() });
  const resolve = useServerFn(resolveDisputeCase);
  const cases = useQuery({ queryKey: ["live-disputes"], queryFn: () => listFn() });
  const [pick, setPick] = useState<Record<string, { outcome: string; pct: string; note: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useSessionUser();
  const me = user?.id;
  return <div className="space-y-5" data-no-localize><h2 className="text-xl font-semibold">{text("Dispute cases", "قضايا النزاعات")}</h2>
    {error && <p role="alert" className="text-sm text-destructive">{text(error)}</p>}
    {cases.isLoading && <p>{text("Loading…", "جارٍ التحميل…")}</p>}
    {cases.isError && <p role="alert" className="text-destructive">{text("Could not load disputes", "تعذر تحميل النزاعات")}</p>}
    {(cases.data ?? []).length === 0 && !cases.isLoading && <Card><CardContent className="p-5 text-sm text-muted-foreground">{text("No live disputes.", "لا توجد نزاعات حالية.")}</CardContent></Card>}
    {(cases.data ?? []).filter((c: any) => !auctionOnly || overview.data?.deals.some(d => d.id === c.deal_id && d.deal_type === 'auction')).map((c: any) => {
      const p = pick[c.id] ?? { outcome: "full_refund", pct: "50", note: "" };
      const deal = overview.data?.deals.find(d => d.id === c.deal_id);
      const milestone = overview.data?.milestones.find(m => m.id === c.milestone_id);
      const held = Number(milestone?.amount ?? deal?.amount ?? c.deals?.amount ?? 0);
      const currency = deal?.currency ?? c.deals?.currency ?? "SAR";
      const buyerPct = c.status === "resolved" ? Number(c.buyer_percent ?? 0) : p.outcome === "full_refund" ? 100 : p.outcome === "full_release" ? 0 : Math.min(100, Math.max(0, Number(p.pct)));
      const split = splitDisplay(held, buyerPct, currency);
      const evidence = overview.data?.evidence.filter(e => e.dispute_id === c.id) ?? [];
      const profileName = (id: string) => overview.data?.profiles.find(x => x.id === id)?.full_name ?? "—";
      return <section key={c.id} className="space-y-4 border-t border-border pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link to="/console/deals/$dealId" params={{ dealId: c.deals?.ref ?? c.deal_id }} className="font-semibold text-primary">{c.deals?.ref} — {c.deals?.title}</Link><p className="mt-1 text-xs text-muted-foreground"><bdi>{c.id}</bdi>{milestone ? ` · ${milestone.title}` : ""}</p></div><StatusBadge status={c.status as DealStatus} /></div>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4"><div className="grid gap-4 md:grid-cols-2">{["buyer","supplier"].map(side => {
            const id = side === "buyer" ? deal?.buyer_id : deal?.seller_id;
            const own = id === c.opened_by;
            const ev = evidence.filter(e => e.uploaded_by === id);
            return <Card key={side}><CardContent className="p-5"><h3 className="font-semibold">{side === "buyer" ? text("Buyer position", "موقف المشتري") : text("Supplier position", "موقف المورد")}</h3><p className="mt-1 text-xs text-muted-foreground">{id ? profileName(id) : "—"}</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">{text("Claim", "الادعاء")}</dt><dd className="mt-1">{own ? c.details : ev.map(e => e.note).filter(Boolean).join(" · ") || text("No separate position recorded", "لم يُسجل موقف مستقل")}</dd></div><div><dt className="text-muted-foreground">{text("Request", "الطلب")}</dt><dd className="mt-1">{own ? text(c.reason.replaceAll("_"," ")) : text("Not separately recorded", "غير مسجل بشكل مستقل")}</dd></div></dl><p className="mb-2 mt-4 text-xs text-muted-foreground">{text("Evidence", "الأدلة")}</p><div className="flex flex-wrap gap-2">{ev.map(e => <span key={e.id} className="max-w-full break-words rounded-full border border-border bg-muted px-3 py-1 text-xs">{e.file_name ?? e.note ?? text("Evidence", "دليل")}</span>)}{!ev.length && <span className="text-xs text-muted-foreground">{text("No evidence uploaded", "لم تُرفق أدلة")}</span>}</div></CardContent></Card>;
          })}</div>
          <Card><CardContent className="p-5"><h3 className="font-semibold">{text("Case timeline", "التسلسل الزمني للقضية")}</h3><ol className="mt-4 space-y-4 border-s border-border ps-4">{[[text("Dispute opened", "فُتح النزاع"), c.created_at], [text("Supplier response deadline", "موعد رد المورد"), c.response_deadline], [text("Evidence deadline", "موعد تقديم الأدلة"),c.evidence_deadline], [text("Review started", "بدء المراجعة"),c.review_started_at], [text("Decision deadline", "موعد القرار"),c.resolution_deadline], [text("Resolved", "حُسم النزاع"),c.resolved_at]].filter(([,date]) => date).map(([label,date]) => <li key={label}><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground"><bdi>{fmt(date)}</bdi></p></li>)}</ol></CardContent></Card>
          </div>
          <Card><CardContent className="p-5"><h3 className="font-semibold">{text("Decision", "القرار")}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{text("Requires a second staff approval (four-eyes)", "يتطلب اعتماد موظف ثانٍ (مبدأ المراجعة المزدوجة)")}</p>{c.status !== "resolved" && c.proposed_by && <div className="mt-3 rounded-lg border border-border bg-warning-subtle p-3 text-xs leading-5"><p className="font-semibold">{text("Proposed decision", "القرار المقترح")}: {text("Buyer", "المشتري")} {Number(c.proposed_buyer_percent)}% · {text("Supplier", "المورد")} {100 - Number(c.proposed_buyer_percent)}%</p><p className="mt-1">{profileName(c.proposed_by)} · <bdi>{fmt(c.proposed_at)}</bdi></p><p className="mt-1">{c.proposed_note}</p>{c.proposed_by === me ? <p className="mt-2 text-warning">{text("Awaiting approval by a second staff member. You can revise it below.", "بانتظار اعتماد موظف ثانٍ. يمكنك تعديله أدناه.")}</p> : <Button size="sm" className="mt-3" disabled={saving} onClick={async()=>{setSaving(true);setError(null);try {await resolve({data:{disputeId:c.id,outcome:c.proposed_outcome,buyerPercent:Number(c.proposed_buyer_percent),note:c.proposed_note}});qc.invalidateQueries();} catch(e) {setError(e instanceof Error ? e.message : "Could not approve the decision.");} finally {setSaving(false);}}}>{text("Approve decision (second staff member)", "اعتماد القرار (موظف ثانٍ)")}</Button>}</div>}
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted" aria-label={text("Settlement split", "تقسيم التسوية")}><div className="bg-info" style={{width:`${buyerPct}%`}} /><div className="bg-primary" style={{width:`${100-buyerPct}%`}} /></div>
          <div className="mt-2 flex justify-between text-xs"><span>{text("Buyer", "المشتري")} {buyerPct}%</span><span>{text("Supplier", "المورد")} {100-buyerPct}%</span></div>
          <dl className="mt-5 space-y-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>{text("Refund to buyer", "استرداد للمشتري")}</dt><dd className="font-semibold tabular-nums"><bdi>{formatMoney(split.refund,currency)}</bdi></dd></div><div className="flex flex-wrap justify-between gap-2"><dt>{text("Release to supplier · gross", "إفراج للمورد · إجمالي")}</dt><dd className="font-semibold tabular-nums"><bdi>{formatMoney(split.release,currency)}</bdi></dd></div></dl><p className="mt-3 text-xs text-muted-foreground">{text("Supplier fees, VAT and any retention are deducted by the existing settlement rules.", "تُخصم رسوم المورد والضريبة وأي احتفاظ وفق قواعد التسوية الحالية.")}</p><p className="mt-4 rounded-lg bg-success-subtle p-3 text-sm text-primary">{text("Total = held amount ✓", "الإجمالي = المبلغ المحتجز ✓")} <bdi className="block pt-1 font-semibold tabular-nums">{formatMoney(split.refund+split.release,currency)}</bdi></p>
          {c.status === "resolved" ? <p className="mt-4 text-sm">{text("Decision reason", "سبب القرار")}: {c.resolution_note}</p> : <div className="mt-5 space-y-3"><select aria-label={text("Decision outcome", "نتيجة القرار")} value={p.outcome} onChange={e => setPick({...pick,[c.id]:{...p,outcome:e.target.value}})} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"><option value="full_refund">{text("Full refund to buyer", "استرداد كامل للمشتري")}</option><option value="full_release">{text("Full release to supplier", "إفراج كامل للمورد")}</option><option value="partial_settlement">{text("Partial settlement", "تسوية جزئية")}</option></select>{p.outcome === "partial_settlement" && <Input type="number" min={0} max={100} aria-label={text("Buyer percent", "نسبة المشتري")} value={p.pct} onChange={e => setPick({...pick,[c.id]:{...p,pct:e.target.value}})} />}<label className="block text-sm">{text("Decision reason (required)", "سبب القرار (مطلوب)")}<Textarea className="mt-2" required value={p.note} onChange={e => setPick({...pick,[c.id]:{...p,note:e.target.value}})} /></label><Button disabled={p.note.trim().length<5 || saving} onClick={async()=>{setSaving(true);setError(null);try {await resolve({data:{disputeId:c.id,outcome:p.outcome,buyerPercent:Number(p.pct),note:p.note.trim()}});qc.invalidateQueries();} catch(e) {setError(e instanceof Error ? e.message : "Could not save the decision.");} finally {setSaving(false);}}}>{text("Propose decision", "اقتراح القرار")}</Button></div>}
          </CardContent></Card>
        </div>
      </section>;
    })}
  </div>;
}
