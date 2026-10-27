import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Handshake, Scale, ReceiptText as Receipt, FileText, UserRoundCheck, Plus, Gavel, UserRound, Link2, IdCard } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { AppShell, shellNavClass } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { useStaffAccess } from "@/hooks/use-staff";
import { useSessionUser } from "@/hooks/use-session";
import { listMyDeals } from "@/lib/deals";
import { useLocale } from "@/lib/locale";
import { supabase } from "@/integrations/supabase/client";
import { clientAction } from "@/lib/deal-display";
import { showCustomerPrompts } from "@/lib/account-display";
import { auctionAccess } from "@/lib/auction-client";

export function ClientShell({ children }: { children: ReactNode }) {
  const { text } = useLocale();
  const { isStaff, loading: staffLoading } = useStaffAccess();
  const navigate = useNavigate();
  useEffect(() => { if (isStaff) void navigate({ to: "/console", replace: true }); }, [isStaff, navigate]);
  const { pathname, hash } = useLocation();
  const { user } = useSessionUser();
  const { data: auctionsAccess } = useQuery({ queryKey: ["auction-access"], queryFn: auctionAccess, enabled: !!user });
  const dealsQuery = useQuery({ queryKey: ["my-deals"], queryFn: listMyDeals });
  const milestonesQuery = useQuery({
    queryKey: ["my-action-milestones", user?.id], enabled: !!user,
    queryFn: async () => { const { data, error } = await supabase.from("deal_milestones").select("deal_id, status").eq("status", "submitted"); if (error) throw error; return data ?? []; },
  });
  const deals = dealsQuery.data ?? [];
  const actionMilestones = milestonesQuery.data ?? [];
  // Same action buckets shown by the existing customer dashboard, counted once per deal.
  const actionCount = deals.filter((d) => clientAction(d, user?.id, actionMilestones)).length;
  const onDeals = pathname.startsWith("/deals/") || hash === "saved-deals";
  const title = pathname === "/deals/new" ? "New deal" : pathname.startsWith("/deals/") || onDeals ? "Deals" : pathname === "/disputes" ? "Disputes" : pathname === "/documents" ? "Deal documents" : pathname === "/invoices" || pathname.startsWith("/invoice/") ? "Tax invoices" : pathname === "/verification" ? "Account & verification" : pathname === "/links" ? "Deal links" : pathname === "/card" ? "My Insight card" : "Home";
  const nav = <>
    <Button asChild className="mb-5 h-10 w-full rounded-lg"><Link to="/deals/new"><Plus />{text("New deal")}</Link></Button>
    <nav className="space-y-1" aria-label={text("Navigation")}>
      <Link to="/dashboard" className={shellNavClass} activeProps={{ "data-status": onDeals ? "inactive" : "active" }}><Home className="size-4" />{text("Home")}<span className="ms-auto rounded-full bg-accent px-2 text-xs tabular-nums text-primary">{actionCount}</span></Link>
      {/* There is no /deals listing route: preserve the existing saved-deals destination. */}
      <Link to="/dashboard" hash="saved-deals" className={shellNavClass} data-status={onDeals ? "active" : "inactive"} activeOptions={{ exact: true, includeHash: true }} activeProps={{ "data-status": onDeals ? "active" : "inactive" }}><Handshake className="size-4" />{text("Deals")}</Link>
      <Link to="/links" className={shellNavClass}><Link2 className="size-4" />{text("Deal links", "روابط الصفقات")}</Link>
      <Link to="/disputes" className={shellNavClass}><Scale className="size-4" />{text("Disputes")}</Link>
      <Link to="/documents" className={shellNavClass}><FileText className="size-4" />{text("Deal documents", "مستندات الصفقة")}</Link>
      <Link to="/invoices" className={shellNavClass} data-status={pathname === "/invoices" || pathname.startsWith("/invoice/") ? "active" : "inactive"}><Receipt className="size-4" />{text("Tax invoices", "الفواتير الضريبية")}</Link>
      <Link to="/card" className={shellNavClass}><IdCard className="size-4" />{text("My Insight card", "بطاقتي في إنسايت")}</Link>
      <Link to="/verification" className={shellNavClass}><UserRoundCheck className="size-4" />{text("Account & verification")}</Link>
      {auctionsAccess?.visible && <Link to="/auctions" className={shellNavClass} data-status={pathname.startsWith('/auctions') ? 'active' : 'inactive'}><Gavel className="size-4" />{text("Auctions", "المزادات")}</Link>}
    </nav>
  </>;
  // Phone tab bar: hidden on a single deal page, which carries its own sticky action instead.
  const onDealPage = pathname.startsWith("/deals/") && pathname !== "/deals/new";
  const tab = (to: string, label: [string, string], Icon: typeof Home, active: boolean, badge?: number, hashTo?: string) => (
    <Link to={to} {...(hashTo ? { hash: hashTo } : {})} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-colors ${active ? "bg-accent text-primary" : "text-muted-foreground"}`}>
      <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />{text(label[0], label[1])}
      {!!badge && <span className="absolute top-1 end-3 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground tabular-nums">{badge}</span>}
    </Link>
  );
  const mobileNav = onDealPage ? undefined : (
    <nav data-no-localize aria-label={text("Main", "الرئيسية")} className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 items-center gap-1 rounded-3xl border border-border bg-card/95 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_20px_40px_-20px_rgb(12_42_34/0.45)] backdrop-blur lg:hidden">
      {tab("/dashboard", ["Home", "الرئيسية"], Home, pathname === "/dashboard" && hash !== "saved-deals", actionCount)}
      {tab("/dashboard", ["Deals", "الصفقات"], Handshake, onDeals, undefined, "saved-deals")}
      <Link to="/deals/new" aria-label={text("New deal", "صفقة جديدة")} className="gradient-brand mx-auto -mt-7 grid size-14 place-items-center rounded-full text-white shadow-[0_14px_28px_-12px_rgb(19_128_101/0.9)] ring-4 ring-background"><Plus className="size-6" strokeWidth={2.4} /></Link>
      {tab("/documents", ["Documents", "المستندات"], FileText, pathname === "/documents")}
      {tab("/verification", ["Account", "حسابي"], UserRound, pathname === "/verification")}
    </nav>
  );
  if (!showCustomerPrompts(isStaff, staffLoading)) return <p data-no-localize>{text("Loading…", "جارٍ التحميل…")}</p>;
  return <AppShell navigation={nav} title={title} mobileNav={mobileNav}>{(dealsQuery.isError || milestonesQuery.isError) && <div data-no-localize role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-destructive">{text("Some account information could not be loaded.", "تعذّر تحميل بعض معلومات الحساب.")}<Button variant="outline" onClick={() => { void dealsQuery.refetch(); void milestonesQuery.refetch(); }}>{text("Try again", "حاول مرة أخرى")}</Button></div>}{children}</AppShell>;
}