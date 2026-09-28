import { Globe2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatformSettings } from "@/lib/platform-settings";

type Cur = { code: string; name: string; base: number; spread: number };

const fmt = (n: number, code: string) =>
  `${code} ${n.toLocaleString("en-GB", {
    minimumFractionDigits: ["BHD", "KWD", "OMR"].includes(code) ? 3 : 2,
    maximumFractionDigits: ["BHD", "KWD", "OMR"].includes(code) ? 3 : 2,
  })}`;

/** Buyer-facing converter: buyer and supplier currencies, live console rates. No margin shown. */
export function FxCustomerQuote() {
  const { settings } = usePlatformSettings();
  const list: Cur[] = useMemo(
    () => [
      { code: "SAR", name: "Saudi riyal", base: 1, spread: 0 },
      ...settings.rates.map((r) => ({ code: r.code, name: r.name, base: r.baseRate, spread: r.spread })),
    ],
    [settings.rates],
  );
  const [amount, setAmount] = useState(10000);
  const [supplier, setSupplier] = useState("AED");
  const [buyer, setBuyer] = useState("SAR");

  const s = list.find((c) => c.code === supplier) ?? list[0];
  const b = list.find((c) => c.code === buyer) ?? list[0];
  const same = s.code === b.code;
  // SAR per 1 unit, margin applied once on the conversion
  const margin = same ? 0 : Math.max(s.spread, b.spread);
  const rate = same ? 1 : (s.base / b.base) * (1 + margin);
  const total = (amount || 0) * rate;

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
    <section className="mt-10">
      <h2 className="text-xl font-bold">Pay a supplier abroad</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose your currency and the supplier's currency to see exactly what you will pay before you
        fund the deal. The rate is fixed at funding time — no extra charges added later.
      </p>

      <Card className="mt-4 border-primary/25">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cq-amount">Deal value (supplier currency)</Label>
              <Input
                id="cq-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cq-supplier">Supplier currency</Label>
                {select("cq-supplier", supplier, setSupplier)}
              </div>
              <div>
                <Label htmlFor="cq-buyer">Your currency (buyer)</Label>
                {select("cq-buyer", buyer, setBuyer)}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <Globe2 className="size-5 text-primary" />
              <p className="font-semibold">Your payment</p>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Supplier receives</dt>
                <dd className="font-semibold" dir="ltr">{fmt(amount || 0, s.code)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">
                  Your rate ({b.code} per 1 {s.code})
                </dt>
                <dd className="font-semibold" dir="ltr">
                  {rate.toLocaleString("en-GB", { maximumFractionDigits: 5 })}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                <dt className="font-semibold">Total you pay</dt>
                <dd className="text-lg font-extrabold text-primary" dir="ltr">{fmt(total, b.code)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Rates set by Insight. Escrow fees are shown separately on the deal page.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
