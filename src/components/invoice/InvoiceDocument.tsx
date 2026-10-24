import { forwardRef } from "react";
import { countryLabel, type FeeInvoice } from "@/lib/fee-invoice";
import { formatMoney } from "@/lib/money";

/**
 * Fixed A4 invoice (794 x 1123 CSS px at 96 dpi). Uses inline styles only and no responsive classes,
 * so it renders identically on a phone, a laptop, in print and when converted to a PDF.
 */
export const INVOICE_SELLER = { ar: "إنسايت", en: "Insight", vat: "3XXXXXXXXXXXXX3", site: "insightsettle.com" };

const C = { ink: "#0C2A22", muted: "#4B625C", line: "#DCEBE5", tint: "#E9F7F0", dark: "#0C2A22", mint: "#55BD8A", paper: "#FFFFFF" };
const AR = "'Thmanyah Sans', Tahoma, 'Segoe UI', Arial, sans-serif";

function Pair({ ar, en, size = 12, bold = false, align = "right" }: { ar: React.ReactNode; en: React.ReactNode; size?: number; bold?: boolean; align?: "right" | "left" }) {
  return (
    <div style={{ textAlign: align, lineHeight: 1.35 }}>
      <div dir="rtl" style={{ fontSize: size, fontWeight: bold ? 700 : 500, color: C.ink }}>{ar}</div>
      <div dir="ltr" style={{ fontSize: size - 2.5, color: C.muted }}>{en}</div>
    </div>
  );
}

