import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PROVISIONAL_SCHEDULE, feeUsd, type FeeSchedule } from "@/lib/fees";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/console/fees")({
  head: () => ({ meta: [
    { title: "Fee rules | Insight staff console" },
    { name: "description", content: "Review Insight fee rules and provisional bands." },
    { property: "og:title", content: "Fee rules | Insight staff console" },
    { property: "og:description", content: "Review Insight fee rules and provisional bands." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: FeesPage,
});

type Band = { id: string; label: string; from: number; to: number | null; percent: number };

async function loadBands() {
  const { data, error } = await supabase
    .from("fee_rules")
    .select("id, label, amount_from, amount_to, percent, min_fee, max_fee, provisional")
    .eq("currency", "BHD") // D-69: the live schedule is in Bahraini dinars
    .order("amount_from");
  if (error) throw error;
  return data ?? [];
}

function FeesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["bhd-fee-bands"], queryFn: loadBands });
  const [bands, setBands] = useState<Band[]>([]);
  const [minFee, setMinFee] = useState(6);
  const [maxFee, setMaxFee] = useState<number | null>(1300);
  const [test, setTest] = useState(4000);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setBands(q.data.map((r) => ({ id: r.id, label: r.label, from: Number(r.amount_from), to: r.amount_to == null ? null : Number(r.amount_to), percent: Number(r.percent) })));
    if (q.data[0]) {
      setMinFee(Number(q.data[0].min_fee ?? 0));
      setMaxFee(q.data[0].max_fee == null ? null : Number(q.data[0].max_fee));
    }
  }, [q.data]);

  const schedule: FeeSchedule = bands.length ? { currency: "BHD", bands, minFee, maxFee } : PROVISIONAL_SCHEDULE;
  const provisional = (q.data ?? []).some((r) => r.provisional);
  const patch = (id: string, changes: Partial<Band>) => setBands(bands.map((b) => (b.id === id ? { ...b, ...changes } : b)));

  async function save() {
    setMsg(null);
    for (const b of bands) {
      const { error } = await supabase
        .from("fee_rules")
        .update({ label: b.label, amount_from: b.from, amount_to: b.to, percent: b.percent, min_fee: minFee, max_fee: maxFee })
        .eq("id", b.id);
      if (error) return setMsg(error.message);
    }
    setMsg("Saved. New quotes use these bands.");
    qc.invalidateQueries({ queryKey: ["bhd-fee-bands"] });
  }

  const fee = feeUsd(test, schedule);

  return (
    <div className="mt-8 space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                Platform fee bands (BHD){provisional && <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">Provisional</span>}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each band's percentage applies only to the part of the deal value inside that band, so the fee never falls as the value rises. The deal value is converted to BHD at the quote's provider rate, and the fee is charged in the deal currency.
              </p>
            </div>
            <Button size="sm" onClick={save}>Save bands</Button>
          </div>
          {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-semibold">Band label</th>
                  <th className="px-3 py-3 font-semibold">From (BHD)</th>
                  <th className="px-3 py-3 font-semibold">To (BHD)</th>
                  <th className="px-3 py-3 font-semibold">Percent %</th>
                </tr>
              </thead>
              <tbody>
                {bands.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-2"><Input value={b.label} onChange={(e) => patch(b.id, { label: e.target.value })} /></td>
                    <td className="px-3 py-2"><Input type="number" value={b.from} onChange={(e) => patch(b.id, { from: Number(e.target.value) })} /></td>
                    <td className="px-3 py-2"><Input type="number" value={b.to ?? ""} placeholder="No limit" onChange={(e) => patch(b.id, { to: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                    <td className="px-3 py-2"><Input type="number" step="0.01" value={b.percent} onChange={(e) => patch(b.id, { percent: Number(e.target.value) })} /></td>
                  </tr>
                ))}
                {bands.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">{q.isLoading ? "Loading…" : "No BHD fee bands yet."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid max-w-md gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="minfee">Minimum fee (BHD)</Label>
              <Input id="minfee" type="number" value={minFee} onChange={(e) => setMinFee(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="maxfee">Fee cap (BHD)</Label>
              <Input id="maxfee" type="number" value={maxFee ?? ""} placeholder="No cap" onChange={(e) => setMaxFee(e.target.value === "" ? null : Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold">Try a deal value</h2>
          <Label htmlFor="test" className="mt-3 block">Deal value (BHD)</Label>
          <Input id="test" type="number" className="mt-1 max-w-xs" value={test} onChange={(e) => setTest(Number(e.target.value))} />
          <p className="mt-3 text-sm">
            Fee <b dir="ltr">{formatMoney(fee, "BHD")}</b> · effective rate {test > 0 ? ((fee / test) * 100).toFixed(2) : "0.00"}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
