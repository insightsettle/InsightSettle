import { Globe2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSAR } from "@/lib/demo-data";
import {
  type FxCurrency,
  currencyNames,
  formatForeign,
  fxCurrencies,
  quoteFx,
} from "@/lib/fx";

/** Buyer-facing converter: shows only the quoted rate and the SAR total. No margin, no revenue. */
export function FxCustomerQuote() {
  const [amount, setAmount] = useState(10000);
  const [currency, setCurrency] = useState<FxCurrency>("BHD");
  const quote = useMemo(() => quoteFx(amount || 0, currency), [amount, currency]);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">Pay a supplier abroad</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        See exactly what you will pay in Saudi riyals before you fund the deal. The rate is fixed at
        funding time — no extra charges added later.
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
            <div>
              <Label htmlFor="cq-currency">Supplier currency</Label>
              <select
                id="cq-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as FxCurrency)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {fxCurrencies.map((code) => (
                  <option key={code} value={code}>
                    {code} — {currencyNames[code]}
                  </option>
                ))}
              </select>
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
                <dd className="font-semibold" dir="ltr">
                  {formatForeign(quote.amountForeign, currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Your rate (SAR per 1 {currency})</dt>
                <dd className="font-semibold" dir="ltr">
                  {quote.customerRate.toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                <dt className="font-semibold">Total you pay</dt>
                <dd className="text-lg font-extrabold text-primary" dir="ltr">
                  {formatSAR(quote.customerChargeSAR)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Sample rates. Escrow fees are shown separately on the deal page.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
