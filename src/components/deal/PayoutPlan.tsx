import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import type { PlannedPayout } from "@/lib/payout-planner";

/** Supplier view: expected channel and arrival for each payment (IDEA-001). Provisional values. */
export function PayoutPlan({ lines }: { lines: PlannedPayout[] }) {
  const { text } = useLocale();
  if (!lines.length) return null;
  return (
    <Card data-no-localize>
      <CardContent className="p-6">
        <div className="flex items-center gap-2"><CalendarClock className="size-5 text-primary" /><h3 className="font-semibold">{text("Expected payout timing", "موعد الاستلام المتوقع")}</h3></div>
        <ul className="mt-4 space-y-3 text-sm">
          {lines.map((l) => (
            <li key={l.label} className="flex flex-wrap items-start justify-between gap-2 border-t pt-3 first:border-t-0 first:pt-0">
              <span><span className="font-medium">{l.labelAr ? text(l.label, l.labelAr) : l.label}</span><span className="block text-xs text-muted-foreground">{text(l.en, l.ar)}</span></span>
              <bdi className="tabular-nums">{formatMoney(l.amount, l.currency)}</bdi>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">{text("Estimates from the payment provider's usual channels, provisional in this demo. Arrival times are expected, not guaranteed.", "تقديرات حسب القنوات المعتادة لمزوّد الدفع، وهي مؤقتة في هذه النسخة التجريبية. أوقات الوصول متوقعة وليست مضمونة.")}</p>
      </CardContent>
    </Card>
  );
}
