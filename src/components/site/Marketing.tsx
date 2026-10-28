import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "@/components/icons";
import { ArrowUpRight, Check, ChevronDown } from "@/components/icons";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

/** A bilingual string pair: [English, Arabic]. */
export type T2 = readonly [string, string];

/**
 * Brand icon tile. One consistent treatment for every icon on the public site:
 * "brand" = gradient tile with a white glyph; "soft" = mint tile with a green glyph; "dark" = for dark sections.
 */
export function IconTile({ icon: I, tone = "brand", size = "md", className }: { icon: LucideIcon; tone?: "brand" | "soft" | "dark"; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = size === "sm" ? "size-10 rounded-xl" : size === "lg" ? "size-16 rounded-[1.25rem]" : "size-12 rounded-2xl";
  const glyph = size === "sm" ? "size-5" : size === "lg" ? "size-8" : "size-6";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden",
        box,
        tone === "brand" && "gradient-brand text-white shadow-[0_12px_24px_-14px_rgb(19_128_101/0.9)] ring-1 ring-white/25",
        tone === "soft" && "bg-accent text-primary ring-1 ring-primary/10",
        tone === "dark" && "bg-white/10 text-brand-mint ring-1 ring-white/15",
        className,
      )}
    >
      {tone === "brand" && <span className="absolute inset-x-0 top-0 h-1/2 bg-white/15" />}
      <I className={cn("relative", glyph)} strokeWidth={1.9} />
    </span>
  );
}

export function SectionHeader({ eyebrow, title, intro, dark, className }: { eyebrow?: T2; title: T2; intro?: T2; dark?: boolean; className?: string }) {
  const { text } = useLocale();
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow && <p className={cn("text-sm font-semibold", dark ? "text-brand-mint" : "text-primary")}>{text(eyebrow[0], eyebrow[1])}</p>}
      <h2 className={cn("text-3xl font-bold leading-snug sm:text-4xl", eyebrow && "mt-2")}>{text(title[0], title[1])}</h2>
      {intro && <p className={cn("mt-3 text-lg leading-8", dark ? "text-white/75" : "text-muted-foreground")}>{text(intro[0], intro[1])}</p>}
    </div>
  );
}

export type PageHeroProps = { badge: T2; title: T2; highlight: T2; body: T2; points?: T2[]; aside?: ReactNode; primary?: { label: T2; to: string; signup?: boolean }; secondary?: { label: T2; to: string; hash?: string } };

export function PageHero({ badge, title, highlight, body, points, aside, primary, secondary }: PageHeroProps) {
  const { text } = useLocale();
  return (
    <section className="relative overflow-hidden border-b border-border bg-secondary">
      <div aria-hidden="true" className="gradient-brand absolute inset-x-0 top-0 h-1" />
      <div aria-hidden="true" className="blob-drift absolute -top-40 -end-40 size-[28rem] rounded-full bg-brand-teal/10 blur-3xl" />
      <div className={cn("relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 lg:py-20", aside && "lg:grid-cols-[1.1fr_0.9fr] lg:gap-16")}>
        <div className="reveal text-center lg:text-start">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary">{text(badge[0], badge[1])}</span>
          <h1 className="mt-5 text-4xl leading-[1.3] font-bold sm:text-5xl">{text(title[0], title[1])}<br /><span className="text-primary">{text(highlight[0], highlight[1])}</span></h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-9 text-foreground/80 lg:mx-0">{text(body[0], body[1])}</p>
          {(primary || secondary) && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              {primary && <Button asChild size="lg" className="group relative h-14 overflow-hidden rounded-full px-7 text-base shadow-[0_14px_30px_-16px_rgb(19_128_101/0.9)] hover:-translate-y-0.5 sm:h-12"><Link to={primary.to} {...(primary.signup ? { search: { mode: "signup" as const } } : {})}><span aria-hidden className="checkout-sheen pointer-events-none absolute inset-0" />{text(primary.label[0], primary.label[1])}<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link></Button>}
              {secondary && <Button asChild size="lg" variant="outline" className="h-14 rounded-full bg-card px-7 text-base sm:h-12"><Link to={secondary.to} {...(secondary.hash ? { hash: secondary.hash } : {})}>{text(secondary.label[0], secondary.label[1])}</Link></Button>}
            </div>
          )}
          {points && <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground lg:justify-start">{points.map(([en, ar]) => <li key={en} className="flex items-center gap-2"><Check className="size-4 text-primary" />{text(en, ar)}</li>)}</ul>}
        </div>
        {aside && <div className="animate-in fade-in zoom-in-95 duration-700 fill-mode-both delay-200">{aside}</div>}
      </div>
    </section>
  );
}

