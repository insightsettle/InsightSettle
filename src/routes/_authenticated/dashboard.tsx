import { useQuery } from "@tanstack/react-query";
import { rolesFor, the, to, type Roles } from "@/lib/roles";
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
import { escrowStep } from "@/lib/milestones";
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
  const hour = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Riyadh" }));
  const morning = hour >= 4 && hour < 12;
  const n = actionDeals.length;
  const waitingAr = n === 0 ? "لا شيء ينتظرك الآن." : n === 1 ? "لديك خطوة واحدة تنتظرك." : n === 2 ? "لديك خطوتان تنتظرانك." : n <= 10 ? `لديك ${n} خطوات تنتظرك.` : `لديك ${n} خطوة تنتظرك.`;
  const waitingEn = n === 0 ? "Nothing is waiting for you right now." : n === 1 ? "You have one step waiting." : `You have ${n} steps waiting.`;
  const releasedCount = myDeals.filter((d) => ["released", "completed"].includes(d.status) && d.released_at?.startsWith(month)).length;
  const heldCount = active.filter((d) => ["held", "in_progress", "delivered", "under_review", "disputed"].includes(d.status)).length;
  const stats = [
    { label: text("In your deals right now", "محفوظ لصفقاتك الآن"), value: heldMain ? formatMoney(heldMain[1], heldMain[0]) : "—", note: heldCount ? text(`${heldCount} paid deal(s), with the payment provider (simulated) until each one completes`, `${heldCount} صفقة مدفوعة، لدى مزوّد الدفع (محاكى) حتى تكتمل كل صفقة`) : text("Nothing paid in yet", "لا توجد مبالغ مدفوعة بعد"), extra: held.slice(1).map(([c, v]) => formatMoney(v, c)).join(" · "), icon: ShieldCheck },
    { label: text("Active deals", "صفقات جارية"), value: String(active.length), note: typeCounts || text("No active deals", "لا توجد صفقات جارية"), icon: BriefcaseBusiness },
    { label: text("Completed this month", "اكتملت هذا الشهر"), value: String(releasedCount), note: releasedMain ? `${formatMoney(releasedMain[1], releasedMain[0])}${released.length > 1 ? " · " + released.slice(1).map(([c, v]) => formatMoney(v, c)).join(" · ") : ""}` : text("No payouts yet this month", "لا تحويلات بعد هذا الشهر"), icon: Wallet },
  ];
  return (
    <SiteShell>
      <div className="space-y-8" data-no-localize>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{morning ? text(`Good morning, ${firstName}`, `صباح الخير يا ${firstName}`) : text(`Good evening, ${firstName}`, `مساء الخير يا ${firstName}`)}</h2>
            <p className="mt-2 text-base text-muted-foreground">{text(waitingEn, waitingAr)}</p>
          </div>
          <Button asChild size="lg" className="h-11"><Link to="/deals/new"><Plus />{text("New deal", "صفقة جديدة")}</Link></Button>
        </header>

        <section aria-labelledby="next-steps" className="space-y-4">
          <h3 id="next-steps" className="text-lg font-bold">{text("Your next steps", "خطوتك التالية")}</h3>
          {n === 0 ? (
            <Card><CardContent className="flex flex-wrap items-center gap-4 p-6"><CheckCircle2 className="size-8 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-semibold">{text("You are all caught up", "كل شيء على ما يرام")}</p><p className="mt-1 text-sm text-muted-foreground">{text("We will notify you as soon as a deal needs you.", "سنخبرك فور احتياج أي صفقة لإجراء منك.")}</p></div><Button asChild variant="outline"><Link to="/deals/new"><Users />{text("Start a new deal", "ابدأ صفقة جديدة")}</Link></Button></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {actionDeals.map(({ deal, action: next }) => {
                const ac = actionCopyFor(rolesFor((deal as any).deal_type)); const c = ac[next ?? ""] ?? ac["View deal"]!;
                const due = deal.auto_release_at && next === "Release the funds" ? text(` Inspection ends ${new Date(deal.auto_release_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`, ` تنتهي مدة الفحص ${new Date(deal.auto_release_at).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}.`) : "";
                return (
                  <article key={deal.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
                    <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent"><FileCheck2 className="size-5 text-primary" /></span><div className="min-w-0"><p className="truncate font-semibold">{deal.title}</p><p className="truncate text-xs text-muted-foreground">{text(typeLabels[(deal as typeof deal & { deal_type?: string }).deal_type ?? "goods"] ?? "Goods")} · <bdi>{deal.ref}</bdi> · <bdi className="tabular-nums" dir="ltr">{formatMoney(Number(deal.amount), deal.currency)}</bdi></p></div></div>
                    <p className="leading-8">{text(c[0], c[1])}{due && <span className="font-semibold text-warning">{due}</span>}</p>
                    <div><Button asChild><Link to="/deals/$dealId" params={{ dealId: deal.ref }}>{text(c[2], c[3])}</Link></Button></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-3">{stats.map((s) => <Card key={s.label}><CardContent className="p-5"><div className="flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">{s.label}</span><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent"><s.icon className="size-4 text-primary" /></span></div><p className="mt-3 break-words text-2xl font-bold tabular-nums"><bdi dir="ltr">{s.value}</bdi></p><p className="mt-2 text-xs leading-5 text-muted-foreground">{s.note}</p>{s.extra && <p className="mt-1 text-xs tabular-nums text-muted-foreground">{s.extra}</p>}</CardContent></Card>)}</div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="min-w-0"><CardContent className="p-0">
            <div className="flex items-center justify-between px-6 py-5"><h3 className="text-lg font-bold">{text("My deals", "صفقاتي")}</h3></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-start text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{[text("Deal", "الصفقة"), text("Amount", "المبلغ"), text("Status", "الحالة"), text("Progress", "المرحلة")].map((l) => <th className="px-5 py-3 text-start font-medium" key={l}>{l}</th>)}</tr></thead>
              <tbody>{active.map((d) => { const st = escrowStep(d.status, d.terms_status); return <tr className="border-t" key={d.id}><td className="p-4"><Link className="font-semibold hover:text-primary" to="/deals/$dealId" params={{ dealId: d.ref }}>{d.title}</Link><p className="mt-1 text-xs text-muted-foreground"><bdi>{d.ref}</bdi> · {(d.buyer_id === uid ? text(`You are the ${rolesFor((d as any).deal_type).payer.en}`, `أنت ${rolesFor((d as any).deal_type).payer.ar}`) : text(`You are the ${rolesFor((d as any).deal_type).payee.en}`, `أنت ${rolesFor((d as any).deal_type).payee.ar}`))}</p></td><td className="p-4 font-semibold tabular-nums"><bdi dir="ltr">{formatMoney(Number(d.amount), d.currency)}</bdi></td><td className="p-4"><StatusBadge status={d.status as never} /></td><td className="w-32 p-4"><div className="flex gap-1" aria-label={text(`Step ${st + 1} of 5`, `الخطوة ${st + 1} من 5`)}>{[0, 1, 2, 3, 4].map((k) => <span key={k} className={`h-1.5 flex-1 rounded ${k < st ? "bg-brand-mint" : k === st ? "gradient-brand" : "bg-surface"}`} />)}</div></td></tr>; })}
                {!active.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{text("No active deals yet. Create your first one in a few minutes.", "لا توجد صفقات جارية بعد. أنشئ صفقتك الأولى في دقائق.")}</td></tr>}</tbody></table></div>
          </CardContent></Card>
          <Card><CardContent className="p-6"><h3 className="text-lg font-bold">{text("Latest updates", "آخر التحديثات")}</h3><ol className="mt-5 space-y-5 border-s ps-5">{myActivity.map((item) => <li className="relative" key={item.id}><span className="absolute -start-[25px] top-1.5 size-2 rounded-full bg-brand-mint" /><p className="text-sm font-medium">{text(item.title)}</p>{item.body && <p className="mt-1 text-xs leading-5 text-muted-foreground">{text(item.body)}</p>}<p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</p></li>)}{!myActivity.length && <li className="text-sm text-muted-foreground">{text("No updates yet.", "لا توجد تحديثات بعد.")}</li>}</ol></CardContent></Card>
        </div>
        <VerificationCard />
        {user && !user.email_confirmed_at && <p className="rounded-lg bg-warning-subtle p-4 text-sm text-warning">{text("Please confirm your email address.", "يرجى تأكيد بريدك الإلكتروني.")}</p>}
        <details id="saved-deals" className="scroll-mt-24"><summary className="cursor-pointer text-sm font-semibold text-primary">{text("All deals, including completed ones", "كل الصفقات، بما فيها المكتملة")}</summary><div className="mt-3 space-y-2">{myDeals.map((d) => <Link className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm" key={d.id} to="/deals/$dealId" params={{ dealId: d.ref }}><span>{d.title} · <bdi>{d.ref}</bdi></span><StatusBadge status={d.status as never} /><bdi className="tabular-nums" dir="ltr">{formatMoney(Number(d.amount), d.currency)}</bdi></Link>)}</div></details>
      </div>
    </SiteShell>
  );
}

/** Plain wording for each dashboard action (keys are clientAction's results). [en, ar, button en, button ar] */
function actionCopyFor(R: Roles): Record<string, [string, string, string, string]> {
  const [payerEn, payerAr] = the(R.payer); const [payeeEn, payeeAr] = the(R.payee); const [toEn, toAr] = to(R.payee);
  return {
    "Accept the terms": ["The other party sent the terms. Review them and accept to move to payment.", "أرسل الطرف الآخر الشروط. راجعها ووافق عليها للانتقال إلى الدفع.", "Review the terms", "راجع الشروط"],
    "Approve and release": [`${cap1(payeeEn)} delivered a milestone. Review it and approve to pay it out.`, `سلّم ${payeeAr} مرحلة. راجعها واعتمدها ليُحوَّل مبلغها.`, "Review the milestone", "راجع المرحلة"],
    "Fund the deal": [`You both agreed the terms. Pay the amount so ${payeeEn} can start.`, `اتفقتما على الشروط. ادفع المبلغ ليبدأ ${payeeAr} التنفيذ.`, "Pay now", "ادفع الآن"],
    "Update shipping": [`${cap1(payerEn)} has paid. Ship the order and add the tracking number.`, `دفع ${payerAr} المبلغ. اشحن الطلب وأضف رقم التتبع.`, "Add shipping details", "أضف بيانات الشحن"],
    "Confirm delivery": [`Confirm once you have delivered, so ${payerEn}'s inspection period starts.`, `أكّد عندما تُسلِّم لتبدأ مدة الفحص لدى ${payerAr}.`, "Confirm delivery", "أكّد التسليم"],
    "Release the funds": [`Your delivery has arrived. Inspect it, then confirm receipt to release the payment ${toEn}.`, `وصل التسليم. افحصه ثم أكّد الاستلام ليُحوَّل المبلغ ${toAr}.`, "Confirm receipt", "أكّد الاستلام"],
    "View deal": ["Open the deal to see what is needed.", "افتح الصفقة لترى المطلوب.", "Open the deal", "افتح الصفقة"],
  };
}
function cap1(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

const typeLabels: Record<string, string> = { goods: "Goods", services: "Services", contracting: "Contracting & fit-out", freelance: "Freelance & digital work" };

function VerificationCard() {
  const { text } = useLocale();
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
            <ShieldCheck className="size-4 text-warning" /> {text("Verify your identity", "وثّق هويتك")}
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
