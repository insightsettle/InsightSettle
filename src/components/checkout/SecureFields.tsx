import { Building2, Copy, CreditCard, Lock, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { METHOD_BRANDS, PaymentMark, PaymentMarks, type PaymentBrand } from "@/components/checkout/PaymentMarks";
import { useLocale } from "@/lib/locale";
import type { PaymentMethod } from "@/lib/payment-methods";

/**
 * Where the payment provider's secure fields go (founder, 27 Oct: an Insight-branded checkout).
 *
 * With a real provider, its embedded/hosted fields SDK is mounted inside `#provider-secure-fields`:
 * card number, expiry and CVV are typed into the provider's own iframes and sent straight to the provider,
 * so card data never touches Insight's servers (keeps PCI scope minimal). Insight only receives a token.
 * Until a provider adapter is built, the simulated provider needs no card details.
 */
export function SecureFields({ method, simulated }: { method: PaymentMethod; simulated: boolean }) {
  const { text } = useLocale();
  if (method === "bank_transfer") {
    return (
      <div key="bank" className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-card p-5 duration-300">
        <p className="flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4 text-primary" />{text("Bank transfer", "تحويل بنكي")}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text("After you confirm, you get transfer details for this deal only, with a reference that matches your payment automatically.",
          "بعد التأكيد تحصل على بيانات تحويل خاصة بهذه الصفقة فقط، مع مرجع يطابق دفعتك تلقائياً.")}</p>
        <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {[[text("Confirm", "أكّد"), text("Get the deal's transfer details", "تحصل على بيانات التحويل")], [text("Transfer", "حوّل"), text("From your bank app, with the reference", "من تطبيق بنكك مع المرجع")], [text("Matched", "مطابقة"), text("The amount is held in the deal", "يُحفظ المبلغ في الصفقة")]].map(([t, d], i) => (
            <li key={i} className="flex items-start gap-2 rounded-xl bg-muted/60 p-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span><span><b className="block text-xs">{t}</b><span className="text-xs text-muted-foreground">{d}</span></span></li>
          ))}
        </ol>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed px-3 py-2.5 text-xs text-muted-foreground" dir="ltr"><span>IBAN · SA•• •••• •••• •••• •••• ••••</span><Copy className="size-3.5" /></div>
        {simulated && <p className="mt-3 rounded-lg bg-accent/60 px-3 py-2 text-xs">{text("Demo: the transfer is simulated and confirmed automatically.", "نسخة تجريبية: التحويل محاكى ويُؤكَّد تلقائياً.")}</p>}
      </div>
    );
  }
  const brands: readonly PaymentBrand[] = METHOD_BRANDS[method];
  return (
    <div key={method} className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-card p-5 duration-300">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="size-4 text-primary" />{method === "mada" ? text("mada card details", "بيانات بطاقة مدى") : text("Card details", "بيانات البطاقة")}</p>
        <PaymentMarks brands={[...brands]} size="sm" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
        <div id="provider-secure-fields" aria-disabled={simulated} className="grid gap-2">
          <Field label={text("Card number", "رقم البطاقة")}><span className="tracking-[0.2em]">•••• •••• •••• ••••</span><span className="flex items-center gap-1">{brands[0] && <PaymentMark brand={brands[0]} size="sm" />}<Lock className="size-3.5" /></span></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={text("Expiry", "تاريخ الانتهاء")}>MM / YY</Field>
            <Field label="CVV">•••</Field>
          </div>
        </div>
        <CardPreview brand={brands[0]} />
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />{text("Card details are entered in the payment provider's secure fields and never pass through Insight's servers.",
        "تُدخل بيانات البطاقة في حقول آمنة لمزوّد الدفع، ولا تمر على خوادم إنسايت.")}</p>
      {simulated && <p className="mt-2 rounded-lg bg-accent/60 px-3 py-2 text-xs">{text("Demo: no card details are needed; the payment provider is simulated and no real money moves.", "نسخة تجريبية: لا حاجة لبيانات بطاقة، ومزوّد الدفع محاكى ولا تتحرك أموال حقيقية.")}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group rounded-xl border bg-background px-3 pb-2 pt-1.5 transition hover:border-primary/40" dir="ltr">
      <span className="block text-[10px] font-medium text-muted-foreground" dir="auto">{label}</span>
      <span className="mt-0.5 flex items-center justify-between text-sm text-muted-foreground/80">{children}</span>
    </div>
  );
}

/** Decorative card that tilts on hover; it shows the scheme, never any card data. */
function CardPreview({ brand }: { brand?: PaymentBrand | undefined }) {
  return (
    <div aria-hidden className="hidden [perspective:900px] sm:block">
      <div className="relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl p-3.5 text-white shadow-[0_18px_36px_-18px_rgb(12_42_34/0.7)] transition-transform duration-500 ease-out [transform-style:preserve-3d] hover:[transform:rotateY(-12deg)_rotateX(6deg)]"
        style={{ background: "radial-gradient(120% 120% at 100% 0%, #5cc4ba 0%, rgba(92,196,186,0) 45%), linear-gradient(135deg, #138065 0%, #0c5a47 70%, #0b3d30 100%)" }}>
        <span className="checkout-sheen pointer-events-none absolute inset-0" />
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between"><img src="/brand/insight-logo-white.svg" alt="" className="h-4 w-auto opacity-90" /><span className="h-5 w-7 rounded-[5px] bg-gradient-to-br from-[#f3d98b] to-[#c9a24a]" /></div>
          <p className="font-mono text-[13px] tracking-[0.18em] text-white/90" dir="ltr">•••• •••• •••• ••••</p>
          <div className="flex items-end justify-between"><span className="font-mono text-[10px] text-white/70" dir="ltr">MM/YY</span>{brand && <PaymentMark brand={brand} size="sm" />}</div>
        </div>
      </div>
    </div>
  );
}

/** Accepted payment marks shown in the checkout header (scheme rules ask merchants to show accepted brands). */
export function AcceptedBadges() {
  const { text } = useLocale();
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={text("Accepted payment methods", "طرق الدفع المقبولة")}>
      <PaymentMarks brands={["mada", "visa", "mastercard"]} />
    </div>
  );
}
