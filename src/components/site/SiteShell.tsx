import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, ShieldAlert } from "lucide-react";
import { useState } from "react";

import logo from "@/assets/insight-wordmark-transparent.png";
import { NotificationBell } from "@/components/site/NotificationBell";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/hooks/use-session";
import { useStaffAccess } from "@/hooks/use-staff";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale";

const nav = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/for-buyers", label: "For buyers" },
  { to: "/for-suppliers", label: "For suppliers" },
  { to: "/pricing", label: "Pricing" },
  { to: "/help", label: "Help" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useSessionUser();
  const { isStaff } = useStaffAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { text } = useLocale();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" aria-label="Insight home" className="flex shrink-0 items-center">
          <img src={logo} alt="Insight" className="h-11 w-auto object-contain" />
        </Link>

        <nav className="ms-auto hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {text(item.label)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <LanguageToggle className="px-2 sm:px-3" />
          {loading ? null : user ? (
            <>
              <NotificationBell />
              {isStaff && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="hidden border-foreground/25 sm:inline-flex"
                >
                  <Link to="/console">
                    <ShieldAlert className="size-4" /> {text("Staff console")}
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/dashboard">{text("My dashboard")}</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={handleSignOut}
              >
                {text("Sign out")}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">{text("Sign in")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>{text("Create account")}</Link>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-card px-4 py-3 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {text(item.label)}
            </Link>
          ))}
          <div className="mt-2 border-t border-border pt-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary"
                >
                  {text("My dashboard")}
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    void handleSignOut();
                  }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground"
                >
                  {text("Sign out")}
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary"
              >
                {text("Sign in")} / {text("Create account")}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { text } = useLocale();
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="flex items-center">
            <img src={logo} alt="Insight" className="h-10 w-auto object-contain" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {text("Secure escrow that protects every payment until delivery is confirmed.")}
          </p>
        </div>
        <FooterCol
          title={text("Platform")}
          links={[
            { to: "/how-it-works", label: text("How it works") },
            { to: "/services", label: text("Services") },
            { to: "/pricing", label: text("Fee calculator") },
            { to: "/roles", label: text("Roles & access") },
            { to: "/help", label: text("Help centre") },
            { to: "/business", label: text("Business") },
            { to: "/security", label: text("Security") },
            { to: "/faq", label: text("FAQ") },
          ]}
        />
        <FooterCol
          title={text("Legal")}
          links={[
            { to: "/terms", label: text("Terms of service") },
            { to: "/privacy", label: text("Privacy policy") },
            { to: "/dispute-policy", label: text("Disputes & refunds") },
          ]}
        />
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        {text(
          "Demo experience — all balances and payment details are sample data. No real funds are moved.",
        )}
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="transition-colors hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className={cn("flex-1", className)}>{children}</main>
      <SiteFooter />
    </div>
  );
}
