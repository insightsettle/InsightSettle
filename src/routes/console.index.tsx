import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Wallet, BriefcaseBusiness, Gavel, ShieldCheck, Clock, ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/site/StatusBadge";
import { getStaffOverview, resetDemoData } from "@/lib/staff.functions";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { useLocale } from "@/lib/locale";
import type { DealStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/console/")({
  head: () => ({ meta: [
    { title: "Operations overview | Insight staff console" },
    { name: "description", content: "Insight staff overview of deals, revenue and operational controls." },
    { property: "og:title", content: "Operations overview | Insight staff console" },
    { property: "og:description", content: "Insight staff overview of deals, revenue and operational controls." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminOverview,
});

function AdminOverview() {
  const { text } = useLocale();
  const fetch = useServerFn(getStaffOverview);
  const query = useQuery({ queryKey: ["staff-overview"], queryFn: () => fetch() });
  const live = query.data;
  const [type, setType] = useState("all");
  const qc = useQueryClient();
  const resetFn = useServerFn(resetDemoData);
  const [resetState, setResetState] = useState<"idle" | "confirm" | "running" | "done" | "error">("idle");
  const [resetNote, setResetNote] = useState("");
  async function runReset() {
    setResetState("running"); setResetNote("");
    try {
      const r = await resetFn();
      setResetNote(text(`Demo data reset in ${(r.ms / 1000).toFixed(1)} s: ${r.removed} deals removed; ${r.deals} demo deals, ${r.auctions} auction and ${r.lots} lot loaded.`, `أُعيد ضبط بيانات العرض خلال ${(r.ms / 1000).toFixed(1)} ث: حُذفت ${r.removed} صفقة، وحُمّلت ${r.deals} صفقات تجريبية و${r.auctions} مزاد و${r.lots} قطعة.`));
      setResetState("done");
      await qc.invalidateQueries();
    } catch (e) {
      setResetNote(e instanceof Error ? e.message : text("Reset failed.", "تعذّرت إعادة الضبط."));
      setResetState("error");
    }
  }
  const now = Date.now();
  const open = live?.disputes.filter(d => d.status !== "resolved") ?? [];
  const active = live?.deals.filter(d => !["released", "completed", "refunded", "partially_refunded", "cancelled", "rejected"].includes(d.status)) ?? [];
  const pending = (live?.profiles.filter(p => p.verification_status === "pending").length ?? 0) + (live?.businesses.filter(p => p.verification_status === "pending").length ?? 0);
  const oldest = open.length ? Math.max(...open.map(d => Math.floor((now - new Date(d.created_at).getTime()) / 86400000))) : 0;
  const due = (live?.deals ?? []).filter(d => !d.frozen && d.status === "delivered" && d.auto_release_enabled && d.auto_release_at && new Date(d.auto_release_at).toDateString() === new Date(now).toDateString());
  const delayed = live?.milestones.filter(m => m.status === "submitted" && m.submitted_at && now - new Date(m.submitted_at).getTime() > 7 * 86400000) ?? [];
  const queue = [
    ...open.map(d => ({ key: d.id, icon: Gavel, title: text("Open dispute", "نزاع مفتوح"), detail: `${live?.deals.find(x => x.id === d.deal_id)?.ref ?? ""} · ${text(d.reason.replaceAll("_", " "))}`, priority: text("High", "عالية"), kind: "dispute", ref: "" })),
    ...(pending ? [{ key: "kyc", icon: ShieldCheck, title: text("Pending KYC / KYB", "طلبات تحقق الأفراد والمنشآت"), detail: `${pending} ${text("requests pending", "طلبات قيد الانتظار")}`, priority: text("Normal", "عادية"), kind: "kyc", ref: "" }] : []),
    ...due.map(d => ({ key: d.id, icon: Clock, title: text("Auto-release due today", "إفراج تلقائي مستحق اليوم"), detail: `${d.ref} · ${formatMoney(d.amount, d.currency)}`, priority: text("Today", "اليوم"), kind: "deal", ref: d.ref })),
    ...delayed.map(m => ({ key: m.id, icon: Clock, title: text("Milestone awaiting approval > 7 days", "مرحلة بانتظار الاعتماد لأكثر من ٧ أيام"), detail: m.title, priority: text("High", "عالية"), kind: "deal", ref: live?.deals.find(d => d.id === m.deal_id)?.ref ?? "" })),
  ];
  const checks = [
    ["R1", text("Ledger sums per currency = 0", "مجموع القيود لكل عملة = ٠"), live?.reconciliation.r1],
    ["R2", text("Held = provider total", "المحتجز = إجمالي مزوّد الدفع"), null],
    ["R3", text("Every release has provider confirmation", "كل إفراج له تأكيد من مزوّد الدفع"), live?.reconciliation.r3],
    ["R4", text("Tax invoices = fees collected", "الفواتير الضريبية = الرسوم المحصّلة"), live?.reconciliation.r4],
    ["R5", text("No held balance on closed deals", "لا رصيد محتجز للصفقات المغلقة"), live?.reconciliation.r5],
  ] as const;
  return <div className="mt-6 space-y-6" data-no-localize>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-strong px-5 py-4 text-sm text-primary-foreground">
      <span>{text("Demo environment — the payment provider is simulated and all data is fictional.", "بيئة تجريبية — مزوّد الدفع محاكى وجميع البيانات وهمية.")}</span>
      {resetState === "confirm"
        ? <span className="flex flex-wrap items-center gap-2"><span>{text("Remove every deal and load the demo dataset?", "حذف كل الصفقات وتحميل بيانات العرض؟")}</span><Button size="sm" variant="secondary" onClick={runReset}>{text("Yes, reset", "نعم، أعد الضبط")}</Button><Button size="sm" variant="ghost" className="text-primary-foreground" onClick={() => setResetState("idle")}>{text("Cancel", "إلغاء")}</Button></span>
        : <Button size="sm" variant="secondary" disabled={resetState === "running"} onClick={() => setResetState("confirm")}><RotateCcw className="size-4" />{resetState === "running" ? text("Resetting…", "جارٍ إعادة الضبط…") : text("Reset demo data", "إعادة ضبط بيانات العرض")}</Button>}
    </div>
    {resetNote && <p role={resetState === "error" ? "alert" : "status"} className={resetState === "error" ? "text-sm text-destructive" : "text-sm text-primary"}>{resetNote}</p>}
    <h2 className="text-2xl font-semibold">{text("Operations overview", "نظرة عامة على العمليات")}</h2>
    {query.isError && <p role="alert" className="text-destructive">{text("Could not load staff data.", "تعذر تحميل بيانات الموظفين.")}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { icon: Wallet, title: text("Held with the provider · USD equivalent", "محتجز لدى مزوّد الدفع · معادل الدولار"), value: live?.heldUsd == null ? "—" : formatMoney(live.heldUsd, "USD"), detail: `${live?.fundedCount ?? "—"} ${text("funded deals", "صفقات ممولة")}` },
      { icon: BriefcaseBusiness, title: text("Active deals", "الصفقات النشطة"), value: live ? active.length : "—", detail: text("Across all deal types", "جميع أنواع الصفقات") },
      { icon: Gavel, title: text("Open disputes", "النزاعات المفتوحة"), value: live ? open.length : "—", detail: `${text("Oldest", "الأقدم")}: ${oldest} ${text("days", "أيام")}` },
      { icon: ShieldCheck, title: text("Verification requests pending", "طلبات التحقق المعلقة"), value: live ? pending : "—", detail: text("Personal and business", "أفراد ومنشآت") },
    ].map(k => <Card key={k.title}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><p className="text-xs text-muted-foreground">{k.title}</p><k.icon className="size-5 shrink-0 text-primary" /></div><p className="mt-4 text-2xl font-semibold tabular-nums"><bdi>{k.value}</bdi></p><p className="mt-2 text-xs text-muted-foreground">{k.detail}</p></CardContent></Card>)}</div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card><CardContent className="p-0"><h3 className="border-b px-5 py-4 font-semibold">{text("Work queue", "قائمة العمل")}</h3><div className="divide-y divide-border">{queue.map(q => <div key={q.key} className="flex flex-wrap items-center gap-3 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><q.icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{q.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{q.detail}</p></div><span className="rounded-full bg-warning-subtle px-2 py-1 text-xs text-warning">{q.priority}</span><Button asChild size="sm" variant="outline">{q.kind === "deal" ? <Link to="/console/deals/$dealId" params={{dealId:q.ref}}>{text("Open", "فتح")}<ArrowUpRight /></Link> : q.kind === "kyc" ? <Link to="/console/kyc">{text("Open", "فتح")}<ArrowUpRight /></Link> : <Link to="/console/disputes">{text("Open", "فتح")}<ArrowUpRight /></Link>}</Button></div>)}{!queue.length && <p className="p-5 text-sm text-muted-foreground">{text(live ? "Nothing needs attention" : "Loading…", live ? "لا يوجد إجراء مطلوب" : "جارٍ التحميل…")}</p>}</div></CardContent></Card>
      <Card><CardContent className="p-5"><h3 className="font-semibold">{text("Daily reconciliation", "المطابقة اليومية")}</h3><ul className="mt-4 divide-y divide-border">{checks.map(([code, label, count]) => <li key={code} className="py-3"><div className="flex items-start justify-between gap-2"><span className="text-sm"><bdi className="me-2 text-muted-foreground">{code}</bdi>{label}</span><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${count == null ? "bg-muted text-muted-foreground" : count === 0 ? "bg-success-subtle text-primary" : "bg-warning-subtle text-warning"}`}>{count == null ? text("Unverified", "غير متحقق") : count === 0 ? text("Match", "مطابق") : `${count} ${text("exceptions", "استثناءات")}`}</span></div>{code === "R1" && live?.balances.map(b => <p key={b.currency} className="mt-1 text-xs text-muted-foreground"><bdi>{formatMoney(b.ledger,b.currency)}</bdi></p>)}{code === "R2" && <p className="mt-2 text-xs leading-5 text-muted-foreground">{text("No independent provider statement is available; internal ledger totals cannot verify the provider balance.", "لا يتوفر كشف مستقل من مزوّد الدفع؛ لا تكفي قيود السجل للتحقق من رصيد المزوّد.")}</p>}</li>)}</ul></CardContent></Card>
    </div>
    <Card><CardContent className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><h3 className="font-semibold">{text("Recent deals", "الصفقات الأخيرة")}</h3><select aria-label={text("Deal type", "نوع الصفقة")} value={type} onChange={e => setType(e.target.value)} className="h-9 rounded-lg border border-input bg-card px-3 text-sm">{["all","goods","services","contracting","freelance"].map(t => <option key={t} value={t}>{text(t === "all" ? "All types" : t, ({all:"كل الأنواع", goods:"بضائع",services:"خدمات",contracting:"مقاولات",freelance:"عمل حر"} as Record<string,string>)[t])}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full text-start text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{[["Deal","الصفقة"],["Type","النوع"],["Route","المسار"],["Amount","المبلغ"],["Status","الحالة"]].map(([en,ar]) => <th key={en} className="px-5 py-3 text-start font-medium">{text(en ?? "",ar)}</th>)}</tr></thead><tbody className="divide-y divide-border">{live?.deals.filter(d => type === "all" || d.deal_type === type).sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,15).map(d => <tr key={d.id}><td className="px-5 py-4"><Link to="/console/deals/$dealId" params={{dealId:d.ref}} className="font-medium text-primary">{d.title}</Link><p className="mt-1 text-xs text-muted-foreground"><bdi>{d.ref}</bdi></p></td><td className="px-5 py-4">{text(d.deal_type)}</td><td className="px-5 py-4"><bdi>{text(d.supplier_country ?? "—")} → {text(d.delivery_country ?? "—")}</bdi></td><td className="whitespace-nowrap px-5 py-4 tabular-nums"><bdi>{formatMoney(d.amount,d.currency)}</bdi></td><td className="px-5 py-4"><StatusBadge status={d.status as DealStatus} /></td></tr>)}</tbody></table></div></CardContent></Card>
  </div>;
}
