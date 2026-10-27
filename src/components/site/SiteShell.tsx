import { useQueryClient } from "@tanstack/react-query";
import { SiteNotice } from "@/components/site/SiteNotice";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Menu, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useContext, useEffect, useRef, useState } from "react";
import { InAppShell } from "@/components/site/AppShell";

import { NotificationBell } from "@/components/site/NotificationBell";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/hooks/use-session";
import { useStaffAccess } from "@/hooks/use-staff";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale";

const nav = [
  { to: "/individuals", label: "For individuals", ar: "للأفراد", hash: "" },
  { to: "/business", label: "For business", ar: "للأعمال", hash: "" },
  { to: "/how-it-works", label: "How it works", ar: "كيف تعمل؟", hash: "" },
  { to: "/pricing", label: "Pricing", ar: "الرسوم", hash: "" },
  { to: "/help", label: "Help", ar: "المساعدة", hash: "" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const { user, loading } = useSessionUser();
  const { isStaff } = useStaffAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { text } = useLocale();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { setSignOutError(text("Sign out failed. Please try again.", "تعذّر تسجيل الخروج. حاول مرة أخرى.")); return; }
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
              activeOptions={{ exact: false }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {text(item.label, item.ar)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 xl:ms-0">
          <LanguageToggle />
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
                <Link to={isStaff ? "/console" : "/dashboard"}>{text(isStaff ? "Staff console" : "My dashboard")}</Link>
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

      {signOutError && <p role="alert" className="px-4 py-2 text-sm text-destructive">{signOutError}</p>}
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
                  to={isStaff ? "/console" : "/dashboard"}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary"
                >
                  {text(isStaff ? "Staff console" : "My dashboard")}
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
              <>
                <Link to="/auth" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-primary">{text("Sign in", "تسجيل الدخول")}</Link>
                <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-primary">{text("Create account", "إنشاء حساب")}</Link>
              </>
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
    <div aria-hidden="true" className="gradient-brand h-1" />
    <div className="mx-auto max-w-7xl px-5 py-12">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div><Link to="/" aria-label="Insight home" className="inline-flex"><BrandLogo tone="light" className="h-14 w-auto" /></Link><p className="mt-4 max-w-xs text-sm leading-7 text-primary-foreground/75">{text("Every deal clear, from the first agreement to the last payment.", "صفقتك واضحة، من أول اتفاق حتى آخر دفعة.")}</p></div>
        <FooterCol title={text("For individuals", "للأفراد")} links={[{to:"/individuals",label:text("Insight for individuals","إنسايت للأفراد")},{to:"/for-buyers",label:text("For buyers","للمشترين")},{to:"/for-suppliers",label:text("For sellers and suppliers","للبائعين والموردين")},{to:"/how-it-works",hash:"auctions",label:text("Social-media auctions","مزادات وسائل التواصل")}]} />
        <FooterCol title={text("For business", "للأعمال")} links={[{to:"/business",label:text("Insight for business","إنسايت للأعمال")},{to:"/business",hash:"imports",label:text("Importing from abroad","الاستيراد من الخارج")},{to:"/business",hash:"contracting",label:text("Contracting and fit-out","المقاولات والتجهيز")},{to:"/business",hash:"services",label:text("Business services","خدمات الأعمال")}]} />
        <FooterCol title={text("Platform", "المنصة")} links={[{to:"/how-it-works",label:text("How it works","كيف تعمل؟")},{to:"/pricing",label:text("Fees and calculator","الرسوم والحاسبة")},{to:"/security",label:text("Security","الأمان")},{to:"/faq",label:text("FAQ","الأسئلة الشائعة")}]} />
        <FooterCol title={text("Support and legal", "الدعم والأنظمة")} links={[{to:"/help",label:text("Help centre","مركز المساعدة")},{to:"/dispute-policy",label:text("Disputes & refunds","النزاعات والاسترداد")},{to:"/terms",label:text("Terms of service","شروط الخدمة")},{to:"/privacy",label:text("Privacy policy","سياسة الخصوصية")}]} />
      </div>
    </div><div className="border-t border-primary-foreground/15 px-5 py-6"><p className="mx-auto max-w-7xl text-xs leading-6 text-primary-foreground/70">© 2026 Insight · {text("Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.", "نسخة تجريبية لخدمة الضمان: مزوّد الدفع محاكى ولا تُحوَّل أي أموال حقيقية. عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، وتدير إنسايت قواعد الصفقة وتحفظ سجلها.")}</p></div>
  </footer>;
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string; hash?: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
        {links.map((l) => (
          <li key={l.to + (l.hash ?? "")}>
            <Link to={l.to} {...(l.hash ? { hash: l.hash } : {})} className="transition-colors hover:text-primary-foreground">
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
  const inApp = useContext(InAppShell);
  // Client chrome is owned by the authenticated parent; keep public chrome unchanged.
  // The context check also covers route transitions, when the old page briefly sees the next pathname.
  if (inApp || ["/dashboard", "/disputes", "/documents", "/invoices", "/verification"].includes(pathname) || ["/deals/", "/invoice/", "/invite/"].some((prefix) => pathname.startsWith(prefix))) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNotice />
      <SiteHeader />
      <PublicMain className={className}>{children}</PublicMain>
      <SiteFooter />
    </div>
  );
}

/**
 * Public pages: sections below the fold rise in as they scroll into view, and their cards follow one after another
 * (founder, 27 Oct). Sections already on screen are never hidden, so nothing flashes on first load, and without
 * JavaScript every section simply shows. Presentation only.
 */
function PublicMain({ children, className }: { children: React.ReactNode; className?: string | undefined }) {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("sr-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    const frame = requestAnimationFrame(() => {
      root.querySelectorAll("section").forEach((el) => {
        if (el.classList.contains("sr")) return;
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // already visible: leave it alone
        el.classList.add("sr");
        io.observe(el);
      });
    });
    return () => { cancelAnimationFrame(frame); io.disconnect(); };
  }, [pathname]);
  return <main ref={ref} className={cn("site-main flex-1", className)}>{children}</main>;
}
