import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, ChevronLeft, ChevronRight, CircleAlert, Clock3, Landmark, MapPin, ShieldAlert, UserRound } from "lucide-react";

import { useStaffAccess } from "@/hooks/use-staff";
import { useSessionUser } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/locale";
import { identityDisplayState } from "@/lib/account-display";
import { cn } from "@/lib/utils";

export type AccountStep = { key: "details" | "address" | "identity" | "payout"; icon: typeof UserRound; title: [string, string]; hint: [string, string]; state: "done" | "pending" | "todo"; anchor: string };

/** The four things that make an account ready to pay and be paid. Read-only: every edit stays in the existing forms. */
export function useAccountSteps() {
  const { user } = useSessionUser();
  const { isStaff, loading: staffLoading } = useStaffAccess();
  const q = useQuery({
    queryKey: ["account-steps", user?.id], enabled: !!user && !staffLoading && !isStaff,
    queryFn: async () => {
      const [profileResult, payoutResult, docsResult] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, country, address, verification_status").eq("id", user?.id ?? "").maybeSingle(),
        supabase.from("payout_accounts").select("user_id, verified").eq("user_id", user?.id ?? "").limit(1),
        supabase.from("kyc_documents").select("id, status").limit(5),
      ]);
      for (const result of [profileResult, payoutResult, docsResult]) if (result.error) throw result.error;
      return { p: profileResult.data, payout: payoutResult.data?.[0], docs: docsResult.data ?? [] };
    },
  });
  const p = q.data?.p as { full_name?: string | null; phone?: string | null; country?: string | null; address?: string | null; verification_status?: string | null } | null | undefined;
  const steps: AccountStep[] = [
    { key: "details", icon: UserRound, title: ["Personal details", "البيانات الشخصية"], hint: ["Your full name, phone and country", "اسمك الكامل وجوالك ودولتك"], state: p?.full_name && p?.phone && p?.country ? "done" : "todo", anchor: "details" },
    { key: "address", icon: MapPin, title: ["Address", "العنوان"], hint: ["Where you live or work", "عنوان سكنك أو عملك"], state: p?.address ? "done" : "todo", anchor: "details" },
    { key: "identity", icon: BadgeCheck, title: ["Identity verification", "توثيق الهوية"], hint: ["A national ID, Iqama, passport or commercial registration", "الهوية أو الإقامة أو الجواز أو السجل التجاري"], state: identityDisplayState(p?.verification_status, q.data?.docs ?? []), anchor: "identity" },
    { key: "payout", icon: Landmark, title: ["Payout account", "الحساب البنكي"], hint: ["Where your money is paid out", "الحساب الذي تستلم عليه أموالك"], state: q.data?.payout?.verified ? "done" : q.data?.payout ? "pending" : "todo", anchor: "payout" },
  ];
  const done = steps.filter((s) => s.state === "done").length;
  return { isStaff, rejected: p?.verification_status === "rejected", error: q.isError, loading: staffLoading || q.isLoading, steps, done, next: (p?.verification_status === "rejected" ? steps.find(s => s.key === "identity") : null) ?? steps.find((s) => s.state === "todo") ?? steps.find((s) => s.state === "pending") ?? null };
}

export function ProgressRing({ done, total, size = 64 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 5; const c = 2 * Math.PI * r; const pct = total ? done / total : 0;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6" className="stroke-border" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-700" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <bdi dir="ltr" className="absolute text-sm font-bold tabular-nums">{done}/{total}</bdi>
    </span>
  );
}

