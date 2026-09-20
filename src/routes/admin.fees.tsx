import { createFileRoute } from "@tanstack/react-router";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deals, formatSAR } from "@/lib/demo-data";
import {
  computeFee,
  feeModeLabels,
  usePlatformSettings,
  type FeeMode,
  type FeeRule,
} from "@/lib/platform-settings";

export const Route = createFileRoute("/admin/fees")({
  component: FeesPage,
});

const modes: FeeMode[] = ["percent", "flat", "higher_of"];

function FeesPage() {
  const { settings, update, reset } = usePlatformSettings();
  const [test, setTest] = useState(1200);

  const setRules = (rules: FeeRule[]) => update({ fees: rules });
  const patch = (id: string, changes: Partial<FeeRule>) =>
    setRules(settings.fees.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const addRule = () =>
    setRules([
      ...settings.fees,
      {
        id: `tier-${Date.now()}`,
        label: "New band",
        from: 0,
        to: null,
        mode: "higher_of",
        percent: 0.025,
        flat: 25,
      },
    ]);

  const preview = computeFee(test, settings.fees);
  const revenue = deals.reduce((s, d) => s + computeFee(d.amount, settings.fees).fee, 0);

  return (
    <div className="mt-8 space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Platform fee rules</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Define each value band yourself: charge a percentage, a fixed amount, or whichever is
                higher.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addRule}>
                <Plus className="size-4" /> Add band
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="size-4" /> Reset
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-semibold">Band label</th>
                  <th className="px-3 py-3 font-semibold">From (SAR)</th>
                  <th className="px-3 py-3 font-semibold">To (SAR)</th>
                  <th className="px-3 py-3 font-semibold">Rule</th>
                  <th className="px-3 py-3 font-semibold">Percent %</th>
                  <th className="px-3 py-3 font-semibold">Amount (SAR)</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settings.fees.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-3 py-3">
                      <Input
                        value={rule.label}
                        aria-label="Band label"
                        onChange={(e) => patch(rule.id, { label: e.target.value })}
                        className="h-9 w-44"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        value={rule.from}
                        aria-label="Band lower bound"
                        onChange={(e) => patch(rule.id, { from: Number(e.target.value) })}
                        className="h-9 w-32"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        value={rule.to ?? ""}
                        placeholder="No limit"
                        aria-label="Band upper bound"
                        onChange={(e) =>
                          patch(rule.id, {
                            to: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="h-9 w-32"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={rule.mode}
                        aria-label="Fee rule type"
                        onChange={(e) => patch(rule.id, { mode: e.target.value as FeeMode })}
                        className="h-9 w-56 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {modes.map((mode) => (
                          <option key={mode} value={mode}>
                            {feeModeLabels[mode]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={(rule.percent * 100).toFixed(2)}
                        aria-label="Fee percent"
                        disabled={rule.mode === "flat"}
                        onChange={(e) => patch(rule.id, { percent: Number(e.target.value) / 100 })}
                        className="h-9 w-24"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        value={rule.flat}
                        aria-label="Fee fixed amount"
                        disabled={rule.mode === "percent"}
                        onChange={(e) => patch(rule.id, { flat: Number(e.target.value) })}
                        className="h-9 w-28"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${rule.label}`}
                        onClick={() => setRules(settings.fees.filter((r) => r.id !== rule.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Test a deal value</h2>
            <div className="mt-4">
              <Label htmlFor="test">Deal value (SAR)</Label>
              <Input
                id="test"
                type="number"
                min={0}
                value={test}
                onChange={(e) => setTest(Number(e.target.value))}
                className="mt-1.5"
              />
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <Row label="Matched band" value={preview.rule?.label ?? "None"} />
              <Row
                label="Rule applied"
                value={preview.rule ? feeModeLabels[preview.rule.mode] : "—"}
              />
              <Row label="Fee charged" value={formatSAR(preview.fee)} />
              <Row label="Effective rate" value={`${(preview.effectiveRate * 100).toFixed(2)}%`} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Fee revenue on current deals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recalculated instantly whenever you change a band.
            </p>
            <p className="mt-4 text-3xl font-extrabold">{formatSAR(revenue)}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {deals.map((deal) => {
                const fee = computeFee(deal.amount, settings.fees);
                return (
                  <li key={deal.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {deal.id} · {formatSAR(deal.amount)}
                    </span>
                    <span className="font-semibold">{formatSAR(fee.fee)}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
