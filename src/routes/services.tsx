import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { calcFee, feeTiers, formatSAR } from "@/lib/demo-data";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "الخدمات والعمولات | إنسايت" },
      {
        name: "description",
        content:
          "تفاصيل خدمات إنسايت ونموذج العمولات: 3% حتى 5,000 ر.س، 2.5% حتى 50,000 ر.س، 1.8% لما فوقها، والوساطة مجانية.",
      },
      { property: "og:title", content: "الخدمات والعمولات | إنسايت" },
      { property: "og:description", content: "عمولات متدرجة واضحة وحاسبة تفاعلية بالريال السعودي." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

const services = [
  {
    t: "صفقة بدفعة واحدة",
    d: "مناسبة للصفقات القصيرة: تمويل واحد، تسليم واحد، إفراج واحد.",
    points: ["حماية كاملة للمبلغ", "مدة تأكيد استلام محددة", "إيصال وفاتورة"],
  },
  {
    t: "صفقة متعددة المراحل",
    d: "قسّم المشروع إلى دفعات مرتبطة بمخرجات، مع إفراج جزئي لكل مرحلة.",
    points: ["حتى 10 مراحل", "إفراج جزئي مستقل", "تتبّع لكل مرحلة"],
  },
  {
    t: "الوساطة وحلّ النزاعات",
    d: "مراجعة الأدلة من الطرفين وإصدار قرار ملزم وفق سياسة المنصة.",
    points: ["تحليل أولي بالذكاء الاصطناعي", "مهلة رد للطرفين", "قرار موثّق"],
  },
  {
    t: "المحفظة والسحب",
    d: "متابعة الرصيد المتاح والمحتجز وطلبات السحب إلى حسابك البنكي.",
    points: ["حسابات بنكية متعددة", "سجل تحويلات", "تقارير قابلة للتنزيل"],
  },
];

function ServicesPage() {
  const [amount, setAmount] = useState(18000);
  const { fee, rate } = calcFee(amount);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl">الخدمات والعمولات</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          عمولة واحدة واضحة على قيمة الصفقة، تُخصم عند الإفراج — بلا رسوم اشتراك أو رسوم خفية.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {services.map((s) => (
            <Card key={s.t} className="border-border/80 bg-card">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold">{s.t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.points.map((p) => (
                    <li
                      key={p}
                      className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[26rem] text-right text-sm">
              <thead className="bg-card">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                  <th>قيمة الصفقة</th>
                  <th>نسبة العمولة</th>
                  <th>الحد الأدنى</th>
                </tr>
              </thead>
              <tbody>
                {feeTiers.map((t) => (
                  <tr key={t.label} className="border-t border-border [&>td]:px-4 [&>td]:py-3">
                    <td className="text-muted-foreground">{t.label}</td>
                    <td className="font-semibold text-primary">
                      <bdi dir="ltr">{(t.rate * 100).toFixed(1)}%</bdi>
                    </td>
                    <td className="text-muted-foreground">{t.min ? formatSAR(t.min) : "—"}</td>
                  </tr>
                ))}
                <tr className="border-t border-border [&>td]:px-4 [&>td]:py-3">
                  <td className="text-muted-foreground">الوساطة وحلّ النزاع</td>
                  <td className="font-semibold text-primary">مجانًا</td>
                  <td className="text-muted-foreground">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Card className="glow-mint border-primary/30 bg-card">
            <CardContent className="p-6">
              <h2 className="font-bold">حاسبة العمولة</h2>
              <div className="mt-5 space-y-3">
                <Label htmlFor="amount">قيمة الصفقة (ر.س)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={100}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                />
                <Slider
                  value={[Math.min(amount, 200000)]}
                  min={100}
                  max={200000}
                  step={100}
                  onValueChange={(v) => setAmount(v[0] ?? 0)}
                />
              </div>
              <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
                <Row k="نسبة العمولة" v={<bdi dir="ltr">{(rate * 100).toFixed(1)}%</bdi>} />
                <Row k="العمولة" v={formatSAR(fee)} />
                <Row k="يستلم البائع" v={formatSAR(Math.max(0, amount - fee))} strong />
              </dl>
              <p className="mt-4 text-xs text-warning">بيانات تجريبية — للتوضيح فقط.</p>
              <Button asChild className="mt-5 w-full">
                <Link to="/dashboard">أنشئ صفقة بهذه القيمة</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={strong ? "text-lg font-bold text-primary" : "font-medium"}>{v}</dd>
    </div>
  );
}
