import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getTaxInvoice } from "@/lib/deal-actions";
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

function InvoicePage() {
  const { ref } = Route.useParams();
  const deal = useQuery({ queryKey: ["deal", ref], queryFn: () => getDealByRef(ref) });
  const inv = useQuery({
    queryKey: ["invoice", deal.data?.id],
    queryFn: () => getTaxInvoice(deal.data!.id),
    enabled: !!deal.data,
  });
  const [qr, setQr] = useState<string | null>(null);
  const i = inv.data;

  useEffect(() => {
    if (!i) return;
    const payload = zatcaTlv([SELLER, VAT_NUMBER, new Date(i.issued_at).toISOString(), Number(i.total).toFixed(2), Number(i.vat).toFixed(2)]);
    QRCode.toDataURL(payload, { margin: 1, width: 180 }).then(setQr);
  }, [i]);

  if (deal.isLoading || inv.isLoading) return <p className="p-10 text-center">Loading…</p>;
  if (!i || !deal.data) return <p className="p-10 text-center">No invoice has been issued for this deal yet.</p>;

  return (
    <div className="mx-auto max-w-2xl bg-background p-8 text-foreground" dir="ltr">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Simplified tax invoice</h1>
          <p className="text-sm">فاتورة ضريبية مبسطة</p>
          <p className="mt-3 text-sm">
            {SELLER} · VAT no. {VAT_NUMBER}
          </p>
        </div>
        {qr && <img src={qr} alt="ZATCA QR code" className="size-36" />}
      </div>
      <table className="mt-8 w-full text-sm">
        <tbody className="divide-y divide-border">
          <tr><td className="py-2 text-muted-foreground">Invoice number</td><td className="py-2 text-right font-semibold">{i.invoice_number}</td></tr>
          <tr><td className="py-2 text-muted-foreground">Issued</td><td className="py-2 text-right">{new Date(i.issued_at).toLocaleString("en-GB")}</td></tr>
          <tr><td className="py-2 text-muted-foreground">Deal</td><td className="py-2 text-right">{deal.data.ref} — {deal.data.title}</td></tr>
          <tr><td className="py-2 text-muted-foreground">Escrow service fee</td><td className="py-2 text-right">{i.currency} {Number(i.fee).toFixed(2)}</td></tr>
          <tr><td className="py-2 text-muted-foreground">VAT ({(Number(i.vat_rate) * 100).toFixed(0)}%)</td><td className="py-2 text-right">{i.currency} {Number(i.vat).toFixed(2)}</td></tr>
          <tr><td className="py-2 font-bold">Total</td><td className="py-2 text-right font-bold">{i.currency} {Number(i.total).toFixed(2)}</td></tr>
        </tbody>
      </table>
      <p className="mt-6 text-xs text-muted-foreground">
        This invoice covers the Insight service fee only. The deal amount itself is held and settled by the licensed payment provider.
      </p>
      <Button className="mt-6 print:hidden" onClick={() => window.print()}>
        Print or save as PDF
      </Button>
    </div>
  );
}
