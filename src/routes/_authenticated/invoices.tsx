import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ReceiptText as Receipt } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { listMyFeeInvoices } from "@/lib/fee-invoice.functions";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { ListSkeleton } from "@/components/motion/Motion";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [
    { title: "Tax invoices | Insight" },
    { name: "description", content: "Your Insight fee tax invoices." },
    { property: "og:title", content: "Insight tax invoices" },
    { property: "og:description", content: "Tax invoices for the Insight service fee." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { text, locale } = useLocale();
  const list = useServerFn(listMyFeeInvoices);
  const q = useQuery({ queryKey: ["my-fee-invoices"], queryFn: () => list() });
  return (
    <SiteShell>
      <div data-no-localize className="reveal mx-auto max-w-4xl px-0 py-4 sm:px-4 sm:py-8">
        <h1 className="text-3xl font-extrabold">{text("Tax invoices", "الفواتير الضريبية")}</h1>
        <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{text("Invoices from Insight for the service fee you paid, at your country's VAT rate. Deal documents such as contracts and the seller's invoices are kept separately under Documents.", "فواتير من إنسايت عن رسوم الخدمة التي دفعتها، بنسبة ضريبة دولتك. أما مستندات الصفقة مثل العقود وفواتير البائع فهي في صفحة المستندات.")}</p>
        {q.isPending && <ListSkeleton label={text("Loading…", "جارٍ التحميل…")} />}
        {q.isError && <div role="alert" className="mt-6 text-destructive">{text("Invoices could not be loaded.", "تعذّر تحميل الفواتير.")} <Button variant="outline" onClick={() => void q.refetch()}>{text("Try again", "حاول مرة أخرى")}</Button></div>}
        {q.data && q.data.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
            <Receipt className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">{text("No tax invoices yet", "لا توجد فواتير ضريبية بعد")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text("An invoice is issued automatically when you pay a deal's fee.", "تصدر الفاتورة تلقائياً عند دفع رسوم الصفقة.")}</p>
          </div>
        )}
        <ul className="mt-6 space-y-3">
          {q.data?.map((i) => (
            <li key={i.number}>
              <Link to="/invoice/$ref" params={{ ref: i.ref }} className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Receipt className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold" dir="ltr">{i.number}</span>
                  <span className="block truncate text-sm text-muted-foreground">{i.ref} · {i.title}</span>
                  <span className="block text-xs text-muted-foreground">{i.kind === "standard" ? text("Tax invoice", "فاتورة ضريبية") : text("Simplified tax invoice", "فاتورة ضريبية مبسطة")} · {new Date(i.issuedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB")} · {text("VAT", "الضريبة")} {Math.round(i.vatRate * 1000) / 10}%</span>
                </span>
                <bdi dir="ltr" className="shrink-0 font-semibold tabular-nums">{formatMoney(i.total, i.currency)}</bdi>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteShell>
  );
}
