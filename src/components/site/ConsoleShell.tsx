import { Link } from "@tanstack/react-router";
import { AlertTriangle, ClipboardList, Coins, FileBarChart, FileCheck, Gavel, History, LayoutDashboard, Percent, ScanSearch, Users, Wallet } from "lucide-react";
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
    { to: "/console/users", label: "Members", exact: false, icon: Users },
    { to: "/console/kyc", label: "Identity documents", exact: false, icon: FileCheck },
    { to: "/console/risk", label: "Risk review", exact: false, icon: ScanSearch },
    { to: "/console/interest", label: "Interest register", exact: false, icon: ClipboardList },
  ] },
  { label: "Finance", items: [
    { to: "/console/rates", label: "Currency rates", exact: false, icon: Coins },
    { to: "/console/fees", label: "Fee rules", exact: false, icon: Percent },
    { to: "/console/reports", label: "Reports", exact: false, icon: FileBarChart },
  ] },
  { label: "System", items: [
    { to: "/console/audit", label: "Staff history", exact: false, icon: History },
  ] },
] as const;

export function ConsoleShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const { text } = useLocale();
  const navigation = <nav className="space-y-5" aria-label={text("Navigation")}>
    {groups.map((group) => <div key={group.label}>
      <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">{text(group.label)}</p>
      <div className="space-y-1">{group.items.map((tab) => <Link key={tab.to} to={tab.to} activeOptions={{ exact: tab.exact }} className={shellNavClass}>
        <tab.icon className="size-4" />{text(tab.label, tab.label === 'Auctions' ? 'المزادات' : tab.label === 'Interest register' ? 'سجل الاهتمام' : undefined)}
      </Link>)}</div>
    </div>)}
  </nav>;
  return <AppShell staff navigation={navigation} title="Staff console">
    <div>
      <h1 className="text-2xl font-semibold">{text(title)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text(subtitle)}</p>
    </div>
    {children}
  </AppShell>;
}
