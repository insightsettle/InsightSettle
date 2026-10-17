import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Users,
  BriefcaseBusiness,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { FxCustomerQuote } from "@/components/site/FxCustomerQuote";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionUser } from "@/hooks/use-session";
import { useStaffAccess } from "@/hooks/use-staff";
import { supabase } from "@/integrations/supabase/client";

import { formatMoney } from "@/lib/money";
import { listMyDeals } from "@/lib/deals";
import { listNotifications } from "@/lib/notifications";
import { CustodyNote } from "@/components/deal/DealPresentation";
import { clientAction } from "@/lib/deal-display";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Insight" },
      {
        name: "description",
        content:
          "Monitor balances, active escrow deals, required actions, and recent account activity.",
      },
      { property: "og:title", content: "Insight escrow dashboard" },
      {
        property: "og:description",
        content: "A clear view of protected funds, deals, and actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { locale, text } = useLocale();
  const { user } = useSessionUser();
  const { isStaff } = useStaffAccess();
  const navigate = useNavigate();
  useEffect(() => {
    if (isStaff) navigate({ to: "/console", replace: true });
  }, [isStaff, navigate]);
  const { data: myDeals = [] } = useQuery({ queryKey: ["my-deals"], queryFn: listMyDeals });
  const { data: myActivity = [] } = useQuery({
    queryKey: ["my-activity"],
    queryFn: () => listNotifications(10),
  });
  const { data: actionMilestones = [] } = useQuery({
    queryKey: ["my-action-milestones", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("deal_milestones").select("deal_id, status").eq("status", "submitted")).data ?? [],
  });
  const uid = user?.id;
  const closed = ["released", "completed", "refunded", "partially_refunded", "cancelled", "rejected"];
  const active = myDeals.filter((d) => !closed.includes(d.status));
  const actionDeals = myDeals.map((deal) => ({ deal, action: clientAction(deal, uid, actionMilestones) })).filter((item) => item.action);
  const grouped = (deals: typeof myDeals) => {
    const totals: Record<string, number> = {};
    for (const d of deals) totals[d.currency] = (totals[d.currency] ?? 0) + Number(d.amount);
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  };
  const held = grouped(active.filter((d) => ["held", "in_progress", "delivered", "under_review", "disputed"].includes(d.status)));
  const month = new Date().toISOString().slice(0, 7);
  const released = grouped(myDeals.filter((d) => ["released", "completed"].includes(d.status) && d.released_at?.startsWith(month)));
  const heldMain = held[0];
  const releasedMain = released[0];
  const firstName = (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "";
  const typeCounts = Object.entries(active.reduce<Record<string, number>>((out, d) => {
    const type = (d as typeof d & { deal_type?: string }).deal_type ?? "goods";
    out[type] = (out[type] ?? 0) + 1;
    return out;
  }, {})).map(([type, n]) => `${text(typeLabels[type] ?? type)}: ${n}`).join(" · ");
  const stats = [
    { label: text("Held with the provider", "محفوظة لدى مزوّد الدفع"), value: heldMain ? formatMoney(heldMain[1], heldMain[0]) : "—", note: `${active.filter((d) => ["held", "in_progress", "delivered", "under_review", "disputed"].includes(d.status)).length} ${text("active deals", "صفقات نشطة")}`, extra: held.slice(1).map(([c, n]) => formatMoney(n, c)).join(" · "), icon: ShieldCheck },
    { label: text("Waiting for you", "بانتظارك"), value: String(actionDeals.length), note: text("Actions needing your attention", "إجراءات تتطلب اهتمامك"), icon: AlertCircle },
    { label: text("Active deals", "الصفقات النشطة"), value: String(active.length), note: typeCounts || text("No active deals", "لا توجد صفقات نشطة"), icon: BriefcaseBusiness },
    { label: text("Released this month", "المُفرج عنه هذا الشهر"), value: releasedMain ? formatMoney(releasedMain[1], releasedMain[0]) : "—", note: released.slice(1).map(([c, n]) => formatMoney(n, c)).join(" · ") || text("Completed releases", "عمليات الإفراج المكتملة"), icon: Wallet },
  ];
  return (
    <SiteShell>
      <div className="space-y-6" data-no-localize>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{text(`Good evening, ${firstName}`, `مساء الخير، ${firstName}`)}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{text(`You have ${actionDeals.length} actions waiting today`, `لديك ${actionDeals.length} إجراءات بانتظارك اليوم`)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/deals/new"><Plus />{text("New deal", "صفقة جديدة")}</Link></Button>
            <Button asChild variant="secondary"><Link to="/deals/new"><Users />{text("Invite a supplier", "دعوة مورد")}</Link></Button>
          </div>
        </header>
        <Card>
          <CardContent className="p-0">
            <h3 className="border-b px-6 py-5 font-semibold">{text("Needs your action", "المطلوب منك الآن")}</h3>
            {actionDeals.length === 0 ? <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><CheckCircle2 className="size-6 text-primary" />{text("Nothing needs your action", "لا يوجد إجراء مطلوب منك")}</div> : actionDeals.map(({ deal, action: next }, i) => <div key={deal.id} className="flex flex-wrap items-center gap-4 border-t p-5 first:border-t-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary"><FileCheck2 className="size-5" /></span>
              <div className="min-w-0 flex-1"><p className="font-medium">{deal.title}</p><p className="mt-1 break-words text-xs text-muted-foreground">{deal.ref} · {deal.counterparty_email ?? text("Other party", "الطرف الآخر")} · <bdi className="tabular-nums">{formatMoney(Number(deal.amount), deal.currency)}</bdi></p><p className="mt-1 text-xs text-warning">{deal.auto_release_at ? text(`Inspection ends ${new Date(deal.auto_release_at).toLocaleDateString("en-GB")}`, `ينتهي الفحص ${new Date(deal.auto_release_at).toLocaleDateString("ar-SA")}`) : deal.due_at ? text(`Due ${new Date(deal.due_at).toLocaleDateString("en-GB")}`, `الموعد ${new Date(deal.due_at).toLocaleDateString("ar-SA")}`) : text("Awaiting your action", "بانتظار إجرائك")}</p></div>
              <Button asChild variant={i === 0 ? "default" : "secondary"}><Link to="/deals/$dealId" params={{ dealId: deal.ref }}>{text(next ?? "View deal")}</Link></Button>
            </div>)}
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((s) => <Card key={s.label}><CardContent className="p-5"><div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{s.label}</span><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent"><s.icon className="size-4 text-primary" /></span></div><p className="mt-4 break-words text-2xl font-semibold tabular-nums"><bdi>{s.value}</bdi></p><p className="mt-2 text-xs leading-5 text-muted-foreground">{s.note}</p>{s.extra && <p className="mt-1 text-xs tabular-nums text-muted-foreground">{s.extra}</p>}</CardContent></Card>)}</div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="min-w-0"><CardContent className="p-0"><h3 className="px-6 py-5 font-semibold">{text("My active deals", "صفقاتي النشطة")}</h3><div className="overflow-x-auto"><table className="w-full text-start text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{[text("Deal", "الصفقة"), text("Counterparty", "الطرف الآخر"), text("Amount", "المبلغ"), text("Status", "الحالة")].map((l) => <th className="px-5 py-3 text-start font-medium" key={l}>{l}</th>)}</tr></thead><tbody>{active.map((d) => <tr className="border-t" key={d.id}><td className="p-4"><Link className="font-medium hover:text-primary" to="/deals/$dealId" params={{ dealId: d.ref }}>{d.title}<span className="mt-1 block text-xs text-muted-foreground">{d.ref}</span></Link></td><td className="max-w-48 break-words p-4 text-muted-foreground">{d.counterparty_email ?? text("Other party", "الطرف الآخر")}</td><td className="whitespace-nowrap p-4 tabular-nums"><bdi>{formatMoney(Number(d.amount), d.currency)}</bdi></td><td className="p-4"><StatusBadge status={d.status as never} /></td></tr>)}{!active.length && <tr><td colSpan={4} className="p-6 text-sm text-muted-foreground">{text("No active deals", "لا توجد صفقات نشطة")}</td></tr>}</tbody></table></div></CardContent></Card>
          <Card><CardContent className="p-6"><h3 className="font-semibold">{text("Recent activity", "النشاط الأخير")}</h3><ol className="mt-5 space-y-5 border-s ps-5">{myActivity.map((item) => <li className="relative" key={item.id}><span className="absolute -start-[25px] top-1 size-2 rounded-full bg-primary" /><p className="text-sm font-medium">{text(item.title)}</p>{item.body && <p className="mt-1 text-xs leading-5 text-muted-foreground">{text(item.body)}</p>}<p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</p></li>)}{!myActivity.length && <li className="text-sm text-muted-foreground">{text("No activity yet.", "لا يوجد نشاط بعد.")}</li>}</ol><CustodyNote className="mt-6 border-t pt-4" /></CardContent></Card>
        </div>
        <VerificationCard />
        {user && !user.email_confirmed_at && <p className="rounded-lg bg-warning-subtle p-4 text-sm text-warning">{text("Please confirm your email address.", "يرجى تأكيد بريدك الإلكتروني.")}</p>}
        <details id="saved-deals"><summary className="cursor-pointer text-sm font-medium text-primary">{text("All deals", "جميع الصفقات")}</summary><div className="mt-3 space-y-2">{myDeals.map((d) => <Link className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm" key={d.id} to="/deals/$dealId" params={{ dealId: d.ref }}><span>{d.title} · {d.ref}</span><StatusBadge status={d.status as never} /><bdi className="tabular-nums">{formatMoney(Number(d.amount), d.currency)}</bdi></Link>)}</div></details>
        <FxCustomerQuote />
      </div>
    </SiteShell>
  );
}

const typeLabels: Record<string, string> = { goods: "Goods", services: "Services", contracting: "Contracting & fit-out", freelance: "Freelance & digital work" };

function VerificationCard() {
  const { data } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .maybeSingle();
      return profile;
    },
  });
  const status = data?.verification_status ?? "pending";
  if (status === "verified") return null;
  return (
    <Card className="mt-6 border-warning/40 bg-warning/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 text-warning" /> Verify your identity
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "rejected"
              ? "Your last submission was not accepted. Upload a clearer document to continue."
              : "Upload an ID or commercial register so you can fund and receive payouts without delays."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/verification">Upload documents</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
