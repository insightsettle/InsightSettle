import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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

import { StatusBadge } from "@/components/site/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { getPlatformSummary } from "@/lib/admin.functions";
import { formatSAR, statusLabels, type DealStatus } from "@/lib/demo-data";
import { formatMoney } from "@/lib/money";
import { daysSince, usePlatformSettings } from "@/lib/platform-settings";

export const Route = createFileRoute("/console/")({
  component: AdminOverview,
});

const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(0)}%` : "—");

function AdminOverview() {
  const { settings } = usePlatformSettings();
  const fetchSummary = useServerFn(getPlatformSummary);
  const summary = useQuery({ queryKey: ["platform-summary"], queryFn: () => fetchSummary({}) });
  const live = summary.data;
  const v = (fn: (l: NonNullable<typeof live>) => string) => (live ? fn(live) : "…");

  const totalRevenue = live ? live.feeRevenue + live.marginRevenue : 0;
  const staleRates = settings.rates.filter((r) => r.active !== false && daysSince(r.updatedAt) >= 1).length;

  const kpis = [
    { label: "Funded volume", value: v((l) => formatSAR(l.fundedVolume)), icon: BarChart3 },
    { label: "Total revenue", value: v(() => formatSAR(totalRevenue)), icon: TrendingUp },
    { label: "Escrow fee revenue", value: v((l) => formatSAR(l.feeRevenue)), icon: Percent },
    { label: "Currency margin revenue", value: v((l) => formatSAR(l.marginRevenue)), icon: Coins },
    { label: "Funds currently held", value: v((l) => formatSAR(l.heldFunds)), icon: Wallet },
    {
      label: "Blended take rate",
      value: v((l) => (l.fundedVolume > 0 ? `${((totalRevenue / l.fundedVolume) * 100).toFixed(2)}%` : "—")),
      icon: Gauge,
    },
    {
      label: "Average deal value",
      value: v((l) => (l.dealCount ? formatSAR(l.dealVolume / l.dealCount) : "—")),
      icon: BarChart3,
    },
    {
      label: "Average release time",
      value: v((l) => (l.avgReleaseDays === null ? "—" : `${l.avgReleaseDays.toFixed(1)} days`)),
      icon: Clock,
    },
  ];

  const secondary = [
    { label: "Successful releases", value: v((l) => pct(l.releasedCount, l.dealCount)) },
    { label: "Dispute rate", value: v((l) => pct(l.openDisputes, l.dealCount)) },
    { label: "Open disputes", value: v((l) => String(l.openDisputes)) },
    { label: "Disputes under review", value: v((l) => String(l.disputesUnderReview)) },
    { label: "Rates needing a daily update", value: String(staleRates) },
    { label: "Active fee tiers", value: String(settings.fees.length) },
  ];

  const monthly = live?.monthly ?? [];
  const peak = Math.max(1, ...monthly.map((m) => m.value));

  return (
    <div className="mt-8 space-y-8">
      <Card className="border-foreground/20 bg-foreground text-background">
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-background/60">
            Live platform data
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Registered members", value: v((l) => String(l.userCount)) },
              { label: "Pending identity checks", value: v((l) => String(l.pendingKyc)) },
              { label: "Deals created", value: v((l) => String(l.dealCount)) },
              { label: "Deal volume", value: v((l) => formatSAR(l.dealVolume)) },
              { label: "Deals in dispute", value: v((l) => String(l.disputed)) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-background/10 p-4">
                <p className="text-xs text-background/70">{item.label}</p>
                <p className="mt-1 text-xl font-extrabold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/console/users" className="font-semibold text-primary hover:underline">
              Manage members →
            </Link>
            <Link to="/console/deals" className="font-semibold text-primary hover:underline">
              Review all deals →
            </Link>
            <Link to="/console/risk" className="font-semibold text-primary hover:underline">
              Run risk screening →
            </Link>
          </div>
        </CardContent>
      </Card>

      {summary.isError && <p className="text-sm text-destructive">Could not load live data.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <k.icon className="size-5 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-extrabold">{k.value}</p>
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
            {monthly.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">No confirmed payments yet.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {monthly.map((m) => (
                  <li key={m.month} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground" dir="ltr">{m.month}</span>
                      <span className="font-semibold">
                        {formatSAR(m.value)}{" "}
                        <span className="text-xs font-medium text-primary">+{formatSAR(m.fees)} fees</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(m.value / peak) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
                {Object.entries(live?.statusCounts ?? {}).map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {statusLabels[status as DealStatus] ?? status.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
                {live && Object.keys(live.statusCounts).length === 0 && (
                  <li className="text-muted-foreground">No deals yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h2 className="font-semibold">Revenue mix</h2>
              </div>
              {live && totalRevenue > 0 ? (
                <>
                  <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                    <div className="bg-primary" style={{ width: `${(live.feeRevenue / totalRevenue) * 100}%` }} />
                    <div className="bg-warning" style={{ width: `${(live.marginRevenue / totalRevenue) * 100}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Escrow fees {((live.feeRevenue / totalRevenue) * 100).toFixed(0)}% · currency margin{" "}
                    {((live.marginRevenue / totalRevenue) * 100).toFixed(0)}%
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No revenue recorded yet.</p>
              )}
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
            <h2 className="font-semibold">Latest deals across the platform</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-start text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-start font-semibold">Deal</th>
                  <th className="px-5 py-3 text-start font-semibold">Value</th>
                  <th className="px-5 py-3 text-start font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(live?.recentDeals ?? []).map((deal) => (
                  <tr key={deal.ref}>
                    <td className="px-5 py-3">
                      <Link
                        to="/console/deals/$dealId"
                        params={{ dealId: deal.ref }}
                        className="font-medium hover:text-primary"
                      >
                        {deal.ref}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{deal.title}</span>
                    </td>
                    <td className="px-5 py-3" dir="ltr">
                      {formatMoney(deal.amount, deal.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={deal.status as DealStatus} />
                    </td>
                  </tr>
                ))}
                {live && live.recentDeals.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-5 text-muted-foreground">No deals yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            <h2 className="font-semibold">Open disputes</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {(live?.openDisputeList ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{c.ref}</span>{" "}
                  <span className="text-muted-foreground">— {c.reason}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  opened {daysSince(c.createdAt)} day(s) ago
                </span>
              </li>
            ))}
            {live && live.openDisputeList.length === 0 && (
              <li className="text-muted-foreground">No open disputes.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
