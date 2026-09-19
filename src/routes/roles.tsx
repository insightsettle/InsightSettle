import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, ShieldCheck, UserCheck, Users } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/roles")({
  head: () => ({
    meta: [
      { title: "الأدوار والصلاحيات في إنسايت" },
      {
        name: "description",
        content:
          "ما يستطيعه الزائر والمستخدم الموثّق ومدير المنصة في إنسايت: إنشاء الصفقات، التمويل، التسليم، النزاعات، والإدارة والتدقيق.",
      },
      { property: "og:title", content: "الأدوار والصلاحيات في إنسايت" },
      { property: "og:description", content: "زائر، مستخدم موثّق، ومدير منصة — صلاحيات كل دور." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RolesPage,
});

const roles = [
  {
    icon: Users,
    name: "الزائر",
    tag: "بدون حساب",
    items: [
      "استعراض طريقة عمل المنصة",
      "قراءة نموذج العمولات",
      "الأسئلة الشائعة ومركز المساعدة",
      "الشروط والخصوصية وسياسة النزاعات",
    ],
  },
  {
    icon: UserCheck,
    name: "المستخدم الموثّق",
    tag: "بعد التوثيق وإثبات الهوية",
    items: [
      "إنشاء الصفقات وإدارتها ودعوة الطرف الآخر",
      "تمويل الصفقة وتأكيد التسليم أو الاستلام",
      "المحادثة ورفع المرفقات داخل الصفقة",
      "فتح نزاع ورفع المستندات",
      "إدارة الحساب البنكي وطلبات السحب",
      "تنزيل الفواتير والإيصالات والتقارير",
    ],
  },
  {
    icon: ShieldCheck,
    name: "مدير المنصة",
    tag: "فريق التشغيل والوساطة",
    items: [
      "لوحة مؤشرات: قيمة الصفقات، العمولات، النزاعات، نِسب الإتمام",
      "إدارة المستخدمين والبحث والتصفية",
      "مراجعة إثبات الهوية والموافقة أو الرفض",
      "إدارة النزاعات وإصدار قرارات الوساطة",
      "ضبط العمولات والحدود والمحتوى",
      "سجل تدقيق كامل لكل إجراء",
    ],
  },
];

const matrix = [
  { action: "استعراض الصفحات العامة", visitor: true, user: true, admin: true },
  { action: "إنشاء صفقة وتمويلها", visitor: false, user: true, admin: false },
  { action: "تأكيد التسليم أو الاستلام", visitor: false, user: true, admin: false },
  { action: "فتح نزاع ورفع مستندات", visitor: false, user: true, admin: false },
  { action: "إصدار قرار وساطة", visitor: false, user: false, admin: true },
  { action: "تعديل نسب العمولة", visitor: false, user: false, admin: true },
  { action: "الوصول إلى سجل التدقيق", visitor: false, user: false, admin: true },
];

function RolesPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl">الأدوار والصلاحيات</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          ثلاثة أدوار بصلاحيات مفصولة، بحيث لا يملك أي طرف التحكم بأموال الطرف الآخر.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.name} className="border-border/80 bg-card">
              <CardContent className="p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                  <r.icon className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-bold">{r.name}</h2>
                <p className="text-xs text-muted-foreground">{r.tag}</p>
                <ul className="mt-4 space-y-2.5">
                  {r.items.map((i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {i}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mt-16 text-2xl font-bold">مصفوفة الصلاحيات</h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem] text-right text-sm">
            <thead className="bg-card">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                <th>الإجراء</th>
                <th className="text-center">زائر</th>
                <th className="text-center">مستخدم موثّق</th>
                <th className="text-center">مدير</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.action} className="border-t border-border [&>td]:px-4 [&>td]:py-3">
                  <td className="text-muted-foreground">{row.action}</td>
                  <Cell on={row.visitor} />
                  <Cell on={row.user} />
                  <Cell on={row.admin} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12">
          <Button asChild>
            <Link to="/services">الخدمات والعمولات</Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}

function Cell({ on }: { on: boolean }) {
  return (
    <td className="text-center">
      {on ? (
        <Check className="mx-auto size-4 text-primary" />
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </td>
  );
}
