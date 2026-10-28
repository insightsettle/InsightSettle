import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Trash2 } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteInterest, listInterest } from "@/lib/interest.functions";
import { downloadCsv } from "@/lib/csv";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/console/interest")({
  head: () => ({ meta: [{ title: "Interest register | Insight staff console" },
      { name: "description", content: "Review registrations of interest in Insight in the staff console." },
      { property: "og:title", content: "Interest register | Insight staff console" },
      { property: "og:description", content: "Review registrations of interest in Insight in the staff console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: InterestConsole,
});

function InterestConsole() {
  const { text } = useLocale();
  const qc = useQueryClient();
  const fn = useServerFn(listInterest);
  const del = useServerFn(deleteInterest);
  const q = useQuery({ queryKey: ["interest-register"], queryFn: () => fn() });
  const rows = q.data?.rows ?? [];
  const byRole = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.role]: (m[r.role] ?? 0) + 1 }), {});
  return (
    <div data-no-localize className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{text("Interest register", "سجل الاهتمام")}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${q.data?.enabled ? "bg-success-subtle text-primary" : "bg-warning-subtle text-warning"}`}>{q.data?.enabled ? text("Public form: on", "النموذج العام: مفعّل") : text("Public form: off (feature flag)", "النموذج العام: معطّل (مفتاح الميزة)")}</span>
      </div>
      {q.isError && <p role="alert" className="text-sm text-destructive">{text("The register could not be loaded.", "تعذّر تحميل السجل.")}<Button variant="outline" onClick={() => void q.refetch()}>{text("Try again", "حاول مرة أخرى")}</Button></p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">{text("Entries", "التسجيلات")}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{rows.length}</p></CardContent></Card>
        {Object.entries(byRole).slice(0, 2).map(([r, n]) => <Card key={r}><CardContent className="p-5"><p className="text-xs text-muted-foreground">{r}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{n}</p></CardContent></Card>)}
      </div>
      <Button variant="outline" disabled={!rows.length} onClick={() => downloadCsv("interest-register.csv", rows.map((r) => ({ name: r.full_name, company: r.company ?? "", email: r.email, country: r.country, role: r.role, volume: r.monthly_volume_band ?? "", notice: r.notice_version, consent_at: r.consent_at, created_at: r.created_at })))}><Download className="size-4" />CSV</Button>
      <Card><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{[text("Name", "الاسم"), text("Email", "البريد"), text("Country", "الدولة"), text("Role", "الصفة"), text("Registered", "تاريخ التسجيل"), ""].map((h, i) => <th key={i} className="p-4 text-start font-medium">{h}</th>)}</tr></thead><tbody>
        {rows.map((r) => <tr key={r.id} className="border-t"><td className="p-4">{r.full_name}<p className="text-xs text-muted-foreground">{r.company}</p></td><td className="p-4"><bdi>{r.email}</bdi></td><td className="p-4">{r.country}</td><td className="p-4">{r.role}</td><td className="p-4"><bdi>{new Date(r.created_at).toISOString().slice(0, 10)}</bdi></td><td className="p-4"><Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await del({ data: { id: r.id } }); qc.invalidateQueries({ queryKey: ["interest-register"] }); }}><Trash2 className="size-4" />{text("Delete on request", "حذف بناءً على طلب")}</Button></td></tr>)}
        {!rows.length && <tr><td colSpan={6} className="p-5 text-muted-foreground">{text("No entries.", "لا توجد تسجيلات.")}</td></tr>}
      </tbody></table></CardContent></Card>
    </div>
  );
}
