import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Circle, Coins, FileCheck2, Handshake, HardHat, Laptop, Lock, Package, Plus, SearchCheck, ShieldCheck, Trash2, Truck, Wrench } from "@/components/icons";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  approveMilestone,
  proposeVariation,
  requestMilestoneRevision,
  submitMilestone,
} from "@/lib/deal-milestones.functions";
import { formatDate } from "@/lib/demo-data";
import { cap, rolesFor } from "@/lib/roles";
import { escrowStep, type DealType } from "@/lib/milestones";
import { formatMoney, minorUnitsFor, roundMoney } from "@/lib/money";
import { CustodyNote, DEMO_CUSTODY_EN } from "@/components/deal/DealPresentation";
import { useLocale } from "@/lib/locale";
import { equalMilestoneAmounts } from "@/lib/milestone-editor";

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
const STEP_ICONS = [Handshake, Lock, Truck, SearchCheck, Coins] as const;

/** The deal's journey: five stations on one road. Done stations fill in, the current one breathes, the road draws itself. */
export function EscrowStepper({ status, termsStatus }: { status: string; termsStatus: string }) {
  const { text } = useLocale();
  const current = escrowStep(status, termsStatus);
  const done = ["released", "completed", "refunded"].includes(status);
  return (
    <Card data-no-localize className="overflow-hidden"><CardContent className="p-4 sm:p-6">
      <ol className="flex items-start" aria-label={text("Deal steps", "خطوات الصفقة")}>
        {STEPS.map((s, i) => {
          const state = done || i < current ? "done" : i === current ? "current" : "next";
          const Icon = STEP_ICONS[i]!;
          const nextDone = done || i + 1 < current;
          return (
            <li key={s[0]} aria-current={state === "current" ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              {i < STEPS.length - 1 && (
                <span aria-hidden className="absolute top-[22px] start-[calc(50%+26px)] end-[calc(-50%+26px)] h-[3px] overflow-hidden rounded-full sm:top-[26px] sm:start-[calc(50%+30px)] sm:end-[calc(-50%+30px)]" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--border) 0 6px, transparent 6px 11px)" }}>
                  {nextDone && <span className="checkout-progress absolute inset-0 rounded-full bg-brand-mint" style={{ ["--dur" as string]: "0.55s", animationDelay: `${150 + i * 180}ms`, animationFillMode: "both" }} />}
                </span>
              )}
              <span className={`relative grid size-11 shrink-0 place-items-center rounded-2xl transition-colors sm:size-[52px] ${state === "done" ? "bg-primary text-primary-foreground shadow-[0_10px_22px_-12px_rgb(19_128_101/0.9)]" : state === "current" ? "bg-accent text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground"}`}
                style={{ animation: `checkout-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 180}ms both` }}>
                {state === "current" && <span className="absolute inset-0 rounded-2xl bg-primary/25 motion-safe:animate-ping [animation-duration:2.2s]" />}
                <Icon className="relative size-5 sm:size-6" weight={state === "done" ? "fill" : "duotone"} />
                {state === "done" && <span className="absolute -bottom-1 -end-1 grid size-4 place-items-center rounded-full bg-brand-mint text-white ring-2 ring-card"><Check className="size-2.5" /></span>}
              </span>
              <span className={`min-w-0 px-0.5 text-[11px] leading-4 sm:text-sm sm:leading-5 ${state === "current" ? "font-bold text-primary" : state === "done" ? "font-medium text-foreground" : "text-muted-foreground"}`}>{text(s[0], s[1])}</span>
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
  const { text } = useLocale();
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${msTone(status)}`}>{text(MS_STATUS[status] ?? status)}</span>;
}

/** Contracting dashboard: progress, value cards, timeline with actions, next action, variation history. */
export function ContractDashboard(props: {
  deal: any; milestones: Milestone[]; isBuyer: boolean; isSeller: boolean; termVersions: any[]; onDone: () => void;
}) {
  const { deal, milestones, isBuyer, isSeller } = props;
  const { text } = useLocale();
  const R = rolesFor(deal.deal_type);
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
    if (deal.status === "pending_funding") return deal.terms_status === "agreed" ? (isBuyer ? ["Pay the contract to start the work.", "ادفع العقد ليبدأ العمل."] : [`Waiting for the ${R.payer.en} to pay the contract.`, `بانتظار دفع ${R.payer.ar} للعقد.`]) : ["Both parties must accept the latest version of the terms.", "يجب أن يوافق الطرفان على آخر نسخة من الشروط."];
    const sub = milestones.find((m) => m.status === "submitted");
    if (sub) return isBuyer ? [`Review milestone ${sub.seq}: approve it, ask for a revision, or open a dispute.`, `راجع المرحلة ${sub.seq}: اعتمدها، أو اطلب تعديلاً، أو افتح نزاعاً.`] : [`Waiting for the ${R.payer.en} to review milestone ${sub.seq}.`, `بانتظار مراجعة ${R.payer.ar} للمرحلة ${sub.seq}.`];
    const work = milestones.find((m) => ["funded", "revision_requested"].includes(m.status));
    if (work) return isSeller ? [`Submit milestone ${work.seq} with evidence when the work is done.`, `سلّم المرحلة ${work.seq} مع ما يثبت إنجازها عند انتهاء العمل.`] : [`The ${R.payee.en} is working on milestone ${work.seq}.`, `${R.payee.ar} يعمل على المرحلة ${work.seq}.`];
    const unfunded = deal.funding_mode === "per_milestone" ? milestones.find((m) => m.status === "pending") : null;
    if (unfunded) return isBuyer ? [`Pay milestone ${unfunded.seq} (${money(Number(unfunded.amount))}) so the ${R.payee.en} can start it.`, `ادفع المرحلة ${unfunded.seq} (${money(Number(unfunded.amount))}) ليبدأها ${R.payee.ar}.`] : [`Waiting for the ${R.payer.en} to pay milestone ${unfunded.seq} (${money(Number(unfunded.amount))}).`, `بانتظار دفع ${R.payer.ar} للمرحلة ${unfunded.seq} (${money(Number(unfunded.amount))}).`];
    if (deal.status === "in_progress" && deal.retention_release_at) return [`Retention is held until ${formatDate(deal.retention_release_at)} (defects period).`, `المحتجز محفوظ حتى ${formatDate(deal.retention_release_at)} (فترة ضمان العيوب).`];
    return null;
  })();

  const variations = props.termVersions.filter((v: any) => v.snapshot?.variation);

  return (
    <section data-no-localize className="space-y-5">
      <div className="space-y-5">
        <div className="flex items-center gap-2"><HardHat className="size-5 text-primary" /><h2 className="font-bold">{deal.deal_type === "contracting" ? text("Contract dashboard", "لوحة العقد") : text("Milestone schedule", "جدول المراحل")}</h2></div>
        {next && <div data-no-localize className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"><b>{text("Next step: ", "الخطوة التالية: ")}</b><span>{text(next[0], next[1])}</span></div>}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>{text('Contract value released', 'قيمة العقد المحوّلة')}</span><span dir="ltr">{pct}%</span></div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="flex h-full"><span className="h-full bg-primary" style={{ width: `${total ? Math.min(100,releasedGross/total*100) : 0}%` }} /><span className="h-full bg-gold" style={{ width: `${total ? Math.max(0,Math.min(100,(funded-releasedGross)/total*100)) : 0}%` }} /></div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-no-localize>
          {[[text("Contract value", "قيمة العقد"), total], [text("Held with the provider", "محفوظة لدى مزوّد الدفع"), funded - releasedGross + retentionHeld], [text(`Released to ${R.payee.en}`, `حُوِّل إلى ${R.payee.ar}`), paidOut], [text("Retention held", "المحتجزات"), retentionHeld]].map(([l,v]) => <Card key={String(l)}><CardContent className="p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{l}</p><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent"><HardHat className="size-4 text-primary" /></span></div><p className="mt-3 break-words text-2xl font-semibold tabular-nums"><bdi>{money(Number(v))}</bdi></p><p className="mt-2 text-xs text-muted-foreground">{text("Defects liability period", "فترة ضمان العيوب")}: {deal.defects_liability_days} {text("days", "أيام")}</p></CardContent></Card>)}
        </div>
        <div data-no-localize className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />{text("Released", "حُوِّل")}: <bdi>{money(releasedGross)}</bdi></span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-gold" />{text("Funded", "ممول")}: <bdi>{money(funded - releasedGross)}</bdi></span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-muted-foreground" />{text("Not funded", "غير ممول")}: <bdi>{money(total-funded)}</bdi></span></div>
        <dl data-no-localize className="grid gap-3 text-sm sm:grid-cols-3">{[[text("Remaining balance", "الرصيد المتبقي"), money(remaining)], [text("Retention released", "المحتجزات المحوّلة"), money(deal.retention_released_at ? milestones.reduce((s, m) => s + Number(m.retention_amount), 0) : 0)], [text("Advance", "الدفعة المقدّمة"), money(milestones.filter(m => m.kind === "advance").reduce((s, m) => s + Number(m.amount), 0))]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums"><bdi>{value}</bdi></dd></div>)}</dl>
        <p className="text-xs text-muted-foreground">
          <span>{text('Retention', 'المحتجزات')}</span> <span dir="ltr">{Number(deal.retention_percent)}%</span> · <span>{text('Defects liability period', 'فترة ضمان العيوب')}</span>{" "}
          <span dir="ltr">{deal.defects_liability_days}</span> <span>{text('days', 'أيام')}</span> · <span>{deal.funding_mode === "per_milestone" ? text("Fund each milestone", "تمويل كل مرحلة") : text("Fund all upfront", "تمويل كامل مقدّماً")}</span>
        </p>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 overflow-hidden"><CardContent className="p-0"><div className="overflow-x-auto"><table className="block w-full text-sm md:table"><thead className="hidden bg-muted text-xs text-muted-foreground md:table-header-group"><tr>{[text("Milestones", "المراحل"), "%", text("Amount", "المبلغ"), text("Retention", "المحتجزات"), text("Status", "الحالة")].map((l) => <th key={l} className="p-4 text-start font-medium">{l}</th>)}</tr></thead><tbody className="block md:table-row-group">
          {milestones.map((m) => (
            <tr key={m.id} className={`grid min-w-0 grid-cols-2 border-t md:table-row ${isBuyer && !deal.frozen && m.status === "submitted" ? "bg-warning-subtle" : ""}`}><td className="col-span-2 block min-w-0 break-words p-4 md:table-cell md:min-w-64">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold"><span dir="ltr">{m.seq}.</span> {m.title} {m.kind === "advance" && <span className="text-xs text-primary">({text("Advance payment", "دفعة مقدّمة")})</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    <span dir="ltr">{money(Number(m.amount))}</span>
                    {m.due_date && <> · <span>{text('Due', 'الموعد')}</span> {formatDate(m.due_date)}</>}
                    {m.status === "submitted" && m.auto_release_at && <> · <span>{text('Auto-release', 'التحويل التلقائي')}</span> {formatDate(m.auto_release_at)}</>}
                  </p>
                </div>
                <MilestoneChip status={m.status} />
              </div>
              <p data-no-localize className="mt-2 text-xs text-muted-foreground">{text("Payment state", "حالة الدفع")}: {m.status === "pending" ? text("Not funded", "غير ممول") : m.status === "released" ? text("Paid out", "تم التحويل") : m.status === "refunded" ? text("Refunded", "مسترد") : text("Funded", "ممول")}</p>
              {m.evidence_required && <p className="mt-2 text-xs text-muted-foreground"><span>{text('Evidence required:', 'الإثبات المطلوب:')}</span> {m.evidence_required}</p>}
              {m.evidence_note && <p className="mt-2 whitespace-pre-line rounded bg-muted/60 p-2 text-xs"><b>{text('Evidence: ', 'الإثبات: ')}</b>{m.evidence_note}</p>}
              {m.revision_note && <p className="mt-2 text-xs text-warning"><b>{text('Revision requested: ', 'التعديل المطلوب: ')}</b>{m.revision_note}</p>}
              {m.status === "released" && (
                <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
                  <span>{text('Retention withheld', 'المحتجز المحفوظ')}</span> {money(Number(m.retention_amount))} · <span>{text('Fee share', 'حصة الرسوم')}</span> {money(Number(m.fee_share))} · <span>{text('VAT', 'الضريبة')}</span> {money(Number(m.vat))} · <span>{text('Net released', 'صافي التحويل')}</span> <b className="text-foreground">{money(Number(m.net_released))}</b>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {isSeller && !deal.frozen && ["funded", "revision_requested"].includes(m.status) && deal.status === "in_progress" && (
                  <Button size="sm" onClick={() => { setOpenId(m.id); setMode("submit"); }}>{text('Submit with evidence', 'تقديم إثبات الإنجاز')}</Button>
                )}
                {isBuyer && !deal.frozen && m.status === "submitted" && (
                  <>
                    <Button size="sm" disabled={act.isPending} onClick={() => act.mutate(() => approveFn({ data: { dealId: deal.id, milestoneId: m.id } }))}>{text('Approve and release', 'اعتماد وتحويل')}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setOpenId(m.id); setMode("revision"); }}>{text('Request revision', 'طلب تعديل')}</Button>
                  </>
                )}
                {(isBuyer || isSeller) && !deal.frozen && ["funded", "submitted", "revision_requested"].includes(m.status) && deal.status === "in_progress" && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setOpenId(m.id); setMode("dispute"); }}>{text('Open a dispute on this milestone', 'فتح نزاع على هذه المرحلة')}</Button>
                )}
              </div>
              {openId === m.id && (
                <div className="mt-3 space-y-2">
                  <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder={mode === "submit" ? text("Describe the completed work and list the photos/files uploaded under Files", "اشرح العمل المنجز واذكر الصور والملفات المرفوعة في ملفات الصفقة") : mode === "revision" ? text("What still needs to change", "ما الذي يحتاج إلى تعديل") : text("Describe the problem (at least 10 characters)", "اشرح المشكلة (10 أحرف على الأقل)")} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={act.isPending || note.trim().length < (mode === "dispute" ? 10 : 3)}
                      onClick={() => act.mutate(() =>
                        mode === "submit" ? submitFn({ data: { dealId: deal.id, milestoneId: m.id, note: note.trim() } })
                          : mode === "revision" ? revisionFn({ data: { dealId: deal.id, milestoneId: m.id, note: note.trim() } })
                            : disputeFn({ data: { dealId: deal.id, milestoneId: m.id, reason: "quality_issue", details: note.trim() } }))}>
                      {mode === "submit" ? text("Submit milestone", "تقديم المرحلة") : mode === "revision" ? text("Send revision request", "إرسال طلب التعديل") : text("Open dispute", "فتح نزاع")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>{text('Cancel', 'إلغاء')}</Button>
                  </div>
                </div>
              )}
            </td><td className="hidden p-4 tabular-nums md:table-cell">{total ? Math.round(Number(m.amount)/total*1000)/10 : 0}%</td><td className="block min-w-0 break-words px-4 pb-4 tabular-nums md:table-cell md:p-4"><bdi>{money(Number(m.amount))}</bdi></td><td className="block min-w-0 break-words px-4 pb-4 tabular-nums md:table-cell md:p-4"><span className="block text-xs text-muted-foreground md:hidden">{text("Retention", "المحتجزات")}</span><bdi>{money(expectedRetention(m))}</bdi>{Number(m.retention_amount) === 0 && Number(deal.retention_percent) > 0 && <span className="block text-xs text-muted-foreground">{text("expected", "متوقع")}</span>}</td><td className="hidden p-4 md:table-cell"><MilestoneChip status={m.status} /></td></tr>
          ))}
        </tbody></table></div></CardContent></Card>
        <aside className="space-y-4">{milestones.filter((m) => isBuyer && !deal.frozen && m.status === "submitted").slice(0,1).map((m) => <Card key={m.id} data-no-localize><CardContent className="p-5"><h3 className="font-semibold">{text(`Approve milestone ${m.seq}`, `اعتماد المرحلة ${m.seq}`)}</h3><dl className="mt-4 space-y-3 text-sm">{[[text("Amount", "المبلغ"), money(Number(m.amount))], [text("Retention", "المحتجزات"), money(expectedRetention(m))], [text("Net released", "صافي التحويل"), Number(m.net_released) > 0 ? money(Number(m.net_released)) : text("Confirmed at release", "يُحدد عند التحويل")]].map(([l,v]) => <div key={l} className="flex justify-between gap-3"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums"><bdi>{v}</bdi></dd></div>)}</dl><p className="mt-4 text-xs text-muted-foreground">{m.evidence_note ?? m.evidence_required}</p><Button className="mt-4 w-full" disabled={act.isPending} onClick={() => act.mutate(() => approveFn({ data: { dealId: deal.id, milestoneId: m.id } }))}>{text("Approve and release", "اعتماد وتحويل")}</Button><Button className="mt-2 w-full" variant="secondary" onClick={() => { setOpenId(m.id); setMode("revision"); }}>{text("Request changes", "طلب تعديلات")}</Button><p className="mt-3 text-xs text-muted-foreground">{text(`Review window: ${deal.inspection_days} days. A revision request pauses auto-release.`, `مهلة المراجعة: ${deal.inspection_days} أيام. طلب التعديل يوقف الإفراج التلقائي.`)}</p></CardContent></Card>)}<CustodyNote /><Card data-no-localize><CardContent className="p-5"><h3 className="font-semibold">{text("Defects liability period", "فترة ضمان العيوب")}</h3><p className="mt-2 text-sm text-muted-foreground">{deal.defects_liability_days} {text("days", "أيام")} · {deal.retention_percent}%</p>{deal.retention_release_at && <p className="mt-2 text-xs text-muted-foreground">{formatDate(deal.retention_release_at)}</p>}</CardContent></Card></aside></div>
        {act.error && <p className="text-sm text-destructive">{(act.error as Error).message}</p>}

        <Card><CardContent className="p-5">
          <h3 className="text-sm font-semibold">{text("Variation history", "سجل أوامر التغيير")}</h3>
          {variations.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">{text('No variations yet.', 'لا توجد أوامر تغيير بعد.')}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs">
              {variations.map((v: any) => (
                <li key={v.id}><span>{text('Variation', 'أمر تغيير')}</span> · <span dir="ltr">v{v.version}</span> · {v.note} · {v.accepted_at ? <span className="text-primary">{text('Accepted', 'مقبول')}</span> : <span className="text-warning">{text('Awaiting acceptance', 'بانتظار الموافقة')}</span>}</li>
              ))}
            </ul>
          )}
          {(isBuyer || isSeller) && !deal.frozen && ["pending_funding", "in_progress"].includes(deal.status) && (
            <VariationForm deal={deal} milestones={milestones} onDone={props.onDone} />
          )}
        </CardContent></Card>
      </div>
    </section>
  );
}

function VariationForm({ deal, milestones, onDone }: { deal: any; milestones: Milestone[]; onDone: () => void }) {
  const { text } = useLocale();
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
      }}>{text('Propose a variation', 'اقتراح أمر تغيير')}</Button>
    );
  return (
    <div className="mt-3 space-y-3 rounded-md border border-border p-4">
      <p className="text-sm font-semibold">{text('Variation', 'أمر تغيير')}</p>
      <MilestoneEditor rows={rows} onChange={setRows} currency={deal.currency} total={Number(deal.amount)} allowAdvance={deal.deal_type === "contracting"} />
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={text("Reason for the variation", "سبب التعديل")} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={m.isPending || note.trim().length < 3} onClick={() => m.mutate()}>{text('Send variation for acceptance', 'إرسال أمر التغيير للموافقة')}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{text('Cancel', 'إلغاء')}</Button>
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
  const { text } = useLocale();
  const fieldId = useId();
  const sum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const diff = roundMoney(total - sum, currency);
  const set = (i: number, patch: Partial<EditableMilestone>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="min-w-0 space-y-4" data-no-localize>
      <Button type="button" variant="secondary" className="h-auto min-h-10 w-full whitespace-normal sm:w-auto" disabled={total <= 0 || rows.some(r => r.locked)} onClick={() => {
        const amounts = equalMilestoneAmounts(total, rows.length, currency);
        onChange(rows.map((r, i) => ({ ...r, amount: amounts[i] ?? "" })));
      }}>{text("Split amount equally", "وزّع المبلغ بالتساوي")}</Button>
      {rows.map((r, i) => (
        <div key={i} data-milestone-card className="min-w-0 rounded-md border border-border bg-card p-4">
          <header className="mb-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <h3 className="min-w-0 font-semibold">{text(`Milestone ${i + 1}`, `المرحلة ${i + 1}`)}</h3>
            <Button type="button" size="icon" variant="ghost" className="shrink-0" title={text("Remove milestone", "حذف المرحلة")} aria-label={text("Remove milestone", "حذف المرحلة")} disabled={r.locked || rows.length <= 2} onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 /></Button>
          </header>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-${i}-title`}>{text("Milestone title", "عنوان المرحلة")}</Label>
              <Input id={`${fieldId}-${i}-title`} className="min-w-0 w-full" aria-describedby={`${fieldId}-${i}-title-hint`} value={r.title} disabled={r.locked} onChange={(e) => set(i, { title: e.target.value })} />
              <p id={`${fieldId}-${i}-title-hint`} className="text-xs text-muted-foreground">{text("e.g. Material supply", "مثال: توريد المواد")}</p>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-${i}-amount`}>{text("Milestone amount", "مبلغ المرحلة")}</Label>
              <div className="relative min-w-0">
                <Input id={`${fieldId}-${i}-amount`} className="min-w-0 w-full pe-16" aria-describedby={`${fieldId}-${i}-amount-hint`} type="number" min={0} step={10 ** -minorUnitsFor(currency)} dir="ltr" value={Number(r.amount) === 0 ? "" : r.amount} disabled={r.locked} onChange={(e) => set(i, { amount: e.target.value })}
                  onBlur={() => { if (r.amount.trim() && Number.isFinite(Number(r.amount))) set(i, { amount: Number(r.amount) === 0 ? "" : Number(r.amount).toFixed(minorUnitsFor(currency)) }); }} />
                <span dir="ltr" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currency}</span>
              </div>
              <p id={`${fieldId}-${i}-amount-hint`} className={`text-xs tabular-nums ${diff === 0 ? "text-primary" : "text-destructive"}`}>{text("Remaining to allocate:", "المتبقي للتوزيع:")} <bdi>{formatMoney(diff, currency)}</bdi></p>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-${i}-due`}>{text("Expected delivery date", "تاريخ التسليم المتوقع")}</Label>
              <Input id={`${fieldId}-${i}-due`} className="block min-w-0 w-full max-w-full appearance-none" aria-describedby={`${fieldId}-${i}-due-hint`} type="date" value={r.dueDate} disabled={r.locked} onChange={(e) => set(i, { dueDate: e.target.value })} />
              <p id={`${fieldId}-${i}-due-hint`} className="text-xs text-muted-foreground">{text("Optional — when this milestone is expected to finish.", "اختياري — الموعد المتوقع لإنجاز هذه المرحلة.")}</p>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-${i}-proof`}>{text("Proof required", "ما يثبت إنجاز المرحلة")}</Label>
              <Input id={`${fieldId}-${i}-proof`} className="min-w-0 w-full" aria-describedby={`${fieldId}-${i}-proof-hint`} value={r.evidenceRequired} disabled={r.locked} onChange={(e) => set(i, { evidenceRequired: e.target.value })} />
              <p id={`${fieldId}-${i}-proof-hint`} className="text-xs text-muted-foreground">{text("Optional — e.g. site photos or acceptance report.", "اختياري — مثال: صور الموقع أو محضر الاستلام.")}</p>
            </div>
          </div>
          {allowAdvance && i === 0 && (
            <label className="mt-4 flex min-w-0 items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 shrink-0" checked={r.kind === "advance"} disabled={r.locked} onChange={(e) => set(i, { kind: e.target.checked ? "advance" : "work" })} />
              <span className="min-w-0">{text('Advance payment to the contractor (up to 20%)', 'دفعة مقدّمة للمقاول (حتى 20%)')}</span>
            </label>
          )}
        </div>
      ))}
      <div data-milestone-allocation className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-card p-3 text-sm sm:static sm:flex sm:justify-between">
        <span role="status" className={`min-w-0 break-words tabular-nums ${diff === 0 ? "text-primary" : "text-destructive"}`}>
          {text('Unallocated:', 'غير موزّع:')} <bdi>{formatMoney(diff, currency)}</bdi>
        </span>
        <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={rows.length >= 20} onClick={() => onChange([...rows, { title: "", amount: "", dueDate: "", evidenceRequired: "", kind: "work" }])}><Plus /> {text("Add milestone", "إضافة مرحلة")}</Button>
      </div>
    </div>
  );
}

/** Goods: preparing → shipped → delivered → inspection countdown. */
export function ShipmentTracker({ deal }: { deal: any }) {
  const { text } = useLocale();
  const stages = ["Preparing", "Shipped", "Delivered", "Inspection"];
  const s = deal.shipping_status;
  const idx = deal.status === "delivered" || deal.status === "under_review" ? 3 : s === "delivered" ? 2 : ["shipped", "in_transit", "out_for_delivery"].includes(s) ? 1 : 0;
  const done = ["released", "completed"].includes(deal.status);
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center gap-2"><Truck className="size-5 text-primary" /><h2 className="font-bold">{text('Shipment tracker', 'متتبع الشحنة')}</h2></div>
      <ol className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        {stages.map((st, i) => (
          <li key={st} className={`rounded-md border p-2 font-semibold ${done || i < idx ? "border-primary/40 bg-primary/10 text-primary" : i === idx ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{text(st)}</li>
        ))}
      </ol>
      <Countdown deal={deal} />
    </CardContent></Card>
  );
}

