import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { SiteNotice } from "@/components/site/SiteNotice";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Search, Settings, LogOut } from "@/components/icons";
import { ConsoleSearch } from "@/components/site/ConsoleSearch";
import { BrandLogo } from "@/components/site/BrandLogo";
import { createContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { NotificationBell } from "@/components/site/NotificationBell";
import { useSessionUser } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/locale";

/** True inside the signed-in app chrome, so pages that also use SiteShell never add the public header there. */
export const InAppShell = createContext(false);

export const shellNavClass = "group/nav relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-primary active:scale-[0.98] [&>svg]:transition-transform [&>svg]:duration-200 hover:[&>svg]:scale-110 before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:scale-y-0 before:rounded-full before:bg-primary before:transition-transform before:duration-300 data-[status=active]:bg-accent data-[status=active]:text-primary data-[status=active]:font-medium data-[status=active]:before:scale-y-100";

export function AppShell({ children, navigation, title, staff = false, mobileNav }: { children: ReactNode; navigation: ReactNode; title: string; staff?: boolean; mobileNav?: ReactNode }) {
  const { text, direction } = useLocale();
  const { user } = useSessionUser();
  const [open, setOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Soft fade between pages (opacity only, so sticky and fixed children keep their position).
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const name = typeof user?.user_metadata?.["full_name"] === "string" ? user.user_metadata["full_name"] : user?.email?.split("@")[0] ?? text("Account");
  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { setSignOutError(text("Sign out failed. Please try again.", "تعذّر تسجيل الخروج. حاول مرة أخرى.")); return; }
    navigate({ to: "/auth", replace: true });
  }
  const sidebar = (
    <div className="flex min-h-full flex-col p-5" data-no-localize>
      <Link to={staff ? "/console" : "/dashboard"} className="mb-6 flex items-center" aria-label="Insight">
        <BrandLogo className="h-11 w-auto" />
      </Link>
      {staff && <span className="mb-5 w-fit rounded-md bg-brand-strong px-2.5 py-1 text-xs font-medium text-primary-foreground">{text("Staff console")}</span>}
      <div onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>{navigation}</div>
      <div className="mt-auto pt-8">
        <div className="rounded-lg bg-secondary p-4">
          <Link to="/help" className="text-sm font-medium text-primary">{text("Need help?")}</Link>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{text("Support is available Sunday–Thursday, 9am–6pm Riyadh time.")}</p>
        </div>
        <Button asChild variant="ghost" className="mt-3 h-10 w-full justify-start text-muted-foreground"><Link to={staff ? "/console" : "/verification"}><Settings />{text("Settings")}</Link></Button>
        <Button variant="ghost" className="h-10 w-full justify-start text-muted-foreground" onClick={handleSignOut}><LogOut />{text("Sign out")}</Button>
      </div>
    </div>
  );
  return (
    <div className="app-shell min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[264px] overflow-y-auto border-e border-sidebar-border bg-sidebar lg:block">{sidebar}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={direction === "rtl" ? "right" : "left"} className="w-[264px] overflow-y-auto bg-sidebar p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">{text("Navigation")}</SheetTitle>{sidebar}
        </SheetContent>
      </Sheet>
      <div className="app-column min-w-0 lg:ms-[264px]">
        <div data-no-localize className="flex items-center justify-center gap-2 bg-brand-strong px-4 py-2 text-center text-xs text-white"><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-brand-mint" />{text("Demo: the payment provider is simulated and no real money moves.", "نسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية.")}</div>
        <SiteNotice />
        <header data-no-localize className="app-topbar flex h-[68px] items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setOpen(true)} aria-label={text("Open navigation")}><Menu /></Button>
          <p className="min-w-0 truncate text-lg font-bold">{text(title)}</p>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            {staff ? <ConsoleSearch /> : <div className="relative hidden w-[260px] xl:block"><Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={text("Search")} placeholder={text("Search by deal ref or party…")} className="h-10 bg-background ps-9 text-sm" /></div>}
            <NotificationBell /><LanguageToggle />
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-subtle text-sm font-medium text-gold-foreground" data-no-localize>{name.charAt(0)}</span>
            <div className="hidden max-w-36 sm:block"><p className="truncate text-xs font-medium" data-no-localize>{name}</p><p className="text-xs text-muted-foreground">{text(staff ? "Staff console" : "Customer view")}</p></div>
          </div>
        </header>
        <main key={pathname} className={`app-content min-w-0 p-4 animate-in fade-in duration-300 lg:p-8 ${mobileNav ? "pb-32 lg:pb-8" : ""}`}>{signOutError && <p data-no-localize role="alert" className="mb-4 text-sm text-destructive">{signOutError}</p>}<InAppShell.Provider value={true}>{children}</InAppShell.Provider></main>
        {!staff && mobileNav}
      </div>
    </div>
  );
}