function KV({ ar, en, value, strong = false }: { ar: string; en: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
      <bdi dir="ltr" style={{ fontSize: 12.5, fontWeight: strong ? 800 : 600, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{value}</bdi>
      <Pair ar={ar} en={en} size={12} bold={strong} />
    </div>
  );
}

export const InvoiceDocument = forwardRef<HTMLDivElement, { inv: FeeInvoice; dealRef: string; milestone?: { seq: number; title: string } | null; qr: string | null }>(
  function InvoiceDocument({ inv, dealRef, milestone, qr }, ref) {
    const [countryEn, countryAr] = countryLabel(inv.billTo.country);
    const rate = `${Math.round(inv.vatRate * 1000) / 10}%`;
    const issued = new Date(inv.issuedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const title = inv.kind === "standard" ? ["فاتورة ضريبية", "Tax invoice"] : ["فاتورة ضريبية مبسطة", "Simplified tax invoice"];
    const role = inv.party === "buyer" ? ["الطرف الدافع", "Paying party"] : ["الطرف المستلم", "Receiving party"];
    const money = (n: number) => formatMoney(n, inv.currency);
    const cell = { padding: "8px 10px", fontSize: 11.5, color: C.ink, borderTop: `1px solid ${C.line}` } as const;
    return (
      <div ref={ref} data-no-localize style={{ width: 794, height: 1123, boxSizing: "border-box", background: C.paper, fontFamily: AR, color: C.ink, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <span style={{ transform: "rotate(-24deg)", fontSize: 78, fontWeight: 800, color: "rgba(12,42,34,0.05)", whiteSpace: "nowrap" }}>DEMO · نموذج تجريبي</span>
        </div>

        <div style={{ background: C.dark, color: "#fff", padding: "22px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src="/brand/insight-logo-white.svg" alt="Insight" style={{ height: 34 }} />
          <div style={{ textAlign: "right" }}>
            <div dir="rtl" style={{ fontSize: 22, fontWeight: 800 }}>{title[0]}</div>
            <div dir="ltr" style={{ fontSize: 12, opacity: 0.8 }}>{title[1]}</div>
          </div>
        </div>
        <div style={{ height: 4, background: C.mint }} />

        <div style={{ padding: "22px 40px 0", display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ textAlign: "center" }}>
            {qr ? <img src={qr} alt="QR" style={{ width: 112, height: 112, border: `1px solid ${C.line}`, borderRadius: 8, padding: 3, background: "#fff" }} /> : <div style={{ width: 112, height: 112 }} />}
            <div style={{ marginTop: 4 }}><Pair ar="رمز الفاتورة" en="Invoice QR" size={10} align="left" /></div>
          </div>
          <div style={{ flex: 1 }}>
            <KV ar="رقم الفاتورة" en="Invoice number" value={inv.number} strong />
            <KV ar="تاريخ ووقت الإصدار" en="Issue date and time" value={issued} />
            <KV ar="مرجع الصفقة" en="Deal reference" value={dealRef} />
            {milestone && <KV ar={`المرحلة ${milestone.seq}`} en={`Milestone ${milestone.seq}`} value={milestone.title} />}
          </div>
        </div>

        <div style={{ padding: "18px 40px 0", display: "flex", gap: 16 }}>
          <div style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", textAlign: "right" }}>
            <Pair ar={`العميل (${role[0]})`} en={`Customer (${role[1]})`} size={12.5} bold />
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>{inv.billTo.name}</div>
            <div style={{ marginTop: 6 }}><Pair ar={`الدولة: ${countryAr}`} en={`Country: ${countryEn}`} size={11.5} /></div>
            {inv.billTo.taxNumber && <div style={{ marginTop: 6 }}><Pair ar={<>الرقم الضريبي: <bdi dir="ltr">{inv.billTo.taxNumber}</bdi></>} en={`VAT number: ${inv.billTo.taxNumber}`} size={11.5} /></div>}
            {inv.billTo.registrationNumber && <div style={{ marginTop: 6 }}><Pair ar={<>السجل التجاري: <bdi dir="ltr">{inv.billTo.registrationNumber}</bdi></>} en={`CR number: ${inv.billTo.registrationNumber}`} size={11.5} /></div>}
          </div>
          <div style={{ flex: 1, background: C.tint, borderRadius: 12, padding: "12px 14px", textAlign: "right" }}>
            <Pair ar="المورّد" en="Seller" size={12.5} bold />
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>{INVOICE_SELLER.ar} · <span dir="ltr">{INVOICE_SELLER.en}</span></div>
            <div style={{ marginTop: 6 }}><Pair ar={<>الرقم الضريبي: <bdi dir="ltr">{INVOICE_SELLER.vat}</bdi></>} en={`VAT number: ${INVOICE_SELLER.vat}`} size={11.5} /></div>
            <div style={{ marginTop: 4, fontSize: 10, color: C.muted }} dir="rtl">يُستبدل بالرقم الفعلي بعد التسجيل · Placeholder until VAT registration</div>
            <div dir="ltr" style={{ marginTop: 4, fontSize: 11, textAlign: "left" }}>{INVOICE_SELLER.site}</div>
          </div>
        </div>

        <div style={{ padding: "18px 40px 0" }}>
          <table dir="rtl" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#F1F6F4" }}>
                {[["الوصف", "Description", "right"], ["الكمية", "Qty", "center"], ["المبلغ الخاضع", "Taxable", "left"], ["النسبة", "VAT rate", "left"], ["الضريبة", "VAT", "left"], ["الإجمالي", "Total", "left"]].map(([a, e, al]) => (
                  <th key={e} style={{ padding: "8px 10px", textAlign: al as "left" }}><Pair ar={a} en={e} size={11} bold align={al === "center" ? "right" : (al as "left")} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...cell, width: "38%" }}><Pair ar={`رسوم خدمة إنسايت لإدارة الصفقة — ${dealRef}`} en={`Insight deal management service fee — ${dealRef}`} size={11.5} /></td>
                <td style={{ ...cell, textAlign: "center" }}>1</td>
                <td style={{ ...cell, textAlign: "left" }}><bdi dir="ltr">{money(inv.fee)}</bdi></td>
                <td style={{ ...cell, textAlign: "left" }}><bdi dir="ltr">{rate}</bdi></td>
                <td style={{ ...cell, textAlign: "left" }}><bdi dir="ltr">{money(inv.vat)}</bdi></td>
                <td style={{ ...cell, textAlign: "left", fontWeight: 800 }}><bdi dir="ltr">{money(inv.total)}</bdi></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ padding: "18px 40px 0", display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 300, border: `1px solid ${C.line}`, borderRadius: 12, padding: "4px 14px" }}>
            <KV ar="الإجمالي قبل الضريبة" en="Total excluding VAT" value={money(inv.fee)} />
            <KV ar={`ضريبة القيمة المضافة (${rate})`} en={`VAT (${rate})`} value={money(inv.vat)} />
            <KV ar="الإجمالي شامل الضريبة" en="Total including VAT" value={money(inv.total)} strong />
          </div>
          <div style={{ flex: 1, textAlign: "right", fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
            <div dir="rtl">الضريبة محسوبة بنسبة دولة العميل الذي دفع الرسوم ({countryAr}: {rate}).</div>
            <div dir="ltr" style={{ textAlign: "left" }}>VAT is charged at the rate of the fee payer&apos;s country ({countryEn}: {rate}).</div>
            <div dir="rtl" style={{ marginTop: 8 }}>هذه الفاتورة عن رسوم خدمة إنسايت فقط. مبلغ الصفقة ليس بيعاً من إنسايت؛ يُصدر البائع فاتورته على البضاعة أو الخدمة.</div>
            <div dir="ltr" style={{ textAlign: "left" }}>This invoice covers the Insight service fee only. The deal amount is not a supply by Insight; the seller issues their own invoice.</div>
          </div>
        </div>

        <div style={{ marginTop: "auto", background: "#F6FAF8", borderTop: `1px solid ${C.line}`, padding: "12px 40px", textAlign: "center", fontSize: 10, color: C.muted, lineHeight: 1.6 }}>
          <div dir="rtl">نموذج فاتورة في نسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية، وإنسايت غير مسجّلة ضريبياً بعد. ليست فاتورة ضريبية معتمدة.</div>
          <div dir="ltr">Demo invoice template: the payment provider is simulated, no real money moves, and Insight is not VAT-registered yet. Not a valid tax invoice.</div>
        </div>
      </div>
    );
  },
);

/** Renders each fixed A4 invoice node to an image and saves one PDF page per invoice. */
export async function downloadInvoicesPdf(nodes: HTMLElement[], fileName: string) {
  const { toPng } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');
  if (document.fonts?.ready) await document.fonts.ready;
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" }); // first pass warms fonts/images (Safari)
    const png = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
    if (i > 0) pdf.addPage();
    pdf.addImage(png, "PNG", 0, 0, 595.28, 841.89);
  }
  pdf.save(fileName);
}
