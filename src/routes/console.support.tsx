import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listSupportRequests, updateSupportRequest } from "@/lib/platform.functions";
import { SUPPORT_STATUSES, SUPPORT_STATUS_LABEL, type SupportStatus } from "@/lib/platform-switches";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/console/support")({
  head: () => ({ meta: [
    { title: "Support inbox | Insight staff console" },
    { name: "description", content: "Customer contact requests with status and assignee." },
    { property: "og:title", content: "Support inbox | Insight" },
    { property: "og:description", content: "Staff support inbox." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SupportPage,
});

type Filter = "open" | "all" | SupportStatus;
type Row = { id: string; email: string; source: string; status: SupportStatus; assignee_id: string | null; staff_note: string; created_at: string; updated_at: string };

function SupportPage() {
  const { text } = useLocale();
  const [filter, setFilter] = useState<Filter>("open");
  const list = useServerFn(listSupportRequests);
  const q = useQuery({ queryKey: ["support-requests", filter], queryFn: () => list({ data: { status: filter } }), refetchInterval: 60_000 });
  const filters: [Filter, string, string][] = [["open", "Open", "المفتوحة"], ["all", "All", "الكل"], ...SUPPORT_STATUSES.map((s) => [s, ...SUPPORT_STATUS_LABEL[s]] as [Filter, string, string])];
  return (
    <div data-no-localize className="mt-6 min-w-0">
      <h2 className="text-2xl font-bold">{text("Support inbox", "صندوق الدعم")}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text("Requests sent from the website contact form. Reply to the customer by email, then update the status here.", "الطلبات المرسلة من نموذج التواصل في الموقع. ردّ على العميل بالبريد ثم حدّث الحالة هنا.")}</p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {filters.map(([key, en, ar]) => <Button key={key} type="button" size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)}>{text(en, ar)}</Button>)}
      </div>
      {q.isPending && <p className="mt-6">{text("Loading…", "جارٍ التحميل…")}</p>}
      {q.isError && <p role="alert" className="mt-6 text-destructive">{(q.error as Error).message}</p>}
      {q.data && q.data.requests.length === 0 && <p className="mt-6 text-muted-foreground">{text("No requests here.", "لا توجد طلبات هنا.")}</p>}
      <div className="mt-5 space-y-4">
        {q.data?.requests.map((r: Row) => <RequestCard key={r.id + r.updated_at} row={r} staff={q.data.staff} />)}
      </div>
    </div>
  );
}

function RequestCard({ row, staff }: { row: Row; staff: { id: string; name: string }[] }) {
  const { text } = useLocale();
  const qc = useQueryClient();
  const save = useServerFn(updateSupportRequest);
  const [status, setStatus] = useState<SupportStatus>(row.status);
  const [assignee, setAssignee] = useState(row.assignee_id ?? "");
  const [note, setNote] = useState(row.staff_note);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => save({ data: { id: row.id, status, assigneeId: assignee || null, note, reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-requests"] }),
  });
  const [en, ar] = SUPPORT_STATUS_LABEL[row.status];
  return (
    <article className="min-w-0 rounded-md border border-border bg-card p-4">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <a href={`mailto:${row.email}`} className="min-w-0 break-all font-medium text-primary underline-offset-4 hover:underline" dir="ltr">{row.email}</a>
        <span className="rounded-full bg-muted px-3 py-1 text-xs">{text(en, ar)}</span>
      </header>
      <p className="mt-1 text-xs text-muted-foreground"><bdi dir="ltr">{new Date(row.created_at).toLocaleString()}</bdi> · {text("Contact form", "نموذج التواصل")}</p>
      <form className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`st-${row.id}`}>{text("Status", "الحالة")}</Label>
          <select id={`st-${row.id}`} value={status} onChange={(e) => setStatus(e.target.value as SupportStatus)} className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm">
            {SUPPORT_STATUSES.map((s) => <option key={s} value={s}>{text(...SUPPORT_STATUS_LABEL[s])}</option>)}
          </select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`as-${row.id}`}>{text("Assigned to", "المسؤول")}</Label>
          <select id={`as-${row.id}`} value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm">
            <option value="">{text("Unassigned", "غير مسند")}</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="min-w-0 space-y-2 sm:col-span-2">
          <Label htmlFor={`nt-${row.id}`}>{text("Staff note", "ملاحظة الموظفين")}</Label>
          <Textarea id={`nt-${row.id}`} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-2 sm:col-span-2">
          <Label htmlFor={`rs-${row.id}`}>{text("Reason (saved in staff history)", "السبب (يُحفظ في سجل الموظفين)")}</Label>
          <Textarea id={`rs-${row.id}`} required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {m.isError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{(m.error as Error).message}</p>}
        <div className="sm:col-span-2"><Button type="submit" disabled={m.isPending || reason.trim().length < 3}>{text("Update", "تحديث")}</Button></div>
      </form>
    </article>
  );
}