function Countdown({ deal }: { deal: any }) {
  const { text } = useLocale();
  if (!deal.auto_release_at || deal.status !== "delivered") return null;
  const h = Math.max(0, Math.round((new Date(deal.auto_release_at).getTime() - Date.now()) / 3_600_000));
  return <p className="mt-3 text-sm"><span>{text('Inspection countdown:', 'العد التنازلي للفحص:')}</span> <b dir="ltr">{h}</b> <span>{text('hour(s) left', 'ساعات متبقية')}</span></p>;
}

/** Freelance: deliverables list and revisions used/remaining. */
export function FreelancePanel({ deal, files }: { deal: any; files: { id: string; file_name: string; category: string }[] }) {
  const { text } = useLocale();
  const used = Number(deal.revisions_used ?? 0), inc = Number(deal.revisions_included ?? 0);
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center gap-2"><Laptop className="size-5 text-primary" /><h2 className="font-bold">{text('Deliverables and revisions', 'التسليمات والتعديلات')}</h2></div>
      <p className="mt-2 text-sm"><span>{text('Revisions used', 'التعديلات المستخدمة')}</span> <b dir="ltr">{used} / {inc}</b> · <span>{text('Remaining', 'المتبقي')}</span> <b dir="ltr">{Math.max(0, inc - used)}</b></p>
      <p className="mt-1 text-xs text-muted-foreground">{text('A revision request pauses the timer; a new full inspection period starts after resubmission.', 'طلب التعديل يوقف المؤقت؛ وتبدأ مدة فحص جديدة كاملة بعد إعادة التسليم.')}</p>
      <DeliverableList files={files} />
      <Countdown deal={deal} />
    </CardContent></Card>
  );
}

/** Services: completion evidence and countdown. */
export function ServicesPanel({ deal, files }: { deal: any; files: { id: string; file_name: string; category: string }[] }) {
  const { text } = useLocale();
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center gap-2"><FileCheck2 className="size-5 text-primary" /><h2 className="font-bold">{text('Completion evidence', 'إثبات الإنجاز')}</h2></div>
      <p className="mt-1 text-xs text-muted-foreground">The supplier uploads completion evidence under Files, then confirms completion; the buyer inspection period starts then.</p>
      <DeliverableList files={files} />
      <Countdown deal={deal} />
    </CardContent></Card>
  );
}

function DeliverableList({ files }: { files: { id: string; file_name: string; category: string }[] }) {
  const { text } = useLocale();
  if (!files.length) return <p className="mt-3 text-sm text-muted-foreground">{text('No files uploaded yet.', 'لم تُرفع ملفات بعد.')}</p>;
  return <ul className="mt-3 space-y-1 text-sm">{files.map((f) => <li key={f.id} className="flex items-center gap-2"><FileCheck2 className="size-4 text-primary" /><bdi>{f.file_name}</bdi></li>)}</ul>;
}
