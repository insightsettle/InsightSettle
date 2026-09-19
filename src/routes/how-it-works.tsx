import { Link, createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { statusLabels, type DealStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "كيف تعمل إنسايت | رحلة الصفقة خطوة بخطوة" },
      {
        name: "description",
        content:
          "من إنشاء الصفقة ودعوة الطرف الآخر إلى التمويل والتسليم وتأكيد الاستلام أو فتح نزاع — رحلة الصفقة في إنسايت.",
      },
      { property: "og:title", content: "كيف تعمل إنسايت" },
      { property: "og:description", content: "رحلة الصفقة من الإنشاء حتى الإفراج أو الاسترداد." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { t: "إنشاء الحساب والتوثيق", d: "توثيق البريد والجوال، وإثبات الهوية عند تجاوز حدود معينة." },
  { t: "إنشاء الصفقة", d: "العنوان، الوصف، القيمة والعملة، الأطراف، مدة التسليم، وشروط الإفراج والاسترداد." },
  { t: "دعوة الطرف الآخر", d: "رابط دعوة آمن ينتهي بعد مدة محددة ويؤكّد هوية الطرف المقابل." },
  { t: "تمويل الصفقة", d: "يُموّل المشتري المبلغ عبر مزوّد الدفع ويصبح محتجزًا لدى الوسيط." },
  { t: "التسليم", d: "يؤكّد البائع التسليم مع ملاحظات وملفات إثبات داخل الصفقة." },
  { t: "تأكيد الاستلام", d: "يؤكّد المشتري الاستلام أو يطلب تعديلًا أو يفتح نزاعًا خلال المدة المتاحة." },
  { t: "الإفراج أو الاسترداد", d: "تحويل المبلغ للبائع أو إعادته للمشتري مع إيصال وسجل زمني موثّق." },
];

const statuses: DealStatus[] = [
  "pending_funding",
  "held",
  "delivered",
  "under_review",
  "released",
  "refunded",
  "disputed",
];

const statusDesc: Record<DealStatus, string> = {
  pending_funding: "تم إنشاء الصفقة ولم يُحوَّل المبلغ بعد.",
  held: "المبلغ محتجز لدى الوسيط ويمكن بدء التنفيذ.",
  delivered: "أكّد البائع التسليم وأرفق الإثباتات.",
  under_review: "المشتري يراجع المخرجات قبل التأكيد.",
  released: "أُفرج عن المبلغ للبائع مع إيصال.",
  refunded: "أُعيد المبلغ للمشتري وفق سياسة الاسترداد.",
  disputed: "الصفقة موقوفة بانتظار قرار الوسيط.",
};

function HowItWorks() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl">كيف تعمل المنصة</h1>
        <p className="mt-3 text-muted-foreground">
          سبع خطوات واضحة، وكل خطوة تُسجّل بوقتها في سجل الصفقة.
        </p>

        <ol className="mt-10 space-y-4">
          {steps.map((s, i) => (
            <li key={s.t}>
              <Card className="border-border/80 bg-card">
                <CardContent className="flex gap-4 p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold">{s.t}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <h2 className="mt-16 text-2xl font-bold">شرح الحالات</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {statuses.map((s) => (
            <Card key={s} className="border-border/80 bg-card">
              <CardContent className="p-5">
                <StatusBadge status={s} />
                <p className="mt-3 text-sm text-muted-foreground">{statusDesc[s]}</p>
                <p className="sr-only">{statusLabels[s]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/services">اطّلع على العمولات</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">تجربة لوحة التحكم</Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
