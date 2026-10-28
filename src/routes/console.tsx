import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "@/components/icons";

import { ConsoleShell } from "@/components/site/ConsoleShell";
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

  // Staff sign in with email and password; access is limited by staff level and every action is audited (founder decision, 24 Oct: no two-step verification).
  return (
    <ConsoleShell
      title="Operations, revenue and controls"
      subtitle="Staff view of every member, deal, fee, currency rate, and dispute."
    >
      {/* Each console page's sections rise in one after another (presentation only). */}
      <div className="reveal-deep min-w-0"><Outlet /></div>
    </ConsoleShell>
  );
}
