import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Coins,
  Gauge,
  Percent,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { FxReport } from "@/components/site/FxReport";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { disputeCases } from "@/lib/dispute-cases";
import {
  computeFee,
  daysSince,
  rateQuote,
  usePlatformSettings,
  type RateRow,
} from "@/lib/platform-settings";
import { deals, formatSAR, monthlyVolume, statusLabels, type DealStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/console/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { settings } = usePlatformSettings();

  const totalVolume = deals.reduce((s, d) => s + d.amount, 0);
  const feeRevenue = deals.reduce((s, d) => s + computeFee(d.amount, settings.fees).fee, 0);

  const bhd: RateRow | undefined = settings.rates.find((r) => r.code === "BHD");
  const marginRevenue = bhd
    ? deals.reduce((s, d) => s + rateQuote(bhd, d.amount / bhd.baseRate).profit, 0)
    : 0;
  const totalRevenue = feeRevenue + marginRevenue;

  const heldFunds = deals
    .filter((d) => ["held", "delivered", "under_review", "disputed"].includes(d.status))
    .reduce((s, d) => s + d.amount, 0);
  const released = deals.filter((d) => d.status === "released").length;
  const openDisputes = disputeCases.filter((c) => c.stage !== "resolved").length;
  const escalated = disputeCases.filter((c) => c.stage === "escalated").length;
  const avgDeal = totalVolume / deals.length;
  const takeRate = totalRevenue / totalVolume;
  const disputeRate = openDisputes / deals.length;
  const successRate = released / deals.length;
  const staleRates = settings.rates.filter((r) => daysSince(r.updatedAt) >= 1).length;

  const kpis = [
    { label: "Total transaction volume", value: formatSAR(totalVolume), icon: BarChart3 },
    { label: "Total revenue", value: formatSAR(totalRevenue), icon: TrendingUp },
    { label: "Escrow fee revenue", value: formatSAR(feeRevenue), icon: Percent },
    { label: "Currency margin revenue", value: formatSAR(marginRevenue), icon: Coins },
    { label: "Funds currently held", value: formatSAR(heldFunds), icon: Wallet },
    { label: "Blended take rate", value: `${(takeRate * 100).toFixed(2)}%`, icon: Gauge },
    { label: "Average deal value", value: formatSAR(avgDeal), icon: BarChart3 },
    { label: "Average release time", value: "3.4 days", icon: Clock },
  ];

  const secondary = [
    { label: "Successful releases", value: `${(successRate * 100).toFixed(0)}%` },
    { label: "Dispute rate", value: `${(disputeRate * 100).toFixed(0)}%` },
    { label: "Open disputes", value: String(openDisputes) },
    { label: "With external arbitrator", value: String(escalated) },
    { label: "Verified accounts", value: "184" },
    { label: "Pending identity checks", value: "7" },
    { label: "Rates needing a daily update", value: String(staleRates) },
    { label: "Active fee tiers", value: String(settings.fees.length) },
  ];

  const statusCounts = deals.reduce(
    (acc, deal) => {
      acc[deal.status] = (acc[deal.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<DealStatus, number>,
  );

  const peak = Math.max(...monthlyVolume.map((m) => m.value));

  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <k.icon className="size-5 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-extrabold">{k.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">Sample data</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {secondary.map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-lg font-bold">{s.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <h2 className="font-semibold">Monthly volume and fee revenue</h2>
            </div>
            <ul className="mt-5 space-y-3">
              {monthlyVolume.map((m) => (
                <li key={m.month} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{m.month}</span>
                    <span className="font-semibold">
                      {formatSAR(m.value)}{" "}
                      <span className="text-xs font-medium text-primary">
                        +{formatSAR(m.fees)} fees
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(m.value / peak) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-primary" />
                <h2 className="font-semibold">Deal status distribution</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {(Object.keys(statusCounts) as DealStatus[]).map((status) => (
                  <li key={status} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{statusLabels[status]}</span>
                    <span className="font-semibold">{statusCounts[status]}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h2 className="font-semibold">Revenue mix</h2>
              </div>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-primary"
                  style={{ width: `${(feeRevenue / totalRevenue) * 100}%` }}
                />
                <div
                  className="bg-warning"
                  style={{ width: `${(marginRevenue / totalRevenue) * 100}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Escrow fees {((feeRevenue / totalRevenue) * 100).toFixed(0)}% · currency margin{" "}
                {((marginRevenue / totalRevenue) * 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="p-5">
              <ShieldCheck className="size-5 text-primary" />
              <p className="mt-3 font-semibold">Controls are editable</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Update currency rates daily and define fee tiers by percentage, fixed amount, or
                whichever is higher.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">All deals across the platform</h2>
            <span className="text-xs text-muted-foreground">
              Fees calculated with the current rules
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Deal</th>
                  <th className="px-5 py-3 font-semibold">Parties</th>
                  <th className="px-5 py-3 font-semibold">Value</th>
                  <th className="px-5 py-3 font-semibold">Fee</th>
                  <th className="px-5 py-3 font-semibold">Effective</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deals.map((deal) => {
                  const fee = computeFee(deal.amount, settings.fees);
                  return (
                    <tr key={deal.id}>
                      <td className="px-5 py-3">
                        <Link
                          to="/deals/$dealId"
                          params={{ dealId: deal.id }}
                          className="font-medium hover:text-primary"
                        >
                          {deal.id}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{deal.title}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {deal.buyer} → {deal.seller}
                      </td>
                      <td className="px-5 py-3">{formatSAR(deal.amount)}</td>
                      <td className="px-5 py-3">{formatSAR(fee.fee)}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {(fee.effectiveRate * 100).toFixed(2)}%
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={deal.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            <h2 className="font-semibold">Disputes needing attention</h2>
            <Link to="/console/disputes" className="ml-auto text-sm text-primary hover:underline">
              Open dispute resolution
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {disputeCases
              .filter((c) => c.stage !== "resolved")
              .map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{c.id}</span>{" "}
                    <span className="text-muted-foreground">
                      {c.dealId} — {c.reason}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatSAR(c.amount)} · opened {daysSince(c.openedAt)} day(s) ago
                  </span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      <FxReport />
    </div>
  );
}
