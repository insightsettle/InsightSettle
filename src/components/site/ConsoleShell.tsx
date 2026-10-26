import { Link } from "@tanstack/react-router";
import { AlertTriangle, ClipboardList, Inbox, SlidersHorizontal, Coins, FileBarChart, FileCheck, Gavel, History, LayoutDashboard, Percent, ScanSearch, Users, Wallet } from "lucide-react";
import { AppShell, shellNavClass } from "@/components/site/AppShell";
import { useLocale } from "@/lib/locale";

const groups = [
  { label: "Operations", items: [
    { to: "/console", label: "Overview", exact: true, icon: LayoutDashboard },
    { to: "/console/deals", label: "All deals", exact: false, icon: Wallet },
    { to: "/console/disputes", label: "Disputes", exact: false, icon: AlertTriangle },
    { to: "/console/auctions", label: "Auctions", exact: false, icon: Gavel },
  ] },
  { label: "Customers", items: [
    { to: "/console/support", label: "Support inbox", exact: false, icon: Inbox },
    { to: "/console/survey", label: "Market survey", exact: false, icon: ClipboardList },
    { to: "/console/users", label: "Members", exact: false, icon: Users },
    { to: "/console/kyc", label: "Identity documents", exact: false, icon: FileCheck },
    { to: "/console/risk", label: "Risk review", exact: false, icon: ScanSearch },
    { to: "/console/interest", label: "Interest register", exact: false, icon: ClipboardList },
  ] },
  { label: "Finance", items: [
    { to: "/console/finance", label: "Finance Center", exact: false, icon: Wallet },
    { to: "/console/rates", label: "Currency rates", exact: false, icon: Coins },
    { to: "/console/auction-settings", label: "Auction settings", exact: false, icon: Gavel },
    { to: "/console/fees", label: "Fee rules", exact: false, icon: Percent },
    { to: "/console/reports", label: "Reports", exact: false, icon: FileBarChart },
  ] },
  { label: "System", items: [
    { to: "/console/platform", label: "Platform settings", exact: false, icon: SlidersHorizontal },
    { to: "/console/audit", label: "Staff history", exact: false, icon: History },
  ] },
] as const;

export function ConsoleShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const { text } = useLocale();
  const navigation = <nav className="space-y-5" aria-label={text("Navigation")}>
    {groups.map((group) => <div key={group.label}>
      <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">{text(group.label)}</p>
      <div className="space-y-1">{group.items.map((tab) => <Link key={tab.to} to={tab.to} activeOptions={{ exact: tab.exact }} className={shellNavClass}>
        <tab.icon className="size-4" />{text(tab.label, tab.label === 'Finance Center' ? 'مركز المالية' : tab.label === 'Support inbox' ? 'صندوق الدعم' : tab.label === 'Platform settings' ? 'إعدادات المنصة' : tab.label === 'Auction settings' ? 'إعدادات المزادات' : tab.label === 'Auctions' ? 'المزادات' : tab.label === 'Interest register' ? 'سجل الاهتمام' : undefined)}
      </Link>)}</div>
    </div>)}
  </nav>;
  return <AppShell staff navigation={navigation} title="Staff console">
    <div>
      <h1 data-no-localize className="text-2xl font-semibold">{text(title, title === 'Operations, revenue and controls' ? 'العمليات والإيرادات والتحكم' : undefined)}</h1>
      <p data-no-localize className="mt-2 text-sm text-muted-foreground">{text(subtitle, subtitle === 'Staff view of every member, deal, fee, currency rate, and dispute.' ? 'عرض إداري شامل لكل عضو وصفقة ورسم وسعر عملة ونزاع.' : undefined)}</p>
    </div>
    {children}
  </AppShell>;
}
