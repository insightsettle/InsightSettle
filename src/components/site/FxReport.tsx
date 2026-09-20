import { Banknote, Lock, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deals, formatSAR } from "@/lib/demo-data";
import {
  type FxCurrency,
  SPREAD,
  currencyNames,
  formatForeign,
  formatRate,
  fxCurrencies,
  quoteFx,
} from "@/lib/fx";

/** Internal only. Shows the rate margin and expected revenue — never render on customer pages. */
export function FxReport() {
  const [amount, setAmount] = useState(10000);
  const [currency, setCurrency] = useState<FxCurrency>("BHD");
  const [spreadPct, setSpreadPct] = useState(SPREAD * 100);

  const spread = Math.min(Math.max(spreadPct, 0), 5) / 100;
  const quote = useMemo(() => quoteFx(amount || 0, currency, spread), [amount, currency, spread]);
  const perDeal = useMemo(
    () =>
      deals.map((deal) => ({
        deal,
        quote: quoteFx(deal.amount / quoteFx(1, currency, spread).customerRate, currency, spread),
      })),
    [currency, spread],
  );
  const totalProfit = perDeal.reduce((sum, row) => sum + row.quote.profitSAR, 0);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Currency margin calculator</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Base rate, customer rate, margin, and expected revenue per deal.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
          <Lock className="size-3.5" /> Internal — not visible to customers
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="fx-amount">Deal value (supplier currency)</Label>
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
              <Label htmlFor="fx-currency">Supplier currency</Label>
              <select
                id="fx-currency"
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
            <div>
              <Label htmlFor="fx-spread">Rate margin (%)</Label>
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
              <Row label="Rate margin" value={`${(quote.spread * 100).toFixed(2)}%`} />
              <Row label="Supplier amount" value={formatForeign(quote.amountForeign, currency)} />
              <Row label="Cost at base rate" value={formatSAR(quote.baseCostSAR)} />
              <Row label="Charged to customer" value={formatSAR(quote.customerChargeSAR)} />
              <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                <dt className="font-semibold">Expected margin revenue</dt>
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
            <h3 className="font-semibold">Expected margin per deal (settled in {currency})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Deal</th>
                  <th className="px-5 py-3 font-semibold">Charged (SAR)</th>
                  <th className="px-5 py-3 font-semibold">Base rate</th>
                  <th className="px-5 py-3 font-semibold">Customer rate</th>
                  <th className="px-5 py-3 font-semibold">Supplier amount</th>
                  <th className="px-5 py-3 text-right font-semibold">Margin revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perDeal.map(({ deal, quote: row }) => (
                  <tr key={deal.id}>
                    <td className="px-5 py-3">
                      <span className="font-medium">{deal.id}</span>
                      <span className="block text-xs text-muted-foreground">{deal.title}</span>
                    </td>
                    <td className="px-5 py-3">{formatSAR(row.customerChargeSAR)}</td>
                    <td className="px-5 py-3">{formatRate(row.baseRate)}</td>
                    <td className="px-5 py-3">{formatRate(row.customerRate)}</td>
                    <td className="px-5 py-3">{formatForeign(row.amountForeign, currency)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-primary">
                      {formatSAR(row.profitSAR)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40">
                <tr>
                  <td className="px-5 py-3 font-semibold" colSpan={5}>
                    Total expected margin revenue
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
