import { Building2, CreditCard, Lock } from "lucide-react";

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
      <div className="rounded-xl border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4 text-primary" />{text("Bank transfer", "تحويل بنكي")}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text("After you confirm, you get transfer details for this deal only, with a reference that matches your payment automatically.",
          "بعد التأكيد تحصل على بيانات تحويل خاصة بهذه الصفقة فقط، مع مرجع يطابق دفعتك تلقائياً.")}</p>
        {simulated && <p className="mt-2 rounded-lg bg-accent/60 px-3 py-2 text-xs">{text("Demo: the transfer is simulated and confirmed automatically.", "نسخة تجريبية: التحويل محاكى ويُؤكَّد تلقائياً.")}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="size-4 text-primary" />{method === "mada" ? text("mada card details", "بيانات بطاقة مدى") : text("Card details", "بيانات البطاقة")}</p>
      <div id="provider-secure-fields" aria-disabled={simulated} className="mt-3 grid gap-2">
        <div className="flex h-11 items-center justify-between rounded-lg border border-dashed px-3 text-sm text-muted-foreground" dir="ltr"><span>•••• •••• •••• ••••</span><Lock className="size-4" /></div>
        <div className="grid grid-cols-2 gap-2" dir="ltr">
          <div className="flex h-11 items-center rounded-lg border border-dashed px-3 text-sm text-muted-foreground">MM / YY</div>
          <div className="flex h-11 items-center rounded-lg border border-dashed px-3 text-sm text-muted-foreground">CVV</div>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Lock className="mt-0.5 size-3.5 shrink-0" />{text("Card details are entered in the payment provider's secure fields and never pass through Insight's servers.",
        "تُدخل بيانات البطاقة في حقول آمنة لمزوّد الدفع، ولا تمر على خوادم إنسايت.")}</p>
      {simulated && <p className="mt-2 rounded-lg bg-accent/60 px-3 py-2 text-xs">{text("Demo: no card details are needed; the payment provider is simulated and no real money moves.", "نسخة تجريبية: لا حاجة لبيانات بطاقة، ومزوّد الدفع محاكى ولا تتحرك أموال حقيقية.")}</p>}
    </div>
  );
}

/** Card scheme names shown as text badges (scheme rules require showing accepted brands). */
export function AcceptedBadges() {
  return (
    <div className="flex flex-wrap items-center gap-1.5" dir="ltr" aria-label="Accepted payment methods">
      {["mada", "VISA", "Mastercard", "Apple Pay"].map((b) => (
        <span key={b} className="rounded-md border bg-card px-2 py-0.5 text-[11px] font-semibold tracking-wide text-foreground/80">{b}</span>
      ))}
    </div>
  );
}
