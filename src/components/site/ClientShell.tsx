import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Handshake, Scale, Receipt, UserRoundCheck, Plus, Gavel } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell, shellNavClass } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/hooks/use-session";
import { listMyDeals } from "@/lib/deals";
import { useLocale } from "@/lib/locale";
import { clientAction } from "@/lib/deal-display";

// TODO: enable Auctions only for verified organisers when that feature exists.
const AUCTIONS_ENABLED = false;
export function ClientShell({ children }: { children: ReactNode }) {
  const { text } = useLocale();
  const { pathname, hash } = useLocation();
  const { user } = useSessionUser();
  const { data: deals = [] } = useQuery({ queryKey: ["my-deals"], queryFn: listMyDeals });
  // Same action buckets shown by the existing customer dashboard, counted once per deal.
  const actionCount = deals.filter((d) => clientAction(d, user?.id)).length;
  const onDeals = pathname.startsWith("/deals/") || hash === "saved-deals";
  const title = pathname === "/deals/new" ? "New deal" : pathname.startsWith("/deals/") || onDeals ? "Deals" : pathname === "/disputes" ? "Disputes" : pathname === "/documents" || pathname.startsWith("/invoice/") ? "Payments & invoices" : pathname === "/verification" ? "Account & verification" : "Home";
  const nav = <>
    <Button asChild className="mb-5 h-10 w-full rounded-lg"><Link to="/deals/new"><Plus />{text("New deal")}</Link></Button>
    <nav className="space-y-1" aria-label={text("Navigation")}>
      <Link to="/dashboard" className={shellNavClass} activeProps={{ "data-status": onDeals ? "inactive" : "active" }}><Home className="size-4" />{text("Home")}<span className="ms-auto rounded-full bg-accent px-2 text-xs tabular-nums text-primary">{actionCount}</span></Link>
      {/* There is no /deals listing route: preserve the existing saved-deals destination. */}
      <Link to="/dashboard" hash="saved-deals" className={shellNavClass} data-status={onDeals ? "active" : "inactive"} activeOptions={{ exact: true, includeHash: true }} activeProps={{ "data-status": onDeals ? "active" : "inactive" }}><Handshake className="size-4" />{text("Deals")}</Link>
      <Link to="/disputes" className={shellNavClass}><Scale className="size-4" />{text("Disputes")}</Link>
      <Link to="/documents" className={shellNavClass}><Receipt className="size-4" />{text("Payments & invoices")}</Link>
      <Link to="/verification" className={shellNavClass}><UserRoundCheck className="size-4" />{text("Account & verification")}</Link>
      {AUCTIONS_ENABLED && <span className={shellNavClass}><Gavel className="size-4" />{text("Auctions")}</span>}
    </nav>
  </>;
  return <AppShell navigation={nav} title={title}>{children}</AppShell>;
}