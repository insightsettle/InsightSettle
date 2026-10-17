import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";

import { formatMoney } from "@/lib/money";
import { listMyDeals } from "@/lib/deals";
import { formatSAR } from "@/lib/demo-data";
import { listNotifications } from "@/lib/notifications";
import { useLocale } from "@/lib/locale";

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
  const { locale, text } = useLocale();
  const { user } = useSessionUser();
  const { isStaff } = useStaffAccess();
  const navigate = useNavigate();
  useEffect(() => {
    if (isStaff) navigate({ to: "/console", replace: true });
  }, [isStaff, navigate]);
  const { data: myDeals = [] } = useQuery({ queryKey: ["my-deals"], queryFn: listMyDeals });
  const { data: myActivity = [] } = useQuery({
    queryKey: ["my-activity"],
    queryFn: () => listNotifications(10),
  });
  const uid = user?.id;
  const sum = (xs: typeof myDeals) => xs.reduce((a, d) => a + Number(d.amount ?? 0), 0);
  const heldStates = ["held", "delivered", "under_review", "disputed"];
  const asBuyer = myDeals.filter((d) => d.buyer_id === uid);
  const asSeller = myDeals.filter((d) => d.seller_id === uid);
  const stats = [
    { label: "Funds held", value: formatSAR(sum(myDeals.filter((d) => heldStates.includes(d.status)))), icon: ShieldCheck },
    { label: "Awaiting settlement", value: formatSAR(sum(asSeller.filter((d) => ["delivered", "under_review"].includes(d.status)))), icon: Wallet },
    { label: "Active deals", value: String(myDeals.filter((d) => !["released", "refunded", "partially_refunded", "cancelled", "rejected"].includes(d.status)).length), icon: BriefcaseBusiness },
    { label: "Open disputes", value: String(myDeals.filter((d) => d.status === "disputed").length), icon: AlertCircle },
  ];
  const buckets = [
    { label: "Awaiting my payment", n: asBuyer.filter((d) => d.status === "pending_funding").length },
    { label: "Awaiting my inspection", n: asBuyer.filter((d) => d.status === "delivered").length },
    { label: "Ready to ship", n: asSeller.filter((d) => d.status === "held" && !d.shipping_tracking).length },
    { label: "Awaiting terms response", n: myDeals.filter((d) => d.terms_status === "proposed" && d.created_by !== uid).length },
  ];
  const firstName = (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0];
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">{text("Workspace overview", "نظرة عامة على مساحة العمل")}</p>
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
                  This page is the customer view. Platform-wide members, deals, revenue, rates,
                  fees, and disputes live in the internal console.
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

        {user && !user.email_confirmed_at && (
          <Card className="mt-6 border-warning/40 bg-warning-subtle">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="size-5 shrink-0 text-warning" />
              <p className="text-sm">
                Please confirm your email address. Open the confirmation link we sent to your
                inbox to activate all account features.
              </p>
            </CardContent>
          </Card>
        )}

        <VerificationCard />

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {buckets.map((b) => (
            <div key={b.label} className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{b.n}</p>
            </div>
          ))}
        </div>

        <section id="saved-deals" className="mt-8">
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
                  className="group grid gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 sm:grid-cols-[1fr_auto] sm:items-center"
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
                  <p className="font-semibold tabular-nums sm:text-end">
                    {formatMoney(Number(deal.amount), deal.currency)}
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
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="grid size-8 place-items-center rounded-lg bg-accent"><s.icon className="size-4 text-primary" /></span>
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <h2 className="mb-4 text-xl font-bold">Recent activity</h2>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {myActivity.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No activity yet. It will appear here once you create or join a deal.
                  </p>
                )}
                {myActivity.map((item) => (
                  <div key={item.id} className="p-4">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.body && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString(
                        locale === "ar" ? "ar-SA" : "en-GB",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </p>
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

function VerificationCard() {
  const { data } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .maybeSingle();
      return profile;
    },
  });
  const status = data?.verification_status ?? "pending";
  if (status === "verified") return null;
  return (
    <Card className="mt-6 border-warning/40 bg-warning/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 text-warning" /> Verify your identity
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "rejected"
              ? "Your last submission was not accepted. Upload a clearer document to continue."
              : "Upload an ID or commercial register so you can fund and receive payouts without delays."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/verification">Upload documents</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