export type Feature = { icon: LucideIcon; title: T2; body: T2; id?: string };

/** Cards with a brand icon tile, a title and a short story. */
export function FeatureGrid({ items, cols = 3, dark }: { items: Feature[]; cols?: 2 | 3 | 4; dark?: boolean }) {
  const { text } = useLocale();
  return (
    <div className={cn("mt-10 grid gap-5 sm:grid-cols-2", cols === 3 && "lg:grid-cols-3", cols === 4 && "lg:grid-cols-4")}>
      {items.map(({ icon, title, body, id }) => (
        <article key={title[0]} id={id} className={cn("group scroll-mt-24 rounded-2xl p-6 transition-shadow", dark ? "bg-white/[0.06]" : "border border-border bg-card hover:shadow-[0_20px_40px_-30px_rgb(12_42_34/0.45)]")}>
          <IconTile icon={icon} tone={dark ? "dark" : "brand"} />
          <h3 className="mt-5 text-lg font-semibold">{text(title[0], title[1])}</h3>
          <p className={cn("mt-2 leading-7", dark ? "text-white/75" : "text-muted-foreground")}>{text(body[0], body[1])}</p>
        </article>
      ))}
    </div>
  );
}

export const DEAL_STEPS: [T2, T2][] = [
  [["Agree the terms", "اتفقا على الشروط"], ["Create the deal, invite the other party and accept the terms together — on one page.", "أنشئ الصفقة وادعُ الطرف الآخر، واقبلا الشروط معاً في صفحة واحدة."]],
  [["You pay into the deal", "تدفع في الصفقة"], ["In your own currency, with a tax invoice issued on the spot.", "بعملتك، مع فاتورة ضريبية تصدر فوراً."]],
  [["The other side delivers", "الطرف الآخر يُنجز"], ["Ships the goods or completes the work; you both follow every step.", "يشحن البضاعة أو يُنجز العمل، وتتابعان معاً كل خطوة."]],
  [["Check, then pay out", "تتأكد ثم يُحوَّل"], ["You confirm, and the amount is paid out to the other side. A problem? Open a dispute in one tap.", "تؤكد الاستلام فيُحوَّل المبلغ للطرف الآخر. هناك مشكلة؟ افتح نزاعاً بضغطة."]],
];

/** Numbered steps joined by a line on wide screens. */
export function StepsFlow({ steps = DEAL_STEPS }: { steps?: [T2, T2][] }) {
  const { text } = useLocale();
  return (
    <ol className="relative mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <span aria-hidden="true" className="steps-line gradient-brand absolute inset-x-[12.5%] top-[2.85rem] hidden h-0.5 opacity-60 lg:block" />
      {steps.map(([title, body], i) => (
        <li key={title[0]} className="relative rounded-2xl border border-border bg-card p-6">
          <span aria-hidden="true" className="gradient-brand relative grid size-11 place-items-center rounded-full text-lg font-bold text-white ring-4 ring-card">{i + 1}</span>
          <h3 className="mt-5 text-lg font-semibold">{text(title[0], title[1])}</h3>
          <p className="mt-2 leading-7 text-muted-foreground">{text(body[0], body[1])}</p>
        </li>
      ))}
    </ol>
  );
}

export const COMPARE_ROWS: [T2, T2, T2, T2][] = [
  [["If the other side never delivers", "إن لم يُسلّم الطرف الآخر"], ["Your money may be gone", "قد يضيع مبلغك"], ["The bank pays only against shipping documents", "البنك يدفع مقابل مستندات الشحن فقط"], ["The amount stays in the deal and you can open a dispute", "يبقى المبلغ في الصفقة ويمكنك فتح نزاع"]],
  [["When the other side is paid", "متى يستلم الطرف الآخر المبلغ"], ["Before work starts", "قبل أن يبدأ"], ["On documents, before you inspect the goods", "عند تقديم المستندات، قبل أن تفحص البضاعة"], ["After you receive and inspect", "بعد أن تستلم وتفحص"]],
  [["What it takes", "ما تحتاجه"], ["A bank transfer", "تحويل بنكي فقط"], ["A bank facility, forms and documents", "تسهيلات بنكية ونماذج ومستندات"], ["A free account and one page of terms", "حساب مجاني وصفحة واحدة للاتفاق"]],
  [["Small and mid-size deals", "الصفقات الصغيرة والمتوسطة"], ["Easy, but unprotected", "سهل، لكن بلا حماية"], ["Minimum bank charges make them costly", "الحد الأدنى لرسوم البنك يجعلها مكلفة"], ["Fees from BHD 6", "رسوم تبدأ من 6 دنانير بحرينية"]],
  [["Work paid in stages", "أعمال تُدفع على مراحل"], ["Hard to control", "صعب التحكم"], ["Rarely a fit", "نادراً ما يناسب"], ["2 to 20 milestones", "من 2 إلى 20 مرحلة"]],
];

