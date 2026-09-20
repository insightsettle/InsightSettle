import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { getStaffAccess } from "@/lib/staff.functions";

export const Route = createFileRoute("/console")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Platform console | Insight" },
      {
        name: "description",
        content:
          "Internal Insight console: KPIs, revenue analytics, currency rates, fee rules, and dispute resolution.",
      },
      { property: "og:title", content: "Insight platform console" },
      {
        property: "og:description",
        content: "Internal oversight of volume, revenue, rates, fees, and disputes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const tabs = [
  { to: "/console", label: "Overview", exact: true },
  { to: "/console/rates", label: "Currency rates", exact: false },
  { to: "/console/fees", label: "Fee rules", exact: false },
  { to: "/console/disputes", label: "Dispute resolution", exact: false },
] as const;

function AdminLayout() {
  const checkStaff = useServerFn(getStaffAccess);
  const access = useQuery({ queryKey: ["staff-access"], queryFn: () => checkStaff({}) });

  if (access.isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center text-muted-foreground">
          Checking your access…
        </div>
      </SiteShell>
    );
  }

  if (!access.data?.isStaff) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
            <Lock className="size-3.5" /> Restricted area
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Insight staff only</h1>
          <p className="mt-3 text-muted-foreground">
            This console is reserved for the Insight operations team. Your account does not have
            staff access.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block text-sm text-primary hover:underline">
            Go to my dashboard
          </Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">INSIGHT PLATFORM CONSOLE</p>
            <h1 className="mt-2 text-3xl font-extrabold">Operations, revenue and controls</h1>
            <p className="mt-2 text-muted-foreground">
              Staff view of every deal, fee, currency rate, and dispute.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
            <Lock className="size-3.5" /> Internal access only
          </span>
        </div>

        <nav className="mt-7 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeOptions={{ exact: tab.exact }}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <Outlet />
      </div>
    </SiteShell>
  );
}
