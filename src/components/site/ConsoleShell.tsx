import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Coins,
  LayoutDashboard,
  LogOut,
  Percent,
  ScanSearch,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";

import { NotificationBell } from "@/components/site/NotificationBell";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/console", label: "Overview", exact: true, icon: LayoutDashboard },
  { to: "/console/deals", label: "All deals", exact: false, icon: Wallet },
  { to: "/console/users", label: "Members", exact: false, icon: Users },
  { to: "/console/risk", label: "Risk review", exact: false, icon: ScanSearch },
  { to: "/console/rates", label: "Currency rates", exact: false, icon: Coins },
  { to: "/console/fees", label: "Fee rules", exact: false, icon: Percent },
  { to: "/console/disputes", label: "Disputes", exact: false, icon: AlertTriangle },
] as const;

export function ConsoleShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const { user } = useSessionUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-foreground/[0.03]">
      <div className="border-b border-foreground/15 bg-foreground text-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link to="/console" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldAlert className="size-4" />
            </span>
            Insight Operations
          </Link>
          <span className="hidden rounded-full border border-background/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-background/70 sm:inline-block">
            Internal staff console
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-background/70 md:inline">{user?.email}</span>
            <NotificationBell />
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-background/25 bg-transparent text-background hover:bg-background/10 hover:text-background"
            >
              <Link to="/dashboard">Customer view</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-background/80 hover:bg-background/10 hover:text-background"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-2 lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                activeOptions={{ exact: tab.exact }}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-foreground data-[status=active]:text-background"
              >
                <tab.icon className="size-4" />
                {tab.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Platform console
              </p>
              <h1 className="mt-1.5 text-2xl font-extrabold sm:text-3xl">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
