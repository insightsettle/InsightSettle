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
import { formatMoney, roundMoney } from "@/lib/money";
import { openDisputeCase } from "@/lib/operations.functions";

export const CUSTODY_LINE = "Funds are held by a licensed payment provider. Insight runs the deal rules and keeps the record.";

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
      const { data, error } = await supabase.from("deal_milestones").select("*").eq("deal_id", dealId!).order("seq");
      if (error) throw error;
      return (data ?? []) as unknown as Milestone[];
    },
  });
}

const STEPS = ["Agree", "Fund", "Deliver", "Inspect", "Release"];

export function EscrowStepper({ status, termsStatus }: { status: string; termsStatus: string }) {
  const current = escrowStep(status, termsStatus);
  const done = ["released", "completed", "refunded"].includes(status);
  return (
    <div>
      <ol className="flex items-center gap-1" aria-label="Escrow steps">
        {STEPS.map((s, i) => {
          const state = done || i < current ? "done" : i === current ? "current" : "next";
          return (
            <li key={s} className="flex flex-1 items-center gap-1">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-xs font-semibold ${
                  state === "current" ? "border-primary bg-primary text-primary-foreground" : state === "done" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {state === "done" ? <CheckCircle2 className="size-3.5 shrink-0" /> : <Circle className="size-3.5 shrink-0" />}
                <span className="truncate">{s}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>{CUSTODY_LINE}</span>
      </p>
    </div>
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
  const c = deal.currency;
  const money = (n: number) => formatMoney(n, c);
  const total = Number(deal.amount);
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

  const next = (() => {
    if (deal.status === "pending_funding") return deal.terms_status === "agreed" ? (isBuyer ? "Fund the contract to start work." : "Waiting for the buyer to fund the contract.") : "Both parties must accept the latest terms version.";
    const sub = milestones.find((m) => m.status === "submitted");
    if (sub) return isBuyer ? `Review milestone ${sub.seq}: approve, ask for a revision, or open a dispute.` : `Waiting for the buyer to review milestone ${sub.seq}.`;
    const work = milestones.find((m) => ["funded", "revision_requested"].includes(m.status));
    if (work) return isSeller ? `Submit milestone ${work.seq} with evidence when the work is done.` : `The contractor is working on milestone ${work.seq}.`;
    if (deal.status === "in_progress" && deal.retention_release_at) return `Retention is held until ${formatDate(deal.retention_release_at)} (defects liability period).`;
    return null;
  })();

  const variations = props.termVersions.filter((v: any) => v.snapshot?.variation);

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-2"><HardHat className="size-5 text-primary" /><h2 className="font-bold">Contract dashboard</h2></div>
        {next && <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"><b>Next action: </b><span>{next}</span></div>}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Contract value released</span><span dir="ltr">{pct}%</span></div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[["Contract value", total], ["Funded", funded], ["Released to contractor", paidOut], ["Retention held", retentionHeld], ["Remaining", remaining]].map(([l, v]) => (
            <div key={l as string} className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">{l as string}</p>
              <p className="mt-1 font-bold" dir="ltr">{money(v as number)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          <span>Retention</span> <span dir="ltr">{Number(deal.retention_percent)}%</span> · <span>Defects liability period</span>{" "}
          <span dir="ltr">{deal.defects_liability_days}</span> <span>days</span> · <span>Fund all upfront</span>
        </p>

        <ol className="space-y-3">
          {milestones.map((m) => (
            <li key={m.id} className="rounded-md border border-border p-4">
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
            </li>
          ))}
        </ol>
        {act.error && <p className="text-sm text-destructive">{(act.error as Error).message}</p>}

        <div>
          <h3 className="text-sm font-semibold">Variation history</h3>
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
        </div>
      </CardContent>
    </Card>
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
          <Input aria-label="Amount" type="number" min={0} step="0.001" dir="ltr" value={r.amount} disabled={r.locked} onChange={(e) => set(i, { amount: e.target.value })} />
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
