import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAuditLog } from "@/lib/admin.functions";
import { downloadCsv } from "@/lib/csv";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/console/audit")({
  head: () => ({ meta: [
    { title: "Staff history | Insight staff console" },
    { name: "description", content: "Review the Insight staff action history." },
    { property: "og:title", content: "Staff history | Insight staff console" },
    { property: "og:description", content: "Review the Insight staff action history." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AuditPage,
});

function AuditPage() {
  const { text } = useLocale();
  const fetchLog = useServerFn(listAuditLog);
  const log = useQuery({ queryKey: ["audit-log"], queryFn: () => fetchLog() });
  const [term, setTerm] = useState("");
  const rows = (log.data ?? []).filter((r) => {
    const q = term.trim().toLowerCase();
    return !q || [r.actor, r.entity, r.action, r.entityId, r.change].some((v) => v.toLowerCase().includes(q));
  });

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{text("Staff action history", "سجل إجراءات الموظفين")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {text("Every change made by the team, newest first (last 500).")}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={text("Search")} className="ps-9" />
          </div>
          <Button variant="outline" onClick={() => downloadCsv("staff-actions.csv", rows)} disabled={!rows.length}>
            <Download /> {text("Export CSV")}
          </Button>
        </div>
      </div>
      <Card className="mt-5 min-w-0 max-w-full">
        <CardContent className="max-w-full overflow-x-auto p-0">
          {log.isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">{text("Loading…")}</p>
          ) : log.isError ? (
            <p className="p-5 text-sm text-destructive">{text("Could not load the history.")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary text-start text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-start">{text("When")}</th>
                  <th className="p-3 text-start">{text("Who")}</th>
                  <th className="p-3 text-start">{text("What")}</th>
                  <th className="p-3 text-start">{text("Details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap p-3 text-xs" dir="ltr">{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                    <td className="p-3 text-xs" dir="ltr">{r.actor}</td>
                    <td className="p-3 text-xs font-medium">{r.action} · {r.entity} {r.entityId && <span className="text-muted-foreground">{r.entityId.slice(0, 10)}</span>}</td>
                    <td className="max-w-md truncate p-3 font-mono text-[11px] text-muted-foreground" title={r.change} dir="ltr">{r.change}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="p-5 text-muted-foreground">{text("No actions recorded.")}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