/** Paying up front vs a letter of credit vs Insight: a table on wide screens, stacked cards on phones. */
export function CompareTable() {
  const { text } = useLocale();
  const heads: T2[] = [["Paying up front", "التحويل المقدّم"], ["Letter of credit", "خطاب الاعتماد"]];
  return (
    <>
      <div className="mt-10 hidden overflow-hidden rounded-2xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="p-4 text-start font-medium text-muted-foreground" scope="col"><span className="sr-only">{text("Question", "السؤال")}</span></th>
            {heads.map(([en, ar]) => <th key={en} className="p-4 text-start font-semibold" scope="col">{text(en, ar)}</th>)}
            <th className="bg-accent p-4 text-start font-semibold text-primary" scope="col">Insight</th>
          </tr></thead>
          <tbody>{COMPARE_ROWS.map(([q, a, b, c]) => (
            <tr key={q[0]} className="border-t border-border">
              <th scope="row" className="p-4 text-start font-semibold">{text(q[0], q[1])}</th>
              <td className="p-4 leading-7 text-muted-foreground">{text(a[0], a[1])}</td>
              <td className="p-4 leading-7 text-muted-foreground">{text(b[0], b[1])}</td>
              <td className="bg-accent/60 p-4 leading-7 font-medium"><span className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-primary" />{text(c[0], c[1])}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-8 space-y-4 md:hidden">{COMPARE_ROWS.map(([q, a, b, c]) => (
        <article key={q[0]} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">{text(q[0], q[1])}</h3>
          <dl className="mt-3 space-y-2 text-sm leading-6">
            <div><dt className="text-xs text-muted-foreground">{text(heads[0]![0], heads[0]![1])}</dt><dd>{text(a[0], a[1])}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{text(heads[1]![0], heads[1]![1])}</dt><dd>{text(b[0], b[1])}</dd></div>
            <div className="rounded-lg bg-accent p-2"><dt className="text-xs font-semibold text-primary">Insight</dt><dd className="font-medium">{text(c[0], c[1])}</dd></div>
          </dl>
        </article>
      ))}</div>
      <p className="mt-4 text-xs text-muted-foreground">{text("A general comparison for illustration. Letter-of-credit terms and charges vary by bank.", "مقارنة عامة للتوضيح، وشروط خطابات الاعتماد ورسومها تختلف من بنك لآخر.")}</p>
    </>
  );
}

export function FaqList({ items }: { items: [T2, T2][] }) {
  const { text } = useLocale();
  return (
    <div className="mt-8 space-y-3">{items.map(([q, a]) => (
      <details key={q[0]} className="group rounded-2xl border border-border bg-card p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">{text(q[0], q[1])}<ChevronDown className="size-5 shrink-0 text-muted-foreground transition group-open:rotate-180" /></summary>
        <p className="mt-4 leading-8 text-muted-foreground">{text(a[0], a[1])}</p>
      </details>
    ))}</div>
  );
}

export function CtaBand({ title, body, label = ["Create a free account", "أنشئ حسابك مجاناً"] }: { title: T2; body: T2; label?: T2 }) {
  const { text } = useLocale();
  return (
    <section className="relative overflow-hidden bg-brand-strong text-primary-foreground">
      <div aria-hidden="true" className="gradient-brand absolute inset-x-0 top-0 h-1" />
      <div aria-hidden="true" className="blob-drift pointer-events-none absolute -bottom-24 -end-24 size-72 rounded-full bg-brand-mint/15 blur-3xl" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
        <div><h2 className="text-3xl font-bold">{text(title[0], title[1])}</h2><p className="mt-3 text-white/75">{text(body[0], body[1])}</p></div>
        <Button asChild size="lg" variant="secondary" className="group relative h-12 overflow-hidden px-6 text-base hover:-translate-y-0.5"><Link to="/auth" search={{ mode: "signup" }}><span aria-hidden className="checkout-sheen pointer-events-none absolute inset-0" />{text(label[0], label[1])}<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link></Button>
      </div>
    </section>
  );
}
