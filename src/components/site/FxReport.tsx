import { Banknote, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deals, formatSAR } from "@/lib/demo-data";
import {
  type FxCurrency,
  SPREAD,
  formatForeign,
  formatRate,
  fxCurrencies,
  quoteFx,
} from "@/lib/fx";

export function FxReport() {
  const [amount, setAmount] = useState(18000);
  const [currency, setCurrency] = useState<FxCurrency>("USD");
  const [spreadPct, setSpreadPct] = useState(SPREAD * 100);

  const spread = Math.min(Math.max(spreadPct, 0), 5) / 100;
  const quote = useMemo(() => quoteFx(amount || 0, currency, spread), [amount, currency, spread]);
  const perDeal = useMemo(
    () => deals.map((deal) => ({ deal, quote: quoteFx(deal.amount, currency, spread) })),
    [currency, spread],
  );
  const totalProfit = perDeal.reduce((sum, row) => sum + row.quote.profitSAR, 0);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Currency spread calculator</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Base rate, customer rate, spread margin, and expected profit per deal.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Sample rates</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="fx-amount">Deal value (SAR)</Label>
              <Input
                id="fx-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="fx-currency">Customer currency</Label>
              <select
                id="fx-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as FxCurrency)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {fxCurrencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="fx-spread">Spread margin (%)</Label>
              <Input
                id="fx-spread"
                type="number"
                step={0.05}
                min={0}
                max={5}
                value={spreadPct}
                onChange={(e) => setSpreadPct(Number(e.target.value))}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Banknote className="size-5 text-primary" />
              <p className="font-semibold">Conversion report</p>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label={`Base rate (SAR per 1 ${currency})`} value={formatRate(quote.baseRate)} />
              <Row
                label={`Customer rate (SAR per 1 ${currency})`}
                value={formatRate(quote.customerRate)}
              />
              <Row label="Spread margin" value={`${(quote.spread * 100).toFixed(2)}%`} />
              <Row label="Cost at base rate" value={formatForeign(quote.baseCost, currency)} />
              <Row
                label="Charged to customer"
                value={formatForeign(quote.customerCharge, currency)}
              />
              <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                <dt className="font-semibold">Expected spread profit</dt>
                <dd className="text-lg font-extrabold text-primary">
                  {formatSAR(quote.profitSAR)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="font-semibold">Expected profit per deal ({currency})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Deal</th>
                  <th className="px-5 py-3 font-semibold">Value</th>
                  <th className="px-5 py-3 font-semibold">Base rate</th>
                  <th className="px-5 py-3 font-semibold">Customer rate</th>
                  <th className="px-5 py-3 font-semibold">Charged</th>
                  <th className="px-5 py-3 text-right font-semibold">Spread profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perDeal.map(({ deal, quote: row }) => (
                  <tr key={deal.id}>
                    <td className="px-5 py-3">
                      <span className="font-medium">{deal.id}</span>
                      <span className="block text-xs text-muted-foreground">{deal.title}</span>
                    </td>
                    <td className="px-5 py-3">{formatSAR(deal.amount)}</td>
                    <td className="px-5 py-3">{formatRate(row.baseRate)}</td>
                    <td className="px-5 py-3">{formatRate(row.customerRate)}</td>
                    <td className="px-5 py-3">{formatForeign(row.customerCharge, currency)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-primary">
                      {formatSAR(row.profitSAR)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40">
                <tr>
                  <td className="px-5 py-3 font-semibold" colSpan={5}>
                    Total expected spread revenue
                  </td>
                  <td className="px-5 py-3 text-right font-extrabold text-primary">
                    {formatSAR(totalProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold" dir="ltr">
        {value}
      </dd>
    </div>
  );
}
