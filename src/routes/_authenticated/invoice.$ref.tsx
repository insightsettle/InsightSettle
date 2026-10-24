import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { countryLabel, zatcaTlv, type FeeInvoice } from "@/lib/fee-invoice";
import { getFeeInvoices, type FeeInvoiceView } from "@/lib/fee-invoice.functions";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/invoice/$ref")({
  head: () => ({
    meta: [
      { title: "Fee invoice | Insight" },
      { name: "description", content: "Bilingual tax invoice for the Insight service fee." },
      { property: "og:title", content: "Insight fee invoice" },
      { property: "og:description", content: "Tax invoice for the Insight service fee only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoicePage,
});

/** Seller details are placeholders until Insight is VAT-registered (demo). */
const SELLER = { ar: "إنسايت", en: "Insight", vat: "3XXXXXXXXXXXXX3", cr: "—", site: "insightsettle.com" };

function Bi({ ar, en, className = "" }: { ar: React.ReactNode; en: React.ReactNode; className?: string }) {
  return (
    <span className={`grid gap-0.5 ${className}`}>
      <span dir="rtl" className="text-end">{ar}</span>
      <span dir="ltr" className="text-start text-[0.82em] text-muted-foreground">{en}</span>
    </span>
  );
}

function Row({ ar, en, value, strong = false }: { ar: string; en: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-2.5 last:border-b-0 ${strong ? "font-bold" : ""}`}>
      <Bi ar={ar} en={en} />
      <bdi dir="ltr" className="tabular-nums">{value}</bdi>
    </div>
  );
}

function InvoiceSheet({ inv, view }: { inv: FeeInvoice; view: FeeInvoiceView }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    const payload = zatcaTlv([SELLER.en, SELLER.vat, new Date(inv.issuedAt).toISOString(), inv.total.toFixed(2), inv.vat.toFixed(2)]);
    QRCode.toDataURL(payload, { margin: 1, width: 200 }).then(setQr).catch(() => setQr(null));
  }, [inv]);
  const milestone = inv.milestoneId ? view.milestones.find((m) => m.id === inv.milestoneId) : null;
  const [countryEn, countryAr] = countryLabel(inv.billTo.country);
  const rate = `${(inv.vatRate * 100).toFixed(inv.vatRate * 100 % 1 ? 1 : 0)}%`;
  const issued = new Date(inv.issuedAt);
  const title = inv.kind === "standard" ? { ar: "فاتورة ضريبية", en: "Tax invoice" } : { ar: "فاتورة ضريبية مبسطة", en: "Simplified tax invoice" };
  const payerRole = inv.party === "buyer" ? { ar: "الطرف الدافع", en: "Paying party" } : { ar: "الطرف المستلم", en: "Receiving party" };

  return (
    <article className="relative break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div className="pointer-events-none absolute inset-0 grid place-items-center print:flex" aria-hidden="true">
        <span className="rotate-[-24deg] select-none text-5xl font-extrabold text-muted-foreground/10 sm:text-7xl">DEMO · نموذج تجريبي</span>
      </div>
      <header className="flex flex-wrap items-center justify-between gap-4 bg-[#0C2A22] px-6 py-5 text-white">
        <img src="/brand/insight-logo-white.svg" alt="Insight" className="h-9 w-auto" />
        <div className="text-end">
          <p className="text-xl font-extrabold" dir="rtl">{title.ar}</p>
          <p className="text-sm text-white/80" dir="ltr">{title.en}</p>
        </div>
      </header>
      <div className="h-1 bg-[#55BD8A]" />

      <div className="relative grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-w-0 gap-1 text-sm">
          <Row ar="رقم الفاتورة" en="Invoice number" value={inv.number} strong />
          <Row ar="تاريخ ووقت الإصدار" en="Issue date and time" value={issued.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} />
          <Row ar="مرجع الصفقة" en="Deal reference" value={view.deal.ref} />
          {milestone && <Row ar={`المرحلة ${milestone.seq}`} en={`Milestone ${milestone.seq}`} value={milestone.title} />}
        </div>
        <div className="grid place-items-center gap-2">
          {qr ? <img src={qr} alt="QR" className="size-36 rounded-lg border border-border bg-white p-1" /> : <div className="size-36 rounded-lg border border-dashed border-border" />}
          <Bi ar="رمز الفاتورة" en="Invoice QR" className="text-center text-xs" />
        </div>
      </div>

      <div className="relative grid gap-4 px-6 sm:grid-cols-2">
        <section className="min-w-0 rounded-xl bg-[#E9F7F0] p-4 text-sm">
          <Bi ar={<strong>المورّد</strong>} en="Seller" />
          <div className="mt-3 grid gap-1.5">
            <p><strong dir="rtl">{SELLER.ar}</strong> · <span dir="ltr">{SELLER.en}</span></p>
            <p><Bi ar={<>الرقم الضريبي: <bdi dir="ltr">{SELLER.vat}</bdi></>} en={<>VAT number: {SELLER.vat}</>} /></p>
            <p className="text-xs text-muted-foreground" dir="rtl">يُستبدل بالرقم الضريبي الفعلي بعد التسجيل · Placeholder until VAT registration</p>
            <p dir="ltr" className="text-start text-xs">{SELLER.site}</p>
          </div>
        </section>
        <section className="min-w-0 rounded-xl border border-border p-4 text-sm">
          <Bi ar={<strong>العميل ({payerRole.ar})</strong>} en={`Customer (${payerRole.en})`} />
          <div className="mt-3 grid gap-1.5">
            <p className="break-words font-semibold">{inv.billTo.name}</p>
            <p><Bi ar={`الدولة: ${countryAr}`} en={`Country: ${countryEn}`} /></p>
            {inv.billTo.taxNumber && <p><Bi ar={<>الرقم الضريبي: <bdi dir="ltr">{inv.billTo.taxNumber}</bdi></>} en={<>VAT number: {inv.billTo.taxNumber}</>} /></p>}
            {inv.billTo.registrationNumber && <p><Bi ar={<>السجل التجاري: <bdi dir="ltr">{inv.billTo.registrationNumber}</bdi></>} en={<>CR number: {inv.billTo.registrationNumber}</>} /></p>}
          </div>
        </section>
      </div>

      <section className="relative px-6 pt-6">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/60 text-xs">
              <tr>
                <th className="p-3 text-start"><Bi ar="الوصف" en="Description" /></th>
                <th className="p-3 text-center"><Bi ar="الكمية" en="Qty" /></th>
                <th className="p-3 text-end"><Bi ar="المبلغ الخاضع" en="Taxable amount" /></th>
                <th className="p-3 text-end"><Bi ar="نسبة الضريبة" en="VAT rate" /></th>
                <th className="p-3 text-end"><Bi ar="الضريبة" en="VAT" /></th>
                <th className="p-3 text-end"><Bi ar="الإجمالي" en="Total" /></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border align-top">
                <td className="p-3"><Bi ar={`رسوم خدمة إنسايت لإدارة الصفقة وحفظ مبلغها — ${view.deal.ref}`} en={`Insight service fee for managing and holding the deal — ${view.deal.ref}`} /></td>
                <td className="p-3 text-center tabular-nums">1</td>
                <td className="p-3 text-end tabular-nums"><bdi dir="ltr">{formatMoney(inv.fee, inv.currency)}</bdi></td>
                <td className="p-3 text-end tabular-nums"><bdi dir="ltr">{rate}</bdi></td>
                <td className="p-3 text-end tabular-nums"><bdi dir="ltr">{formatMoney(inv.vat, inv.currency)}</bdi></td>
                <td className="p-3 text-end font-semibold tabular-nums"><bdi dir="ltr">{formatMoney(inv.total, inv.currency)}</bdi></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="relative grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="grid content-start gap-2 text-xs leading-6 text-muted-foreground">
          <Bi ar={`الضريبة محسوبة بنسبة دولة العميل الذي دفع الرسوم (${countryAr}: ${rate}).`} en={`VAT is charged at the rate of the fee payer's country (${countryEn}: ${rate}).`} />
          <Bi ar="هذه الفاتورة عن رسوم خدمة إنسايت فقط. مبلغ الصفقة ليس بيعاً من إنسايت؛ يُصدر البائع فاتورته على البضاعة أو الخدمة." en="This invoice covers the Insight service fee only. The deal amount is not a supply by Insight; the seller issues their own invoice for the goods or service." />
        </div>
        <div className="rounded-xl border border-border p-4 text-sm">
          <Row ar="الإجمالي قبل الضريبة" en="Total excluding VAT" value={formatMoney(inv.fee, inv.currency)} />
          <Row ar={`ضريبة القيمة المضافة (${rate})`} en={`VAT (${rate})`} value={formatMoney(inv.vat, inv.currency)} />
          <Row ar="الإجمالي شامل الضريبة" en="Total including VAT" value={formatMoney(inv.total, inv.currency)} strong />
        </div>
      </section>

      <footer className="relative border-t border-border bg-muted/40 px-6 py-4 text-center text-xs leading-6 text-muted-foreground">
        <p dir="rtl">نموذج فاتورة في نسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية، وإنسايت غير مسجّلة ضريبياً بعد. ليست فاتورة ضريبية معتمدة.</p>
        <p dir="ltr">Demo invoice template: the payment provider is simulated, no real money moves, and Insight is not VAT-registered yet. Not a valid tax invoice.</p>
      </footer>
    </article>
  );
}

function InvoicePage() {
  const { text } = useLocale();
  const { ref } = Route.useParams();
  const load = useServerFn(getFeeInvoices);
  const q = useQuery({ queryKey: ["fee-invoices", ref], queryFn: () => load({ data: { ref } }) });

  if (q.isError) return <div data-no-localize role="alert" className="p-6">{text("Invoice could not be loaded.", "تعذّر تحميل الفاتورة.")} <Button variant="outline" onClick={() => void q.refetch()}>{text("Try again", "حاول مرة أخرى")}</Button></div>;
  if (q.isPending) return <p className="p-10 text-center">{text("Loading…", "جارٍ التحميل…")}</p>;
  if (!q.data || q.data.invoices.length === 0) return (
    <div data-no-localize className="mx-auto max-w-xl p-10 text-center">
      <p>{text("No fee invoice has been issued to you for this deal yet. An invoice is issued when the fee is paid.", "لم تصدر لك فاتورة رسوم لهذه الصفقة بعد. تصدر الفاتورة عند دفع الرسوم.")}</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/documents">{text("Back", "رجوع")}</Link></Button>
    </div>
  );
  const view = q.data;
  return (
    <div data-no-localize className="mx-auto max-w-4xl space-y-8 bg-background p-4 text-foreground sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Bi ar={<strong className="text-lg">فواتير رسوم إنسايت</strong>} en="Insight fee invoices" />
        <Button onClick={() => window.print()}>{text("Print or save as PDF", "طباعة أو حفظ PDF")}</Button>
      </div>
      {view.invoices.map((inv) => <InvoiceSheet key={inv.number} inv={inv} view={view} />)}
    </div>
  );
}
