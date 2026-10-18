import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, FileCheck2, HardHat, Laptop, Package, Plus, ShieldCheck, Trash2, Truck, Wrench } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  approveMilestone,
  proposeVariation,
  requestMilestoneRevision,
  submitMilestone,
} from "@/lib/deal-milestones.functions";
import { formatDate } from "@/lib/demo-data";
import { escrowStep, type DealType } from "@/lib/milestones";
import { formatMoney, minorUnitsFor, roundMoney } from "@/lib/money";
import { CustodyNote, DEMO_CUSTODY_EN } from "@/components/deal/DealPresentation";
import { useLocale } from "@/lib/locale";

/** C09-D31: the retention a milestone will withhold, shown from funding (recorded amount once released). */
function retentionFor(m: { amount: unknown; retention_amount: unknown; status: string }, percent: number, currency: string) {
  return Number(m.retention_amount) > 0 || m.status === "released" ? Number(m.retention_amount) : roundMoney(Number(m.amount) * percent / 100, currency);
}
import { openDisputeCase } from "@/lib/operations.functions";

export const CUSTODY_LINE = DEMO_CUSTODY_EN;

export const DEAL_TYPE_META: Record<DealType, { label: string; hint: string; icon: typeof Package }> = {
  goods: { label: "Goods", hint: "Shipping, tracking and inspection on arrival.", icon: Package },
  services: { label: "Services", hint: "Completion evidence; milestones optional.", icon: Wrench },
  contracting: { label: "Contracting & fit-out", hint: "Milestones, advance, retention and defects liability.", icon: HardHat },
  freelance: { label: "Freelance & digital work", hint: "File deliverables with included revisions.", icon: Laptop },
};

export type Milestone = {
  id: string; seq: number; kind: string; title: string; description: string | null; amount: number; due_date: string | null;
  evidence_required: string | null; status: string; submitted_at: string | null; approved_at: string | null; released_at: string | null;
  auto_release_at: string | null; evidence_note: string | null; revision_note: string | null;
  retention_amount: number; fee_share: number; vat: number; net_released: number;
};

export function useMilestones(dealId: string | undefined) {
  return useQuery({
    queryKey: ["deal-milestones", dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_milestones").select("*").eq("deal_id", dealId ?? "").order("seq");
      if (error) throw error;
      return (data ?? []) as unknown as Milestone[];
    },
  });
}

const STEPS: [string, string][] = [["Agreed", "الاتفاق"], ["Paid", "الدفع"], ["Delivered", "التسليم"], ["Inspection", "الفحص"], ["Paid out", "التحويل للمورد"]];

