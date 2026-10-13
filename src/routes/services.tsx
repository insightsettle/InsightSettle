import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRightLeft, Check, CircleDollarSign, Layers3, Scale } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatSAR } from "@/lib/demo-data";
import { computeFee, usePlatformSettings } from "@/lib/platform-settings";


export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services, fees, and currency conversion | Insight" },
      {
        name: "description",
        content:
          "Explore Insight escrow services, tiered transaction fees, and transparent currency conversion spreads.",
      },
      { property: "og:title", content: "Insight services and fees" },
      {
        property: "og:description",
        content: "Tiered escrow fees and transparent currency conversion.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});
const services = [
  {
    icon: CircleDollarSign,
    t: "Single-payment escrow",
    d: "Funds are held by a licensed payment provider. Insight runs the deal rules and keeps the record.",
    points: ["Full-value protection", "Defined review window", "Receipt and invoice"],
  },
  {
    icon: Scale,
    t: "Dispute mediation",
    d: "Structured evidence review and a recorded decision under platform policy.",
    points: ["AI-assisted triage", "Response period", "Documented outcome"],
  },
  {
    icon: ArrowRightLeft,
    t: "Cross-border payments",
    d: "A licensed payment provider handles cross-border payments; Insight records the deal and the rate shown before funding.",
    points: ["One clear rate before funding", "Riyal total fixed at funding", "Settlement summary"],
  },
];
function Page() {
  const [amount, setAmount] = useState(18000);
  const { settings } = usePlatformSettings();
  const { fee, effectiveRate: rate } = computeFee(amount, settings.fees);
  const bands = [...settings.fees].sort((a, b) => a.from - b.from);
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm font-semibold text-primary">SERVICES & FEES</p>
        <h1 className="mt-2 text-4xl font-extrabold">Transparent pricing, before you fund.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Insight charges a tiered transaction fee. Cross-border deals are converted at the rate
          shown before you fund, and mediation has no separate fee.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {services.map((s) => (
            <Card key={s.t}>
              <CardContent className="p-6">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <s.icon />
                </span>
                <h2 className="mt-4 text-lg font-bold">{s.t}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
                <ul className="mt-4 space-y-2">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm">
                      <Check className="size-4 text-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[26rem] text-left text-sm">
              <thead className="bg-muted">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th>Deal value</th>
                  <th>Fee rate</th>
                  <th>Minimum</th>
                </tr>
              </thead>
              <tbody>
                {bands.map((t) => (
                  <tr key={t.id} className="border-t [&>td]:px-4 [&>td]:py-3">
                    <td className="text-muted-foreground">{t.label}</td>
                    <td className="font-bold text-primary">
                      {t.mode === "flat" ? "—" : `${(t.percent * 100).toFixed(2)}%`}
                    </td>
                    <td>{t.mode === "percent" ? "—" : formatSAR(t.flat)}</td>
                  </tr>
                ))}
                <tr className="border-t [&>td]:px-4 [&>td]:py-3">
                  <td>Currency conversion</td>
                  <td className="font-bold text-primary">No extra fee</td>
                  <td>Rate shown before funding</td>
                </tr>
                <tr className="border-t [&>td]:px-4 [&>td]:py-3">
                  <td>Mediation</td>
                  <td className="font-bold text-primary">No extra fee</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Card className="glow-mint border-primary/25">
            <CardContent className="p-6">
              <h2 className="font-bold">Fee calculator</h2>
              <div className="mt-5 space-y-3">
                <Label htmlFor="amount">Deal value (SAR)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={100}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                />
                <Slider
                  value={[Math.min(amount, 200000)]}
                  min={100}
                  max={200000}
                  step={100}
                  onValueChange={(v) => setAmount(v[0] ?? 0)}
                />
              </div>
              <dl className="mt-6 space-y-3 border-t pt-5 text-sm">
                <Row k="Deal value" v={formatSAR(amount)} />
                <Row k="Transaction fee" v={formatSAR(fee)} strong />
                <Row k="Seller settlement" v={formatSAR(Math.max(0, amount - fee))} />
              </dl>
              <p className="mt-4 text-xs text-warning">
                Indicative pricing for this demo; final pricing to be confirmed
              </p>
              <Button asChild className="mt-5 w-full">
                <Link to="/dashboard">Create a deal</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={strong ? "text-lg font-extrabold text-primary" : "font-semibold"}>{v}</dd>
    </div>
  );
}
