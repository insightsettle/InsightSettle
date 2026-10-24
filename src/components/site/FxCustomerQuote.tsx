import { Globe2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, moneyInputStep } from "@/lib/money";
import { useLocale } from "@/lib/locale";
import { usePlatformSettings } from "@/lib/platform-settings";

type Cur = { code: string; name: string; base: number; spread: number };

const fmt = formatMoney;

/** Buyer-facing converter: buyer and supplier currencies, live console rates. No margin shown. */
export function FxCustomerQuote() {
  const { text } = useLocale();
  const { settings } = usePlatformSettings();
  const list: Cur[] = useMemo(
    () => [
      { code: "SAR", name: "Saudi riyal", base: 1, spread: 0 },
      ...settings.rates.filter((r) => r.active !== false).map((r) => ({ code: r.code, name: r.name, base: r.baseRate, spread: r.spread })),
    ],
    [settings.rates],
  );
  const [amount, setAmount] = useState<number | "">("");
  const [supplier, setSupplier] = useState("AED");
  const [buyer, setBuyer] = useState("SAR");

  const s = list.find((c) => c.code === supplier) ?? list[0];
  const b = list.find((c) => c.code === buyer) ?? list[0];
  if (!s || !b) return null;
  const same = s.code === b.code;
  // SAR per 1 unit, margin applied once on the conversion
  const margin = same ? 0 : Math.max(s.spread, b.spread);
  const rate = same ? 1 : (s.base / b.base) * (1 + margin);
  const total = (Number(amount) || 0) * rate;

  const select = (id: string, value: string, set: (v: string) => void) => (
    <select
      id={id}
      value={value}
      onChange={(e) => set(e.target.value)}
      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      {list.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} — {c.name}
        </option>
      ))}
    </select>
  );

  return (
    <section data-no-localize className="mt-4 min-w-0">
      <h2 className="text-lg font-bold">{text("Pay a supplier abroad", "الدفع لمورد خارج دولتك")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
{text("Indicative conversion only. Your payment, fees and VAT are confirmed in the locked deal quote.", "تحويل تقديري فقط. يُؤكّد مبلغ الدفع والرسوم والضريبة في عرض الصفقة المقفل.")}
      </p>

      <Card className="mt-4 border-primary/25">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cq-amount">{text("Deal value (supplier currency)", "قيمة الصفقة (عملة المورد)")}</Label>
              <Input
                id="cq-amount"
                type="number"
                min={0}
                step={moneyInputStep(supplier)}
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cq-supplier">{text("Supplier currency", "عملة المورد")}</Label>
                {select("cq-supplier", supplier, setSupplier)}
              </div>
              <div>
                <Label htmlFor="cq-buyer">{text("Your currency (buyer)", "عملة الدفع")}</Label>
                {select("cq-buyer", buyer, setBuyer)}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <Globe2 className="size-5 text-primary" />
              <p className="font-semibold">{text("Your payment", "دفعتك")}</p>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3">
                <dt className="text-muted-foreground">{text("Supplier receives", "مبلغ الصفقة بعملة المورد")}</dt>
                <dd className="break-words text-end font-semibold" dir="ltr">{fmt(Number(amount) || 0, s.code)}</dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3">
                <dt className="text-muted-foreground">
                  {text("Conversion rate", "سعر التحويل")} ({b.code} / {s.code})
                </dt>
                <dd className="break-words text-end font-semibold" dir="ltr">
                  {rate.toLocaleString("en-GB", { maximumFractionDigits: 5 })}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                <dt className="font-semibold">{text("Total you pay", "المبلغ المحوّل قبل الرسوم")}</dt>
                <dd className="break-words text-end text-lg font-extrabold text-primary" dir="ltr">{fmt(total, b.code)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              {text("Indicative demo rates. Fees and VAT are shown separately on the deal page.", "أسعار تقديرية تجريبية. تظهر الرسوم والضريبة بصورة منفصلة في صفحة الصفقة.")}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
