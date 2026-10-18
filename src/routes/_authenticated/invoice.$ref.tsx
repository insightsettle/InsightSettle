import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getTaxInvoices, type TaxInvoiceRow } from "@/lib/deal-actions";
import { useMilestones } from "@/components/deal/DealPanels";
import { getDealByRef } from "@/lib/deals";

export const Route = createFileRoute("/_authenticated/invoice/$ref")({
  head: () => ({
    meta: [
      { title: "Tax invoice | Insight" },
      { name: "description", content: "Simplified tax invoice for the Insight escrow service fee." },
      { property: "og:title", content: "Insight tax invoice" },
      { property: "og:description", content: "VAT invoice for the escrow service fee." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoicePage,
});

const SELLER = "Insight Pay X";
const VAT_NUMBER = "300000000000003"; // placeholder until the real VAT number is provided

/** ZATCA phase-1 QR: TLV (seller, VAT no., timestamp, total, VAT) in base64. */
function zatcaTlv(values: string[]) {
  const enc = new TextEncoder();
  const bytes: number[] = [];
  values.forEach((v, i) => {
    const b = enc.encode(v);
    bytes.push(i + 1, b.length, ...b);
  });
  let bin = "";
  bytes.forEach((x) => (bin += String.fromCharCode(x)));
  return btoa(bin);
}

function InvoiceBlock({ i, deal, label }: { i: TaxInvoiceRow; deal: { ref: string; title: string }; label: string | null }) {
  const { text, locale } = useLocale();
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    const payload = zatcaTlv([SELLER, VAT_NUMBER, new Date(i.issued_at).toISOString(), Number(i.total).toFixed(2), Number(i.vat).toFixed(2)]);
    QRCode.toDataURL(payload, { margin: 1, width: 180 }).then(setQr);
  }, [i]);
  return (
    <section className="break-inside-avoid border-b border-border pb-8 pt-8 first:pt-0 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">{text("Simplified tax invoice", "فاتورة ضريبية مبسطة")}</h1>
          
          <p className="mt-3 text-sm">
            {SELLER} · {text("VAT no.", "الرقم الضريبي")} {VAT_NUMBER}
          </p>
        </div>
        {qr && <img src={qr} alt="ZATCA QR code" className="size-36" />}
      </div>
      <table className="mt-8 w-full text-sm">
        <tbody className="divide-y divide-border">
          <tr><td className="py-2 text-muted-foreground">{text("Invoice number", "رقم الفاتورة")}</td><td className="py-2 text-right font-semibold">{i.invoice_number}</td></tr>
          <tr><td className="py-2 text-muted-foreground">{text("Issued", "تاريخ الإصدار")}</td><td className="py-2 text-right">{new Date(i.issued_at).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB")}</td></tr>
          <tr><td className="py-2 text-muted-foreground">{text("Deal", "الصفقة")}</td><td className="py-2 text-right">{deal.ref} — {deal.title}</td></tr>
          {label && <tr><td className="py-2 text-muted-foreground">{text("Funding", "الدفع")}</td><td className="py-2 text-right">{label}</td></tr>}
          <tr><td className="py-2 text-muted-foreground">{text("Escrow service fee", "رسوم خدمة الضمان")}</td><td className="py-2 text-right">{formatMoney(Number(i.fee), i.currency)}</td></tr>
          <tr><td className="py-2 text-muted-foreground">{text("VAT", "الضريبة")} ({(Number(i.vat_rate) * 100).toFixed(0)}%)</td><td className="py-2 text-right">{formatMoney(Number(i.vat), i.currency)}</td></tr>
          <tr><td className="py-2 font-bold">{text("Total", "الإجمالي")}</td><td className="py-2 text-right font-bold">{formatMoney(Number(i.total), i.currency)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}

function InvoicePage() {
  const { text, direction } = useLocale();
  const { ref } = Route.useParams();
  const deal = useQuery({ queryKey: ["deal", ref], queryFn: () => getDealByRef(ref) });
  const inv = useQuery({
    queryKey: ["invoices", deal.data?.id],
    queryFn: () => { if (!deal.data) throw new Error("Deal unavailable"); return getTaxInvoices(deal.data.id); },
    enabled: !!deal.data,
  });
  const milestones = useMilestones(deal.data?.id);
  const list = inv.data ?? [];

  if (deal.isError || inv.isError) return <div data-no-localize role="alert" className="p-4">{text("Invoice could not be loaded.", "تعذّر تحميل الفاتورة.")}<Button variant="outline" onClick={() => { void deal.refetch(); void inv.refetch(); }}>{text("Try again", "حاول مرة أخرى")}</Button></div>;
  if (deal.isLoading || inv.isLoading) return <p className="p-10 text-center">{text("Loading…", "جارٍ التحميل…")}</p>;
  if (!list.length || !deal.data) return <p className="p-10 text-center">{text("No invoice has been issued for this deal yet.", "لم تصدر فاتورة لهذه الصفقة بعد.")}</p>;

  const invoiceDeal = deal.data;
  const labelFor = (i: TaxInvoiceRow) => {
    if (!i.milestone_id) return null;
    const m = (milestones.data ?? []).find((x: any) => x.id === i.milestone_id);
    return m ? text(`Milestone ${m.seq} — ${m.title}`, `المرحلة ${m.seq} — ${m.title}`) : text("Milestone", "المرحلة");
  };

  return (
    <div data-no-localize className="mx-auto max-w-2xl bg-background p-4 text-foreground sm:p-8" dir={direction}>
      {list.map((i) => <InvoiceBlock key={i.invoice_number} i={i} deal={invoiceDeal} label={labelFor(i)} />)}
      <p className="mt-6 text-xs text-muted-foreground">
        {text("These invoices cover the Insight service fee only. The deal amount is held and settled by the payment provider (simulated in this demo).", "تغطي هذه الفواتير رسوم خدمة إنسايت فقط. يحتفظ مزوّد الدفع بمبلغ الصفقة ويسوّيه (محاكى في هذه النسخة التجريبية).")}
      </p>
      <Button className="mt-6 print:hidden" onClick={() => window.print()}>
        Print or save as PDF
      </Button>
    </div>
  );
}