/** Dashboard card: how ready the account is, and the one next thing to do. Hidden when everything is done. */
export function AccountProgressCard() {
  const { text, direction } = useLocale();
  const { isStaff, rejected, error, loading, steps, done, next } = useAccountSteps();
  if (isStaff || loading || done === steps.length) return null;
  const Chevron = direction === "rtl" ? ChevronLeft : ChevronRight;
  const waiting = next?.state === "pending";
  return (
    <Link to="/verification" {...(next ? { hash: next.anchor } : {})} className="group flex items-center gap-4 rounded-3xl border border-border bg-gradient-to-l from-accent/70 to-card p-4 transition-shadow hover:shadow-[0_20px_40px_-30px_rgb(12_42_34/0.5)] sm:p-5">
      <ProgressRing done={done} total={steps.length} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{waiting ? <Clock3 className="size-3.5 text-warning" /> : <ShieldAlert className="size-3.5 text-primary" />}{text("Complete your account to pay and get paid", "أكمل حسابك لتدفع وتستلم دون تأخير")}</p>
        <p className="mt-1 break-words text-base font-semibold">{error ? text("Unable to load account progress. Try again.", "تعذّر تحميل حالة الحساب. حاول مجدداً.") : rejected ? text("Your document was not accepted. Upload a clearer document.", "لم يُقبل المستند. ارفع مستنداً أوضح.") : next ? (waiting ? (next.key === "payout" ? text("Your payout account is being verified", "حساب الصرف قيد التوثيق") : text("Your documents are being reviewed", "مستنداتك قيد المراجعة")) : text(`Add your ${next.title[0].toLowerCase()}`, `أضف ${next.title[1]}`)) : null}</p>
      </div>
      <Chevron className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
    </Link>
  );
}

/** Verification page header: the account at a glance, with a status for each of the four steps. */
export function AccountSummary({ name, email }: { name: string; email: string }) {
  const { text, direction } = useLocale();
  const { isStaff, loading, steps, done } = useAccountSteps();
  const Chevron = direction === "rtl" ? ChevronLeft : ChevronRight;
  if (isStaff || loading) return null;
  return (
    <div className="space-y-5" data-no-localize>
      <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
        <span className="gradient-brand grid size-16 shrink-0 place-items-center rounded-full text-2xl font-bold text-white">{name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><p dir="auto" className="truncate text-xl font-bold">{name}</p><p className="truncate text-sm text-muted-foreground" dir="ltr">{email}</p>
          <p className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", done === steps.length ? "bg-accent text-primary" : "bg-warning/10 text-warning")}>{done === steps.length ? <><BadgeCheck className="size-3.5" />{text("Account ready", "الحساب جاهز")}</> : <><CircleAlert className="size-3.5" />{text(`${done} of ${steps.length} steps done`, `اكتملت ${done} من ${steps.length} خطوات`)}</>}</p>
        </div>
        <ProgressRing done={done} total={steps.length} size={56} />
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
        {steps.map((s) => (
          <li key={s.key}><Link to="/verification" hash={s.anchor} hashScrollIntoView={false} className="flex items-center gap-4 p-4 transition-colors hover:bg-secondary">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><s.icon className="size-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-medium">{text(s.title[0], s.title[1])}</span><span className="block text-xs leading-5 text-muted-foreground">{text(s.hint[0], s.hint[1])}</span></span>
            <StateDot state={s.state} />
            <Chevron className="size-4 shrink-0 text-muted-foreground" />
          </Link></li>
        ))}
      </ul>
    </div>
  );
}

function StateDot({ state }: { state: AccountStep["state"] }) {
  const { text } = useLocale();
  if (state === "done") return <span className="grid size-7 place-items-center rounded-full bg-primary text-white" aria-label={text("Done", "مكتمل")} title={text("Done", "مكتمل")}><BadgeCheck className="size-4" /></span>;
  if (state === "pending") return <span className="grid size-7 place-items-center rounded-full bg-warning/15 text-warning" aria-label={text("Under review", "قيد المراجعة")} title={text("Under review", "قيد المراجعة")}><Clock3 className="size-4" /></span>;
  return <span className="grid size-7 place-items-center rounded-full bg-warning text-white" aria-label={text("To do", "مطلوب")} title={text("To do", "مطلوب")}><CircleAlert className="size-4" /></span>;
}
