import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getReportData } from "@/lib/admin.functions";
import { downloadCsv } from "@/lib/csv";
import { formatSAR } from "@/lib/demo-data";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/console/reports")({
  head: () => ({ meta: [
    { title: "Finance reports | Insight staff console" },
    { name: "description", content: "Review Insight operational and financial reports." },
    { property: "og:title", content: "Finance reports | Insight staff console" },
    { property: "og:description", content: "Review Insight operational and financial reports." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { text } = useLocale();
  const fetchData = useServerFn(getReportData);
  const report = useQuery({ queryKey: ["console-report"], queryFn: () => fetchData() });
  const deals = report.data?.deals ?? [];
  const revenue = report.data?.revenue ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <Card>
        <CardContent className="p-5">
          <h2 className="text-lg font-bold">{text("Deals report", "تقرير الصفقات")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {text("All deals with parties, amount, status and dates.", "كل الصفقات مع أطرافها ومبالغها وحالاتها وتواريخها.")}
          </p>
          <p className="mt-4 text-3xl font-extrabold">{report.isLoading ? "…" : deals.length}</p>
          <Button className="mt-4" disabled={!deals.length} onClick={() => downloadCsv(`deals-${today}.csv`, deals)}>
            <Download /> {text("Export CSV")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <h2 className="text-lg font-bold">{text("Revenue report", "تقرير الإيرادات")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {text("Completed payments and platform fees by month.", "الدفعات المكتملة ورسوم المنصة حسب الشهر.")}
          </p>
          <p className="mt-4 text-3xl font-extrabold">
            {formatSAR(revenue.reduce((a, r) => a + r.fees, 0))}
          </p>
          <Button className="mt-4" disabled={!revenue.length} onClick={() => downloadCsv(`revenue-${today}.csv`, revenue)}>
            <Download /> {text("Export CSV")}
          </Button>
        </CardContent>
      </Card>
      <Card className="min-w-0 md:col-span-2">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-start">{text("Month", "الشهر")}</th>
                <th className="p-3 text-start">{text("Payment volume", "حجم الدفعات")}</th>
                <th className="p-3 text-start">{text("Platform fees", "رسوم المنصة")}</th>
                <th className="p-3 text-start">{text("Transactions", "المعاملات")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revenue.map((r) => (
                <tr key={r.month}>
                  <td className="p-3" dir="ltr">{r.month}</td>
                  <td className="p-3">{formatSAR(r.volume)}</td>
                  <td className="p-3 font-semibold">{formatSAR(r.fees)}</td>
                  <td className="p-3">{r.count}</td>
                </tr>
              ))}
              {revenue.length === 0 && (
                <tr><td colSpan={4} className="p-5 text-muted-foreground">
                  {report.isError ? text("Could not load the report.", "تعذّر تحميل التقرير.") : text("No completed payments yet.", "لا توجد دفعات مكتملة بعد.")}
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
