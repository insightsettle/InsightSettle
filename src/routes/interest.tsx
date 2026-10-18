import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { interestRegisterStatus, submitInterest } from "@/lib/interest.functions";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/interest")({
  head: () => ({ meta: [
    { title: "Register your interest | Insight" },
      { property: "og:title", content: "Register your interest | Insight" },
      { property: "og:description", content: "Register your interest in Insight escrow for Gulf trade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    { name: "description", content: "Register your interest in Insight escrow for Gulf trade." },
    { name: "robots", content: "noindex" },
  ] }),
  component: InterestPage,
});

const sel = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm";

function InterestPage() {
  const { text } = useLocale();
  const statusFn = useServerFn(interestRegisterStatus);
  const submit = useServerFn(submitInterest);
  const status = useQuery({ queryKey: ["interest-status"], queryFn: () => statusFn() });
  const [f, setF] = useState({ fullName: "", company: "", email: "", country: "SA", role: "buyer", volume: "", consent: false });
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const open = Boolean(status.data?.enabled as boolean | undefined);
  return (
    <SiteShell>
      <div data-no-localize className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-3xl font-semibold">{text("Register your interest", "سجّل اهتمامك")}</h1>
        {!open ? (
          <Card className="mt-6"><CardContent className="p-6 text-sm leading-7 text-muted-foreground">{text("The interest register is not open yet. It opens once our notice for personal data has been finalised.", "سجل الاهتمام غير متاح بعد. يُفتح بعد اعتماد إشعار البيانات الشخصية.")}</CardContent></Card>
        ) : state === "done" ? (
          <Card className="mt-6"><CardContent className="p-6 text-sm">{text("Thank you. We will contact you at launch.", "شكراً لك. سنتواصل معك عند الإطلاق.")}</CardContent></Card>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={async (e) => {
            e.preventDefault(); setState("saving"); setMsg("");
            try { await submit({ data: { fullName: f.fullName, company: f.company || undefined, email: f.email, country: f.country as any, role: f.role as any, volume: (f.volume || undefined) as any, consent: true } }); setState("done"); }
            catch (err) { setState("error"); setMsg(err instanceof Error ? err.message : text("Could not save.", "تعذّر الحفظ.")); }
          }}>
            <div><Label htmlFor="ir-name">{text("Full name", "الاسم الكامل")}</Label><Input id="ir-name" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
            <div><Label htmlFor="ir-company">{text("Company (optional)", "المنشأة (اختياري)")}</Label><Input id="ir-company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
            <div><Label htmlFor="ir-email">{text("Email", "البريد الإلكتروني")}</Label><Input id="ir-email" type="email" required dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="ir-country">{text("Country", "الدولة")}</Label><select id="ir-country" className={sel} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{[["SA", "Saudi Arabia", "السعودية"], ["BH", "Bahrain", "البحرين"], ["AE", "UAE", "الإمارات"], ["KW", "Kuwait", "الكويت"], ["QA", "Qatar", "قطر"], ["OM", "Oman", "عُمان"], ["OTHER", "Other", "أخرى"]].map(([v, en, ar]) => <option key={v} value={v}>{text(en!, ar)}</option>)}</select></div>
              <div><Label htmlFor="ir-role">{text("You are", "أنت")}</Label><select id="ir-role" className={sel} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{[["buyer", "A buyer", "مشترٍ"], ["supplier", "A supplier", "مورّد"], ["contractor", "A contractor", "مقاول"], ["auction_organiser", "An auction organiser", "منظّم مزادات"], ["other", "Other", "أخرى"]].map(([v, en, ar]) => <option key={v} value={v}>{text(en!, ar)}</option>)}</select></div>
            </div>
            <div><Label htmlFor="ir-volume">{text("Typical monthly deal value (optional)", "قيمة الصفقات الشهرية المعتادة (اختياري)")}</Label><select id="ir-volume" className={sel} value={f.volume} onChange={(e) => setF({ ...f, volume: e.target.value })}><option value="">—</option>{[["lt_10k", "Under USD 10,000"], ["10k_50k", "USD 10,000–50,000"], ["50k_250k", "USD 50,000–250,000"], ["gt_250k", "Over USD 250,000"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <p className="rounded-lg bg-muted p-4 text-xs leading-6 text-muted-foreground">{text("Why we ask: to contact you when Insight launches, and to analyse demand as aggregated, anonymous statistics. We do not share your details. You can ask us to delete your entry at any time through the Help page.", "لماذا نطلب ذلك: للتواصل معك عند إطلاق إنسايت، ولتحليل الطلب في صورة إحصاءات مجمّعة لا تكشف هويتك. لا نشارك بياناتك مع أي جهة، ويمكنك طلب حذف تسجيلك في أي وقت عبر صفحة المساعدة.")}</p>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} className="mt-1" />{text("I agree to the use described above.", "أوافق على الاستخدام الموضّح أعلاه.")}</label>
            {msg && <p role="alert" className="text-sm text-destructive">{msg}</p>}
            <Button type="submit" disabled={state === "saving" || !f.consent}>{text("Register", "تسجيل")}</Button>
          </form>
        )}
      </div>
    </SiteShell>
  );
}
