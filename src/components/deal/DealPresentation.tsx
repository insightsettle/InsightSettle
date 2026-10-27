import { Check, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/locale";
import { Card, CardContent } from "@/components/ui/card";

export const DEMO_CUSTODY_EN = "Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.";
export const DEMO_CUSTODY_AR = "نسخة تجريبية لخدمة الضمان: مزوّد الدفع محاكى ولا تُحوَّل أي أموال حقيقية. عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، وتدير إنسايت قواعد الصفقة وتحفظ سجلها.";

export function CustodyNote({ className = "" }: { className?: string }) {
  const { text } = useLocale();
  return <p data-no-localize className={`flex items-start gap-2 text-xs leading-6 text-muted-foreground ${className}`}><ShieldCheck className="mt-1 size-4 shrink-0 text-primary" /><span>{text(DEMO_CUSTODY_EN, DEMO_CUSTODY_AR)}</span></p>;
}

export function FormStepper({ current }: { current: number }) {
  const { text } = useLocale();
  const steps: [string, string][] = [["What is the deal?", "ماذا تبيع أو تشتري؟"], ["Amount and terms", "المبلغ والشروط"], ["The other party", "الطرف الآخر والإرسال"]];
  return <Card data-no-localize><CardContent className="p-4"><ol className="grid grid-cols-3 gap-3">{steps.map(([en, ar], i) => <li key={en} className="flex items-center gap-2 text-sm"><span aria-current={i === current ? "step" : undefined} className={`relative grid size-8 shrink-0 place-items-center rounded-full font-bold transition-all duration-300 ${i === current ? "scale-110 bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_rgb(19_128_101/0.8)]" : i < current ? "bg-accent text-primary" : "bg-muted text-muted-foreground"}`}>{i === current && <span className="absolute inset-0 rounded-full bg-primary/40 motion-safe:animate-ping [animation-duration:2s]" />}<span className="relative">{i < current ? <Check className="checkout-pop size-4" strokeWidth={3} /> : i + 1}</span></span><span className={i === current ? "font-semibold text-foreground" : i < current ? "text-primary" : "text-muted-foreground"}>{text(en, ar)}</span></li>)}</ol></CardContent></Card>;
}