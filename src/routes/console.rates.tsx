import { createFileRoute } from "@tanstack/react-router";
import { Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SaveBar } from "@/components/site/SaveBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSAR } from "@/lib/demo-data";
import {
  customerRate,
  daysSince,
  rateQuote,
  usePlatformSettings,
  type RateRow,
} from "@/lib/platform-settings";

export const Route = createFileRoute("/console/rates")({
  component: RatesPage,
});

const fmtRate = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: 5 });
const today = () => new Date().toISOString().slice(0, 10);

function RatesPage() {
  const { settings, update, save, discard, dirty } = usePlatformSettings();
  const [sample, setSample] = useState(10000);
  const [draft, setDraft] = useState({ code: "", name: "", baseRate: "", spread: "1.05" });

  const setRows = (rows: RateRow[]) => update({ rates: rows });

  const patch = (code: string, changes: Partial<RateRow>) =>
    setRows(
      settings.rates.map((r) => (r.code === code ? { ...r, ...changes, updatedAt: today() } : r)),
    );

  const addRow = () => {
    const code = draft.code.trim().toUpperCase();
    const baseRate = Number(draft.baseRate);
    if (code.length < 3 || !baseRate) return;
    if (settings.rates.some((r) => r.code === code)) return;
    setRows([
      ...settings.rates,
      {
        code,
        name: draft.name.trim() || code,
        baseRate,
        spread: (Number(draft.spread) || 0) / 100,
        updatedAt: today(),
      },
    ]);
    setDraft({ code: "", name: "", baseRate: "", spread: "1.05" });
  };

  const COOLDOWN = 60 * 60 * 1000;
  const LS = "insight.fx-live-fetch";
  const [nextAt, setNextAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [fetching, setFetching] = useState(false);
  useEffect(() => {
    setNextAt(Number(localStorage.getItem(LS) || 0));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, nextAt - now);
  const countdown = `${String(Math.floor(left / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;

  const fetchLive = async () => {
    setFetching(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/SAR");
      const json = await res.json();
      if (json.result !== "success") throw new Error("Rate source unavailable");
      let n = 0;
      setRows(
        settings.rates.map((r) => {
          const perSar = Number(json.rates?.[r.code]);
          if (!perSar) return r;
          n++;
          return { ...r, baseRate: +(1 / perSar).toFixed(6), updatedAt: today() };
        }),
      );
      const at = Date.now() + COOLDOWN;
      localStorage.setItem(LS, String(at));
      setNextAt(at);
      toast.success(`${n} live rates loaded — press Save changes to publish`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load live rates");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Currency rates</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Base rate is the mid-market rate in SAR per 1 unit. The customer rate adds the
                margin you set here — customers never see the margin.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLive}
                disabled={fetching || left > 0}
              >
                <RefreshCw className={`size-4 ${fetching ? "animate-spin" : ""}`} />
                {fetching
                  ? "Loading live rates…"
                  : left > 0
                    ? `Next live update in ${countdown}`
                    : "Update from live market"}
              </Button>
              <SaveBar dirty={dirty} save={save} discard={discard} />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-semibold">Currency</th>
                  <th className="px-3 py-3 font-semibold">Base rate (SAR)</th>
                  <th className="px-3 py-3 font-semibold">Margin %</th>
                  <th className="px-3 py-3 font-semibold">Customer rate</th>
                  <th className="px-3 py-3 font-semibold">Margin on {formatSAR(sample)}</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settings.rates.map((row) => {
                  const quote = rateQuote(row, sample / row.baseRate);
                  const stale = daysSince(row.updatedAt) >= 1;
                  return (
                    <tr key={row.code}>
                      <td className="px-3 py-3">
                        <span className="font-semibold">{row.code}</span>
                        <span className="block text-xs text-muted-foreground">{row.name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.00001"
                          value={row.baseRate}
                          aria-label={`${row.code} base rate`}
                          onChange={(e) => patch(row.code, { baseRate: Number(e.target.value) })}
                          className="h-9 w-32"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={(row.spread * 100).toFixed(2)}
                          aria-label={`${row.code} margin percent`}
                          onChange={(e) =>
                            patch(row.code, { spread: Number(e.target.value) / 100 })
                          }
                          className="h-9 w-24"
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-primary">
                        {fmtRate(customerRate(row))}
                      </td>
                      <td className="px-3 py-3">{formatSAR(quote.profit)}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className={stale ? "text-warning" : "text-muted-foreground"}>
                          {row.updatedAt}
                          {stale ? " · needs update" : " · current"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${row.code}`}
                          onClick={() => setRows(settings.rates.filter((r) => r.code !== row.code))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Add a currency</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={draft.code}
                  placeholder="QAR"
                  maxLength={4}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={draft.name}
                  placeholder="Qatari riyal"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="base">Base rate (SAR per unit)</Label>
                <Input
                  id="base"
                  type="number"
                  step="0.00001"
                  value={draft.baseRate}
                  placeholder="1.03"
                  onChange={(e) => setDraft({ ...draft, baseRate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="margin">Margin %</Label>
                <Input
                  id="margin"
                  type="number"
                  step="0.01"
                  value={draft.spread}
                  onChange={(e) => setDraft({ ...draft, spread: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <Button className="mt-4" onClick={addRow}>
              <Plus className="size-4" /> Add currency
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Margin preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Change the sample deal value to see the expected margin per currency in the table.
            </p>
            <div className="mt-4">
              <Label htmlFor="sample">Sample deal value (SAR)</Label>
              <Input
                id="sample"
                type="number"
                min={0}
                value={sample}
                onChange={(e) => setSample(Number(e.target.value))}
                className="mt-1.5"
              />
            </div>
            <p className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              Example: a supplier invoice of 10,000 BHD at a base rate of{" "}
              {fmtRate(settings.rates.find((r) => r.code === "BHD")?.baseRate ?? 0)} is quoted to
              the customer at{" "}
              {fmtRate(
                customerRate(
                  settings.rates.find((r) => r.code === "BHD") ?? {
                    code: "BHD",
                    name: "",
                    baseRate: 0,
                    spread: 0,
                    updatedAt: today(),
                  },
                ),
              )}{" "}
              — the difference is platform revenue.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
