import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  FileCheck2,
  Lock,
  MessageSquare,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import logo from "@/assets/insight-logo.png";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatSAR, statusLabels, type DealStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "إنسايت | منصة ضمان الأموال بين المشتري والبائع" },
      {
        name: "description",
        content:
          "إنسايت منصة وساطة آمنة تحتجز الأموال حتى تأكيد الاستلام، مع مراحل دفع، سجل موثّق، ومركز نزاعات مدعوم بالذكاء الاصطناعي.",
      },
      { property: "og:title", content: "إنسايت | منصة ضمان الأموال" },
      {
        property: "og:description",
        content: "احتجاز الأموال حتى تأكيد الاستلام، عمولات واضحة، وحلّ نزاعات عادل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const statuses: DealStatus[] = [
  "pending_funding",
  "held",
  "delivered",
  "under_review",
  "released",
  "refunded",
  "disputed",
];

function HomePage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <ShieldCheck className="size-3.5" /> وسيط مالي موثوق — نسخة تجريبية
            </span>
            <h1 className="mt-6 text-4xl leading-[1.15] font-extrabold tracking-tight sm:text-5xl">
              أموالك محفوظة حتى
              <span className="text-gradient-mint"> تتأكد من الاستلام</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              تحتجز إنسايت مبلغ الصفقة لدى وسيط محايد، ولا تُفرج عنه للبائع إلا بعد تأكيد المشتري
              للاستلام، أو بعد قرار وسيط في حال النزاع — مع سجل زمني موثّق لكل خطوة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard">
                  ابدأ صفقة مضمونة <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/how-it-works">كيف تعمل المنصة؟</Link>
              </Button>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                { k: "قيمة الصفقات المحمية", v: "١٢.٤ مليون ر.س" },
                { k: "نسبة الصفقات المكتملة", v: "٩٦٪" },
                { k: "متوسط حلّ النزاع", v: "٣ أيام" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-xs text-muted-foreground">{s.k}</dt>
                  <dd className="mt-1 text-lg font-bold text-primary">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Card className="glow-mint border-border/80 bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <img src={logo} alt="" className="size-9 rounded-lg object-contain" />
                  <div>
                    <p className="text-sm font-semibold">صفقة DL-10428</p>
                    <p className="text-xs text-muted-foreground">تصميم هوية بصرية</p>
                  </div>
                </div>
                <StatusBadge status="under_review" />
              </div>
              <div className="mt-6 rounded-xl border border-border bg-background p-5">
                <p className="text-xs text-muted-foreground">المبلغ المحتجز</p>
                <p className="mt-1 text-3xl font-extrabold text-primary">{formatSAR(12000)}</p>
                <p className="mt-2 text-xs text-warning">بيانات تجريبية</p>
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                {[
                  { icon: Wallet, t: "تمويل الصفقة", d: "تم — 29 أغسطس" },
                  { icon: FileCheck2, t: "تأكيد التسليم", d: "تم — 17 سبتمبر" },
                  { icon: BadgeCheck, t: "تأكيد الاستلام", d: "بانتظارك" },
                ].map((row) => (
                  <li key={row.t} className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
                      <row.icon className="size-4" />
                    </span>
                    <span className="font-medium">{row.t}</span>
                    <span className="mr-auto text-xs text-muted-foreground">{row.d}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-2xl font-bold sm:text-3xl">خدماتنا</h2>
        <p className="mt-2 text-muted-foreground">
          كل ما تحتاجه لإتمام صفقة بين طرفين لا يعرفان بعضهما.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Lock,
              t: "احتجاز آمن للأموال",
              d: "يُحوَّل المبلغ إلى حساب ضمان محايد ويبقى محتجزًا حتى تحقّق شروط الإفراج المتفق عليها.",
            },
            {
              icon: Wallet,
              t: "صفقات متعددة المراحل",
              d: "قسّم الصفقة إلى دفعات مرتبطة بمخرجات، وأفرج عن كل دفعة عند اكتمال مرحلتها.",
            },
            {
              icon: MessageSquare,
              t: "محادثة ومرفقات موثّقة",
              d: "تواصل داخل الصفقة مع رفع ملفات مع التحقق من النوع والحجم، وكل رسالة مسجّلة بوقتها.",
            },
            {
              icon: Scale,
              t: "مركز نزاعات ووساطة",
              d: "قدّم وصف النزاع ومستنداتك، ويحلّل الذكاء الاصطناعي الحالة ويقترح خطوات الحل للوسيط.",
            },
            {
              icon: FileCheck2,
              t: "فواتير وإيصالات وتقارير",
              d: "مستندات قابلة للتنزيل لكل عملية تمويل وإفراج واسترداد مع سجل تدقيق كامل.",
            },
            {
              icon: ShieldCheck,
              t: "حماية الحساب",
              d: "توثيق البريد والجوال، إثبات الهوية عند الحاجة، تحقق بخطوتين، وإدارة الجلسات.",
            },
          ].map((f) => (
            <Card key={f.t} className="border-border/80 bg-card transition-colors hover:border-primary/40">
              <CardContent className="p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">حالات الصفقة</h2>
          <p className="mt-2 text-muted-foreground">
            سبع حالات واضحة يعرف كل طرف من خلالها موقع أمواله في أي لحظة.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {statuses.map((s) => (
              <StatusBadge key={s} status={s} className="px-4 py-2 text-sm" />
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {statuses.map((s) => statusLabels[s]).join(" ← ")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Card className="glow-mint overflow-hidden border-primary/30 bg-card">
          <CardContent className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold">جاهز لصفقة بلا مخاطرة؟</h2>
              <p className="mt-2 text-muted-foreground">
                أنشئ الصفقة، أرسل الدعوة للطرف الآخر، ودع إنسايت يحمي المبلغ حتى التسليم.
              </p>
            </div>
            <Button asChild size="lg" className="mr-auto shrink-0">
              <Link to="/dashboard">الدخول إلى لوحة التحكم</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </SiteShell>
  );
}
