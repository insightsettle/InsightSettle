import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Menu, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useState } from "react";

import { NotificationBell } from "@/components/site/NotificationBell";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/hooks/use-session";
import { useStaffAccess } from "@/hooks/use-staff";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale";

const nav = [
  { to: "/", label: "Home", ar: "الرئيسية", hash: "" },
  { to: "/how-it-works", label: "How it works", ar: "كيف تعمل؟", hash: "" },
  { to: "/for-buyers", label: "For buyers", ar: "للمشترين", hash: "" },
  { to: "/for-suppliers", label: "For suppliers", ar: "للموردين", hash: "" },
  { to: "/pricing", label: "Pricing", ar: "الرسوم", hash: "" },
  { to: "/help", label: "Help", ar: "المساعدة", hash: "" },
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
    <header data-no-localize className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" aria-label="Insight home" className="flex shrink-0 items-center">
          <BrandLogo className="h-10 w-auto" />
        </Link>

        <nav className="ms-auto hidden items-center gap-1 xl:flex">
          {nav.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              hash={item.hash}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {text(item.label, item.ar)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 xl:ms-0">
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
              <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">{text("Sign in", "تسجيل الدخول")}</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "signup" }}>{text("Create account", "إنشاء حساب")}</Link>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            className="xl:hidden"
            aria-label={text("Open navigation", "فتح القائمة")}
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-card px-4 py-3 xl:hidden">
          {nav.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              hash={item.hash}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {text(item.label, item.ar)}
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
                <Button variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    void handleSignOut();
                  }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground"
                >
                  {text("Sign out")}
                </Button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary"
              >
                {text("Sign in")} / {text("Create account", "إنشاء حساب")}
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
  return <footer data-no-localize className="border-t border-primary-foreground/15 bg-brand-strong text-primary-foreground">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div><Link to="/" aria-label="Insight home" className="inline-flex"><BrandLogo tone="light" className="h-14 w-auto" /></Link><p className="mt-4 max-w-xs text-sm leading-7 text-primary-foreground/75">{text("Clear rules for individuals and businesses across the Gulf, and from the Gulf to the world.", "قواعد واضحة لصفقات الأفراد والشركات بين دول الخليج، ومن الخليج إلى العالم.")}</p></div>
      <FooterCol title={text("Product", "المنتج")} links={[{to:"/how-it-works",label:text("How it works","كيف تعمل؟")},{to:"/for-buyers",label:text("For buyers","للمشترين")},{to:"/for-suppliers",label:text("For suppliers","للموردين")},{to:"/pricing",label:text("Pricing","الرسوم")}]} />
      <FooterCol title={text("Company", "الشركة")} links={[{to:"/business",label:text("Business","الأعمال")},{to:"/security",label:text("Security","الأمان")},{to:"/help",label:text("Help","المساعدة")},{to:"/faq",label:text("FAQ","الأسئلة الشائعة")}]} />
      <FooterCol title={text("Legal", "قانوني")} links={[{to:"/terms",label:text("Terms of service","شروط الخدمة")},{to:"/privacy",label:text("Privacy policy","سياسة الخصوصية")},{to:"/dispute-policy",label:text("Disputes & refunds","النزاعات والاسترداد")}]} />
    </div><div className="border-t border-primary-foreground/15 px-5 py-6"><p className="mx-auto max-w-7xl text-xs leading-6 text-primary-foreground/70">{text("Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.", "نسخة تجريبية لخدمة الضمان: مزوّد الدفع محاكى ولا تُحوَّل أي أموال حقيقية. عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، وتدير إنسايت قواعد الصفقة وتحفظ سجلها.")}</p></div>
  </footer>;
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="transition-colors hover:text-primary-foreground">
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
  const { pathname } = useLocation();
  // Client chrome is owned by the authenticated parent; keep public chrome unchanged.
  if (["/dashboard", "/disputes", "/documents", "/verification"].includes(pathname) || ["/deals/", "/invoice/", "/invite/"].some((prefix) => pathname.startsWith(prefix))) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className={cn("flex-1", className)}>{children}</main>
      <SiteFooter />
    </div>
  );
}
