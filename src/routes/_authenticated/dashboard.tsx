import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Banknote,
  BriefcaseBusiness,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { FxCustomerQuote } from "@/components/site/FxCustomerQuote";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionUser } from "@/hooks/use-session";
import { useStaffAccess } from "@/hooks/use-staff";
import { listMyDeals } from "@/lib/deals";
import { activity, dashboardStats, formatSAR } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Insight" },
      {
        name: "description",
        content:
          "Monitor balances, active escrow deals, required actions, and recent account activity.",
      },
      { property: "og:title", content: "Insight escrow dashboard" },
      {
        property: "og:description",
        content: "A clear view of protected funds, deals, and actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSessionUser();
  const { isStaff } = useStaffAccess();
  const { data: myDeals = [] } = useQuery({ queryKey: ["my-deals"], queryFn: listMyDeals });
  const stats = [
    { label: "Available balance", value: formatSAR(dashboardStats.available), icon: Wallet },
    { label: "Funds held", value: formatSAR(dashboardStats.held), icon: ShieldCheck },
    { label: "Active deals", value: String(dashboardStats.activeDeals), icon: BriefcaseBusiness },
    { label: "Open disputes", value: String(dashboardStats.openDisputes), icon: AlertCircle },
  ];
  const firstName = (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0];
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">WORKSPACE OVERVIEW</p>
            <h1 className="mt-2 text-3xl font-extrabold">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-2 text-muted-foreground">Here is what needs your attention today.</p>
          </div>
          <Button asChild>
            <Link to="/deals/new">
              <Plus /> New deal
            </Link>
          </Button>
        </div>

        {isStaff && (
          <Card className="mt-6 border-foreground/20 bg-foreground text-background">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="size-4" /> You are signed in as Insight staff
                </p>
                <p className="mt-1 text-sm text-background/70">
                  This page is the customer view. Platform-wide members, deals, revenue, rates, fees,
                  and disputes live in the internal console.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                <Link to="/console">Open staff console</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-bold">Your saved deals</h2>
          {myDeals.length === 0 ? (
            <Card className="mt-3 border-dashed">
              <CardContent className="p-6 text-sm text-muted-foreground">
                You have no deals yet. Create one and send the invitation link to the other party —
                or open an invitation link you received.
              </CardContent>
            </Card>
          ) : (
            <div className="mt-3 space-y-3">
              {myDeals.map((deal) => (
                <Link
                  key={deal.id}
                  to="/deals/$dealId"
                  params={{ dealId: deal.ref }}
                  className="group grid gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/40 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold group-hover:text-primary">{deal.title}</p>
                      <StatusBadge status={deal.status as never} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deal.ref} ·{" "}
                      {deal.buyer_id && deal.seller_id
                        ? "Both parties joined"
                        : "Waiting for the other party"}
                    </p>
                  </div>
                  <p className="font-bold sm:text-right">
                    {deal.currency} {Number(deal.amount).toLocaleString("en-GB")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
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
          <section>
            <h2 className="mb-4 text-xl font-bold">Recent activity</h2>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {activity.map((item) => (
                  <div key={item.at + item.text} className="p-4">
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.at}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="mt-4 border-primary/25 bg-primary/5">
              <CardContent className="p-5">
                <Banknote className="size-5 text-primary" />
                <p className="mt-3 font-semibold">Paying in another currency?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your riyal total is fixed at the rate shown when you fund the deal — no surprises
                  later.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
        <FxCustomerQuote />
      </div>
    </SiteShell>
  );
}
