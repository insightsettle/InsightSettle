import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, Coins, Lock, Percent, ShieldCheck, Users } from "lucide-react";

import { FxReport } from "@/components/site/FxReport";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { calcFee, deals, formatSAR, monthlyVolume } from "@/lib/demo-data";
import { quoteFx } from "@/lib/fx";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Platform console | Insight" },
      {
        name: "description",
        content:
          "Internal Insight console: transaction volume, escrow fee revenue, currency margin, disputes, and user oversight.",
      },
      { property: "og:title", content: "Insight platform console" },
      {
        property: "og:description",
        content: "Internal oversight of volume, revenue, and disputes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminConsole,
});

function AdminConsole() {
  const totalVolume = deals.reduce((s, d) => s + d.amount, 0);
  const feeRevenue = deals.reduce((s, d) => s + calcFee(d.amount).fee, 0);
  const marginRevenue = deals.reduce(
    (s, d) => s + quoteFx(d.amount / quoteFx(1, "BHD").customerRate, "BHD").profitSAR,
    0,
  );
  const disputes = deals.filter((d) => d.status === "disputed");
  const completed = deals.filter((d) => d.status === "released").length;

  const stats = [
    { label: "Total transaction volume", value: formatSAR(totalVolume), icon: BarChart3 },
    { label: "Escrow fee revenue", value: formatSAR(feeRevenue), icon: Percent },
    { label: "Currency margin revenue", value: formatSAR(marginRevenue), icon: Coins },
    { label: "Open disputes", value: String(disputes.length), icon: AlertTriangle },
  ];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">INSIGHT PLATFORM CONSOLE</p>
            <h1 className="mt-2 text-3xl font-extrabold">Operations and revenue</h1>
            <p className="mt-2 text-muted-foreground">
              Staff view of every deal, fee, dispute, and currency margin.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
            <Lock className="size-3.5" /> Internal access only
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <s.icon className="size-5 text-primary" />
                </div>
                <p className="mt-3 text-2xl font-extrabold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">Sample data</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardContent className="p-0">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-semibold">All deals across the platform</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Deal</th>
                      <th className="px-5 py-3 font-semibold">Parties</th>
                      <th className="px-5 py-3 font-semibold">Value</th>
                      <th className="px-5 py-3 font-semibold">Fee</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deals.map((deal) => (
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
                        <td className="px-5 py-3">{formatSAR(calcFee(deal.amount).fee)}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={deal.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <h2 className="font-semibold">Monthly volume and fees</h2>
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  {monthlyVolume.map((m) => (
                    <li key={m.month} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{m.month}</span>
                      <span className="font-semibold">{formatSAR(m.value)}</span>
                      <span className="text-xs text-primary">+{formatSAR(m.fees)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <h2 className="font-semibold">Oversight</h2>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Verified accounts: 184</li>
                  <li>Pending identity checks: 7</li>
                  <li>Completed deals: {completed}</li>
                  <li>Disputes in mediation: {disputes.length}</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-primary/25 bg-primary/5">
              <CardContent className="p-5">
                <ShieldCheck className="size-5 text-primary" />
                <p className="mt-3 font-semibold">Two revenue streams</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escrow service fees plus the currency rate margin on cross-border settlements.
                  Customers only ever see the final rate quoted to them.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <FxReport />
      </div>
    </SiteShell>
  );
}
