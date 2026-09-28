import { Link, createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitFee, type FeePayer } from "@/lib/deals";
import { formatSAR } from "@/lib/demo-data";
import { computeFee, usePlatformSettings } from "@/lib/platform-settings";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Escrow fee calculator | Insight" },
      {
        name: "description",
        content:
          "Work out the exact Insight escrow fee for any deal value and choose who pays it — buyer, seller, or split.",
      },
      { property: "og:title", content: "Insight escrow fee calculator" },
      {
        property: "og:description",
        content: "Transparent escrow pricing with no hidden charges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [amount, setAmount] = useState("25000");
  const [payer, setPayer] = useState<FeePayer>("buyer");
  const value = Number(amount) || 0;
  const { settings } = usePlatformSettings();
  const fee = computeFee(value, settings.fees);
  const sides = splitFee(value, fee.fee, payer);
  const bands = [...settings.fees].sort((a, b) => a.from - b.from);

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-14">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Calculator className="size-3.5" /> Transparent pricing
        </span>
        <h1 className="mt-4 text-4xl font-extrabold">Escrow fee calculator</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          One escrow fee per deal. No subscription, no monthly minimum, and no charge until a deal is
          funded. You decide together whether the buyer, the seller, or both cover it.
        </p>

        <Card className="mt-8">
          <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Deal value (SAR)</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payer">Who pays the fee</Label>
              <select
                id="payer"
                value={payer}
                onChange={(e) => setPayer(e.target.value as FeePayer)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="buyer">Buyer pays</option>
                <option value="seller">Seller pays</option>
                <option value="split">Split 50/50</option>
              </select>
            </div>
            <div className="sm:col-span-2 grid gap-3 rounded-lg bg-secondary p-5 sm:grid-cols-3">
              <Figure label="Escrow fee" value={formatSAR(fee.fee)} note={fee.rule?.label ?? ""} />
              <Figure
                label="Buyer pays"
                value={formatSAR(sides.buyerPays)}
                note="Total transferred into escrow"
              />
              <Figure
                label="Seller receives"
                value={formatSAR(sides.sellerReceives)}
                note="Paid out after release"
              />
            </div>
          </CardContent>
        </Card>

        <h2 className="mt-12 text-2xl font-bold">Fee bands</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-4 py-3">Deal value</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Minimum</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3">{t.label}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {t.mode === "flat" ? "—" : `${(t.percent * 100).toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-3">{t.mode === "percent" ? "—" : formatSAR(t.flat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Arbitration by an external arbitrator is charged separately and only when a case cannot be
          resolved inside Insight. Cross-currency deals include a currency conversion margin shown in
          the final total before you confirm.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth">Create your first deal</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/how-it-works">See how it works</Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold" dir="ltr">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