export function EscrowStepper({ status, termsStatus }: { status: string; termsStatus: string }) {
  const { text } = useLocale();
  const current = escrowStep(status, termsStatus);
  const done = ["released", "completed", "refunded"].includes(status);
  return (
    <Card data-no-localize><CardContent className="p-5">
      <ol className="grid grid-cols-5 gap-2 sm:gap-3" aria-label="Escrow steps">
        {STEPS.map((s, i) => {
          const state = done || i < current ? "done" : i === current ? "current" : "next";
          return (
            <li key={s[0]} aria-current={state === "current" ? "step" : undefined} className="flex min-w-0 flex-col gap-2">
              <span aria-hidden="true" className={`h-2 rounded-full ${state === "done" ? "bg-brand-mint" : state === "current" ? "gradient-brand" : "bg-surface"}`} />
              <span className={`flex min-w-0 items-start gap-1 text-xs leading-5 sm:text-sm ${state === "current" ? "font-bold text-primary" : state === "done" ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {state === "done" && <CheckCircle2 className="mt-0.5 hidden size-3.5 shrink-0 text-primary sm:block" />}
                <span className="min-w-0 break-words">{text(s[0], s[1])}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </CardContent></Card>
  );
}

const MS_STATUS: Record<string, string> = {
  pending: "Not funded", funded: "Funded", submitted: "Submitted", revision_requested: "Revision requested",
  disputed: "Disputed", released: "Released", refunded: "Refunded",
};
const msTone = (s: string) =>
  s === "released" ? "border-primary/40 bg-primary/10 text-primary" : s === "disputed" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : s === "submitted" || s === "revision_requested" ? "border-warning/40 bg-warning/10 text-warning" : "border-border bg-muted text-muted-foreground";

export function MilestoneChip({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${msTone(status)}`}>{MS_STATUS[status] ?? status}</span>;
}

/** Contracting dashboard: progress, value cards, timeline with actions, next action, variation history. */
export function ContractDashboard(props: {
  deal: any; milestones: Milestone[]; isBuyer: boolean; isSeller: boolean; termVersions: any[]; onDone: () => void;
}) {
  const { deal, milestones, isBuyer, isSeller } = props;
  const { text } = useLocale();
  const c = deal.currency;
  const money = (n: number) => formatMoney(n, c);
  const total = Number(deal.amount);
  const expectedRetention = (m: any) => retentionFor(m, Number(deal.retention_percent ?? 0), deal.currency);
  const funded = milestones.filter((m) => m.status !== "pending").reduce((s, m) => s + Number(m.amount), 0);
  const releasedGross = milestones.filter((m) => m.status === "released")
    .reduce((s, m) => s + Number(m.net_released) + Number(m.retention_amount) + Number(m.fee_share) + Number(m.vat), 0);
  const retentionHeld = deal.retention_released_at ? 0 : milestones.filter((m) => m.status === "released").reduce((s, m) => s + Number(m.retention_amount), 0);
  const paidOut = milestones.filter((m) => m.status === "released").reduce((s, m) => s + Number(m.net_released), 0)
    + (deal.retention_released_at ? milestones.reduce((s, m) => s + Number(m.retention_amount), 0) : 0);
  const remaining = roundMoney(total - releasedGross, c);
  const pct = total ? Math.round(((releasedGross - retentionHeld) / total) * 1000) / 10 : 0;

  const submitFn = useServerFn(submitMilestone);
  const approveFn = useServerFn(approveMilestone);
  const revisionFn = useServerFn(requestMilestoneRevision);
  const disputeFn = useServerFn(openDisputeCase);
  const act = useMutation({ mutationFn: async (fn: () => Promise<unknown>) => fn(), onSuccess: () => { setNote(""); setOpenId(null); props.onDone(); } });
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"submit" | "revision" | "dispute">("submit");
  const [note, setNote] = useState("");

  const next = ((): [string, string] | null => {
    if (deal.status === "pending_funding") return deal.terms_status === "agreed" ? (isBuyer ? ["Pay the contract to start the work.", "ادفع العقد ليبدأ العمل."] : ["Waiting for the owner to pay the contract.", "بانتظار دفع المالك للعقد."]) : ["Both parties must accept the latest version of the terms.", "يجب أن يوافق الطرفان على آخر نسخة من الشروط."];
    const sub = milestones.find((m) => m.status === "submitted");
    if (sub) return isBuyer ? [`Review milestone ${sub.seq}: approve it, ask for a revision, or open a dispute.`, `راجع المرحلة ${sub.seq}: اعتمدها، أو اطلب تعديلاً، أو افتح نزاعاً.`] : [`Waiting for the owner to review milestone ${sub.seq}.`, `بانتظار مراجعة المالك للمرحلة ${sub.seq}.`];
    const work = milestones.find((m) => ["funded", "revision_requested"].includes(m.status));
    if (work) return isSeller ? [`Submit milestone ${work.seq} with evidence when the work is done.`, `سلّم المرحلة ${work.seq} مع ما يثبت إنجازها عند انتهاء العمل.`] : [`The contractor is working on milestone ${work.seq}.`, `المقاول يعمل على المرحلة ${work.seq}.`];
    const unfunded = deal.funding_mode === "per_milestone" ? milestones.find((m) => m.status === "pending") : null;
    if (unfunded) return isBuyer ? [`Pay milestone ${unfunded.seq} so the contractor can start it.`, `ادفع المرحلة ${unfunded.seq} ليبدأها المقاول.`] : [`Waiting for the owner to pay milestone ${unfunded.seq}.`, `بانتظار دفع المالك للمرحلة ${unfunded.seq}.`];
    if (deal.status === "in_progress" && deal.retention_release_at) return [`Retention is held until ${formatDate(deal.retention_release_at)} (defects period).`, `المحتجز محفوظ حتى ${formatDate(deal.retention_release_at)} (فترة ضمان العيوب).`];
    return null;
  })();

  const variations = props.termVersions.filter((v: any) => v.snapshot?.variation);

  return (
    <section className="space-y-5">
      <div className="space-y-5">
        <div className="flex items-center gap-2"><HardHat className="size-5 text-primary" /><h2 className="font-bold">{text("Contract dashboard", "لوحة العقد")}</h2></div>
        {next && <div data-no-localize className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"><b>{text("Next step: ", "الخطوة التالية: ")}</b><span>{text(next[0], next[1])}</span></div>}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Contract value released</span><span dir="ltr">{pct}%</span></div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="flex h-full"><span className="h-full bg-primary" style={{ width: `${total ? Math.min(100,releasedGross/total*100) : 0}%` }} /><span className="h-full bg-gold" style={{ width: `${total ? Math.max(0,Math.min(100,(funded-releasedGross)/total*100)) : 0}%` }} /></div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-no-localize>
          {[[text("Contract value", "قيمة العقد"), total], [text("Held with the provider", "محفوظة لدى مزوّد الدفع"), funded - releasedGross + retentionHeld], [text("Released to contractor", "حُوِّل للمقاول"), paidOut], [text("Retention held", "المحتجزات"), retentionHeld]].map(([l,v]) => <Card key={String(l)}><CardContent className="p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{l}</p><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent"><HardHat className="size-4 text-primary" /></span></div><p className="mt-3 break-words text-2xl font-semibold tabular-nums"><bdi>{money(Number(v))}</bdi></p><p className="mt-2 text-xs text-muted-foreground">{text("Defects liability period", "فترة ضمان العيوب")}: {deal.defects_liability_days} {text("days", "أيام")}</p></CardContent></Card>)}
        </div>
        <div data-no-localize className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />{text("Released", "حُوِّل")}: <bdi>{money(releasedGross)}</bdi></span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-gold" />{text("Funded", "ممول")}: <bdi>{money(funded - releasedGross)}</bdi></span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-muted-foreground" />{text("Not funded", "غير ممول")}: <bdi>{money(total-funded)}</bdi></span></div>
        <p className="text-xs text-muted-foreground">
          <span>Retention</span> <span dir="ltr">{Number(deal.retention_percent)}%</span> · <span>Defects liability period</span>{" "}
          <span dir="ltr">{deal.defects_liability_days}</span> <span>days</span> · <span>{deal.funding_mode === "per_milestone" ? "Fund each milestone" : "Fund all upfront"}</span>
        </p>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 overflow-hidden"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{[text("Milestones", "المراحل"), "%", text("Amount", "المبلغ"), text("Retention", "المحتجزات"), text("Status", "الحالة")].map((l) => <th key={l} className="p-4 text-start font-medium">{l}</th>)}</tr></thead><tbody>
          {milestones.map((m) => (
            <tr key={m.id} className={`border-t ${isBuyer && m.status === "submitted" ? "bg-warning-subtle" : ""}`}><td className="min-w-64 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold"><span dir="ltr">{m.seq}.</span> {m.title} {m.kind === "advance" && <span className="text-xs text-primary">(Advance payment)</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    <span dir="ltr">{money(Number(m.amount))}</span>
                    {m.due_date && <> · <span>Due</span> {formatDate(m.due_date)}</>}
                    {m.status === "submitted" && m.auto_release_at && <> · <span>Auto-release</span> {formatDate(m.auto_release_at)}</>}
                  </p>
                </div>
                <MilestoneChip status={m.status} />
              </div>
              {m.evidence_required && <p className="mt-2 text-xs text-muted-foreground"><span>Evidence required:</span> {m.evidence_required}</p>}
              {m.evidence_note && <p className="mt-2 whitespace-pre-line rounded bg-muted/60 p-2 text-xs"><b>Evidence: </b>{m.evidence_note}</p>}
              {m.revision_note && <p className="mt-2 text-xs text-warning"><b>Revision requested: </b>{m.revision_note}</p>}
              {m.status === "released" && (
                <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
                  <span>Retention withheld</span> {money(Number(m.retention_amount))} · <span>Fee share</span> {money(Number(m.fee_share))} · <span>VAT</span> {money(Number(m.vat))} · <span>Net released</span> <b className="text-foreground">{money(Number(m.net_released))}</b>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {isSeller && ["funded", "revision_requested"].includes(m.status) && deal.status === "in_progress" && (
                  <Button size="sm" onClick={() => { setOpenId(m.id); setMode("submit"); }}>Submit with evidence</Button>
                )}
                {isBuyer && m.status === "submitted" && (
                  <>
                    <Button size="sm" disabled={act.isPending} onClick={() => act.mutate(() => approveFn({ data: { dealId: deal.id, milestoneId: m.id } }))}>Approve and release</Button>
                    <Button size="sm" variant="outline" onClick={() => { setOpenId(m.id); setMode("revision"); }}>Request revision</Button>
                  </>
                )}
                {(isBuyer || isSeller) && ["funded", "submitted", "revision_requested"].includes(m.status) && deal.status === "in_progress" && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setOpenId(m.id); setMode("dispute"); }}>Open a dispute on this milestone</Button>
                )}
              </div>
              {openId === m.id && (
                <div className="mt-3 space-y-2">
                  <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder={mode === "submit" ? "Describe the completed work and list the photos/files uploaded under Files" : mode === "revision" ? "What still needs to change" : "Describe the problem (at least 10 characters)"} />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={act.isPending || note.trim().length < (mode === "dispute" ? 10 : 3)}
                      onClick={() => act.mutate(() =>
                        mode === "submit" ? submitFn({ data: { dealId: deal.id, milestoneId: m.id, note: note.trim() } })
                          : mode === "revision" ? revisionFn({ data: { dealId: deal.id, milestoneId: m.id, note: note.trim() } })
                            : disputeFn({ data: { dealId: deal.id, milestoneId: m.id, reason: "quality_issue", details: note.trim() } }))}>
                      {mode === "submit" ? "Submit milestone" : mode === "revision" ? "Send revision request" : "Open dispute"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </td><td className="p-4 tabular-nums">{total ? Math.round(Number(m.amount)/total*1000)/10 : 0}%</td><td className="whitespace-nowrap p-4 tabular-nums"><bdi>{money(Number(m.amount))}</bdi></td><td className="whitespace-nowrap p-4 tabular-nums"><bdi>{money(expectedRetention(m))}</bdi>{Number(m.retention_amount) === 0 && Number(deal.retention_percent) > 0 && <span className="block text-xs text-muted-foreground">{text("expected", "متوقع")}</span>}</td><td className="p-4"><MilestoneChip status={m.status} /></td></tr>
          ))}
        </tbody></table></div></CardContent></Card>
        <aside className="space-y-4">{milestones.filter((m) => isBuyer && m.status === "submitted").slice(0,1).map((m) => <Card key={m.id} data-no-localize><CardContent className="p-5"><h3 className="font-semibold">{text(`Approve milestone ${m.seq}`, `اعتماد المرحلة ${m.seq}`)}</h3><dl className="mt-4 space-y-3 text-sm">{[[text("Amount", "المبلغ"), money(Number(m.amount))], [text("Retention", "المحتجزات"), money(expectedRetention(m))], [text("Net released", "صافي التحويل"), Number(m.net_released) > 0 ? money(Number(m.net_released)) : text("Confirmed at release", "يُحدد عند التحويل")]].map(([l,v]) => <div key={l} className="flex justify-between gap-3"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums"><bdi>{v}</bdi></dd></div>)}</dl><p className="mt-4 text-xs text-muted-foreground">{m.evidence_note ?? m.evidence_required}</p><Button className="mt-4 w-full" disabled={act.isPending} onClick={() => act.mutate(() => approveFn({ data: { dealId: deal.id, milestoneId: m.id } }))}>{text("Approve and release", "اعتماد وتحويل")}</Button><Button className="mt-2 w-full" variant="secondary" onClick={() => { setOpenId(m.id); setMode("revision"); }}>{text("Request changes", "طلب تعديلات")}</Button><p className="mt-3 text-xs text-muted-foreground">{text("Review window: 7 days. A revision request pauses auto-release.", "مهلة المراجعة: 7 أيام. طلب التعديل يوقف الإفراج التلقائي.")}</p></CardContent></Card>)}<CustodyNote /><Card data-no-localize><CardContent className="p-5"><h3 className="font-semibold">{text("Defects liability period", "فترة ضمان العيوب")}</h3><p className="mt-2 text-sm text-muted-foreground">{deal.defects_liability_days} {text("days", "أيام")} · {deal.retention_percent}%</p>{deal.retention_release_at && <p className="mt-2 text-xs text-muted-foreground">{formatDate(deal.retention_release_at)}</p>}</CardContent></Card></aside></div>
        {act.error && <p className="text-sm text-destructive">{(act.error as Error).message}</p>}

        <Card><CardContent className="p-5">
          <h3 className="text-sm font-semibold">{text("Variation history", "سجل أوامر التغيير")}</h3>
          {variations.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">No variations yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs">
              {variations.map((v: any) => (
                <li key={v.id}><span>Variation</span> · <span dir="ltr">v{v.version}</span> · {v.note} · {v.accepted_at ? <span className="text-primary">Accepted</span> : <span className="text-warning">Awaiting acceptance</span>}</li>
              ))}
            </ul>
          )}
          {(isBuyer || isSeller) && ["pending_funding", "in_progress"].includes(deal.status) && (
            <VariationForm deal={deal} milestones={milestones} onDone={props.onDone} />
          )}
        </CardContent></Card>
      </div>
    </section>
  );
}

function VariationForm({ deal, milestones, onDone }: { deal: any; milestones: Milestone[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<EditableMilestone[]>([]);
  const [note, setNote] = useState("");
  const fn = useServerFn(proposeVariation);
  const m = useMutation({ mutationFn: () => fn({ data: { dealId: deal.id, note: note.trim(), milestones: rows.map(toInput) } }), onSuccess: () => { setOpen(false); onDone(); } });
  if (!open)
    return (
      <Button size="sm" variant="outline" className="mt-3" onClick={() => {
        setRows(milestones.map((x) => ({ id: x.id, title: x.title, amount: String(x.amount), dueDate: x.due_date ?? "", evidenceRequired: x.evidence_required ?? "", kind: x.kind as "advance" | "work", locked: !["pending", "funded"].includes(x.status) })));
        setOpen(true);
      }}>Propose a variation</Button>
    );
  return (
    <div className="mt-3 space-y-3 rounded-md border border-border p-4">
      <p className="text-sm font-semibold">Variation</p>
      <MilestoneEditor rows={rows} onChange={setRows} currency={deal.currency} total={Number(deal.amount)} allowAdvance={deal.deal_type === "contracting"} />
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for the variation" />
      <div className="flex gap-2">
        <Button size="sm" disabled={m.isPending || note.trim().length < 3} onClick={() => m.mutate()}>Send variation for acceptance</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      {m.error && <p className="text-sm text-destructive">{(m.error as Error).message}</p>}
    </div>
  );
}

export type EditableMilestone = { id?: string; title: string; amount: string; dueDate: string; evidenceRequired: string; kind: "advance" | "work"; locked?: boolean };
export const toInput = (r: EditableMilestone) => ({
  ...(r.id ? { id: r.id } : {}), title: r.title.trim(), amount: Number(r.amount), dueDate: r.dueDate || null,
  evidenceRequired: r.evidenceRequired.trim() || null, kind: r.kind,
});

export function MilestoneEditor({ rows, onChange, currency, total, allowAdvance }: {
  rows: EditableMilestone[]; onChange: (r: EditableMilestone[]) => void; currency: string; total: number; allowAdvance: boolean;
}) {
  const sum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const diff = roundMoney(total - sum, currency);
  const set = (i: number, patch: Partial<EditableMilestone>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <Input aria-label="Milestone title" placeholder="Milestone title" value={r.title} disabled={r.locked} onChange={(e) => set(i, { title: e.target.value })} />
          <div className="min-w-0">
            <Input aria-label="Amount" type="number" min={0} step={10 ** -minorUnitsFor(currency)} dir="ltr" value={r.amount} disabled={r.locked} onChange={(e) => set(i, { amount: e.target.value })}
              onBlur={() => { if (r.amount.trim() && Number.isFinite(Number(r.amount))) set(i, { amount: Number(r.amount).toFixed(minorUnitsFor(currency)) }); }} />
            {r.amount.trim() && Number.isFinite(Number(r.amount)) && <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{formatMoney(Number(r.amount), currency)}</p>}
          </div>
          <Input aria-label="Due date" type="date" value={r.dueDate} disabled={r.locked} onChange={(e) => set(i, { dueDate: e.target.value })} />
          <Button type="button" size="icon" variant="ghost" aria-label="Remove milestone" disabled={r.locked || rows.length <= 2} onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 /></Button>
          <Input className="sm:col-span-3" aria-label="Evidence required" placeholder="Evidence required (e.g. site photos, inspection sign-off)" value={r.evidenceRequired} disabled={r.locked} onChange={(e) => set(i, { evidenceRequired: e.target.value })} />
          {allowAdvance && i === 0 && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={r.kind === "advance"} disabled={r.locked} onChange={(e) => set(i, { kind: e.target.checked ? "advance" : "work" })} />
              <span>Advance payment (mobilisation, up to 20%)</span>
            </label>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Button type="button" size="sm" variant="outline" disabled={rows.length >= 20} onClick={() => onChange([...rows, { title: "", amount: "", dueDate: "", evidenceRequired: "", kind: "work" }])}><Plus /> Add milestone</Button>
        <span className={diff === 0 ? "text-primary" : "text-destructive"}>
          {diff === 0 ? <span>Milestones match the deal amount</span> : <><span>Difference to the deal amount:</span> <span dir="ltr">{formatMoney(diff, currency)}</span></>}
        </span>
      </div>
    </div>
  );
}

/** Goods: preparing → shipped → delivered → inspection countdown. */
export function ShipmentTracker({ deal }: { deal: any }) {
  const stages = ["Preparing", "Shipped", "Delivered", "Inspection"];
  const s = deal.shipping_status;
  const idx = deal.status === "delivered" || deal.status === "under_review" ? 3 : s === "delivered" ? 2 : ["shipped", "in_transit", "out_for_delivery"].includes(s) ? 1 : 0;
  const done = ["released", "completed"].includes(deal.status);
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center gap-2"><Truck className="size-5 text-primary" /><h2 className="font-bold">Shipment tracker</h2></div>
      <ol className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        {stages.map((st, i) => (
          <li key={st} className={`rounded-md border p-2 font-semibold ${done || i < idx ? "border-primary/40 bg-primary/10 text-primary" : i === idx ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{st}</li>
        ))}
      </ol>
      <Countdown deal={deal} />
    </CardContent></Card>
  );
}

function Countdown({ deal }: { deal: any }) {
  if (!deal.auto_release_at || deal.status !== "delivered") return null;
  const h = Math.max(0, Math.round((new Date(deal.auto_release_at).getTime() - Date.now()) / 3_600_000));
  return <p className="mt-3 text-sm"><span>Inspection countdown:</span> <b dir="ltr">{h}</b> <span>hour(s) left</span></p>;
}

/** Freelance: deliverables list and revisions used/remaining. */
export function FreelancePanel({ deal, files }: { deal: any; files: { id: string; file_name: string; category: string }[] }) {
  const used = Number(deal.revisions_used ?? 0), inc = Number(deal.revisions_included ?? 0);
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center gap-2"><Laptop className="size-5 text-primary" /><h2 className="font-bold">Deliverables and revisions</h2></div>
      <p className="mt-2 text-sm"><span>Revisions used</span> <b dir="ltr">{used} / {inc}</b> · <span>Remaining</span> <b dir="ltr">{Math.max(0, inc - used)}</b></p>
      <p className="mt-1 text-xs text-muted-foreground">A revision request pauses the timer; a new full inspection period starts after resubmission.</p>
      <DeliverableList files={files} />
      <Countdown deal={deal} />
    </CardContent></Card>
  );
}

/** Services: completion evidence and countdown. */
export function ServicesPanel({ deal, files }: { deal: any; files: { id: string; file_name: string; category: string }[] }) {
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center gap-2"><FileCheck2 className="size-5 text-primary" /><h2 className="font-bold">Completion evidence</h2></div>
      <p className="mt-1 text-xs text-muted-foreground">The supplier uploads completion evidence under Files, then confirms completion; the buyer inspection period starts then.</p>
      <DeliverableList files={files} />
      <Countdown deal={deal} />
    </CardContent></Card>
  );
}

function DeliverableList({ files }: { files: { id: string; file_name: string; category: string }[] }) {
  if (!files.length) return <p className="mt-3 text-sm text-muted-foreground">No files uploaded yet.</p>;
  return <ul className="mt-3 space-y-1 text-sm">{files.map((f) => <li key={f.id} className="flex items-center gap-2"><FileCheck2 className="size-4 text-primary" /><bdi>{f.file_name}</bdi></li>)}</ul>;
}
