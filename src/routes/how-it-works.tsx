import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, CircleCheckBig, FileSignature, Gavel, HardHat, Link2, PackageCheck, SearchCheck, Wallet } from "lucide-react";

import { CtaBand, IconTile, PageHero, SectionHeader, type T2 } from "@/components/site/Marketing";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import type { DealStatus } from "@/lib/demo-data";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Insight works | From agreement to payout" },
      { name: "description", content: "Follow an Insight deal from the agreement and payment through delivery, inspection and payout — or a dispute." },
      { property: "og:title", content: "How Insight works" },
      { property: "og:description", content: "Seven clear steps from agreement to payout." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const STEPS: [typeof BadgeCheck, T2, T2][] = [
  [BadgeCheck, ["Create and verify your account", "أنشئ حسابك ووثّقه"], ["Confirm your email and phone. Identity checks apply when required.", "أكّد بريدك وجوالك، ويُطلب توثيق الهوية عند الحاجة."]],
  [FileSignature, ["Define the deal", "حدّد تفاصيل الصفقة"], ["What is delivered, the amount, the currency, the delivery window and how it is accepted.", "ما سيُسلَّم، والمبلغ، والعملة، وموعد التسليم، وكيف يُقبل."]],
  [Link2, ["Invite the other party", "ادعُ الطرف الآخر"], ["Send one secure link. They review the terms and accept, or ask for a change.", "أرسل رابطاً آمناً واحداً، فيراجع الشروط ويقبلها أو يطلب تعديلها."]],
  [Wallet, ["The payer pays into the deal", "يدفع الدافع في الصفقة"], ["In their own currency, with the rate and every fee shown first. In this demo the payment provider is simulated and no real money moves.", "بعملته، مع سعر الصرف وكل الرسوم أمامه أولاً. في هذه النسخة التجريبية مزوّد الدفع محاكى ولا تتحرك أموال حقيقية."]],
  [PackageCheck, ["The payee delivers", "يُنجز المستفيد ما اتفقتما عليه"], ["Ships the goods or completes the work, with tracking, notes and files.", "يشحن البضاعة أو يُنجز العمل، مع رقم التتبع والملاحظات والملفات."]],
  [SearchCheck, ["The payer checks", "يتأكد الدافع"], ["Within the agreed inspection period: accept, ask for a revision, or open a dispute.", "خلال مدة الفحص المتفق عليها: يقبل، أو يطلب تعديلاً، أو يفتح نزاعاً."]],
  [CircleCheckBig, ["Payout to the payee", "التحويل للمستفيد"], ["On acceptance, or automatically when the inspection period ends without an objection. Insight keeps the receipt and the full timeline.", "عند القبول، أو تلقائياً بانتهاء مدة الفحص دون اعتراض. وتحفظ إنسايت الإيصال والسجل الكامل."]],
];

const STATUSES: DealStatus[] = ["pending_funding", "held", "delivered", "under_review", "released", "refunded", "disputed"];
const DESC: Partial<Record<DealStatus, T2>> = {
  pending_funding: ["The terms are ready; the payer has not paid yet.", "الشروط جاهزة، ولم يدفع الدافع بعد."],
  held: ["The payer has paid into the deal and the work can begin.", "دفع الدافع في الصفقة، ويمكن بدء العمل."],
  delivered: ["The payee has marked the deal as delivered.", "أكّد المستفيد التسليم."],
  under_review: ["The payer is checking what was delivered.", "يتأكد الدافع مما سُلِّم."],
  released: ["The amount has been paid to the payee.", "حُوِّل المبلغ للمستفيد."],
  refunded: ["The amount has been returned to the payer under the refund policy.", "أُعيد المبلغ للدافع وفق سياسة الاسترداد."],
  disputed: ["The payout is paused while the Insight team reviews both sides' evidence.", "التحويل متوقف بينما يراجع فريق إنسايت أدلة الطرفين."],
};

function Page() {
  const { text } = useLocale();
  return <SiteShell><div data-no-localize>
    <PageHero
      badge={["How it works", "كيف تعمل"]}
      title={["From the first agreement", "من أول اتفاق"]}
      highlight={["to the last payment.", "حتى آخر دفعة."]}
      body={["Seven clear steps. At every moment each side knows what has happened, and what it needs to do next.", "سبع خطوات واضحة. في كل لحظة يعرف كل طرف ما حدث، وما المطلوب منه الآن."]}
      primary={{ label: ["Start your first deal", "ابدأ صفقتك الأولى"], to: "/auth", signup: true }}
      secondary={{ label: ["Fee calculator", "حاسبة الرسوم"], to: "/pricing" }}
    />

    <section className="mx-auto max-w-4xl px-5 py-16 lg:py-20">
      <div className="mb-8 rounded-2xl border border-border bg-secondary p-5 text-sm leading-7"><p className="font-semibold">{text("Who is who", "من هو من")}</p><p className="mt-1 text-muted-foreground">{text("On this page, the payer is the side that pays and the payee is the side the money is for. Inside your deal you see the everyday names: buyer and seller, client and service provider, owner and contractor.", "في هذه الصفحة نسمّي من يدفع «الدافع»، ومن يستحق المبلغ «المستفيد». وداخل صفقتك ترى الاسم المعتاد لها: المشتري والبائع، العميل ومقدّم الخدمة، المالك والمقاول.")}</p></div>
      <ol className="relative space-y-4">
        <span aria-hidden="true" className="gradient-brand absolute top-8 bottom-8 start-[2.75rem] w-0.5 opacity-50 sm:start-[3rem]" />
        {STEPS.map(([I, t, d], i) => (
          <li key={t[0]} className="relative flex gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <IconTile icon={I} className="ring-4 ring-card" />
            <div><p className="text-xs font-semibold text-primary">{text("Step", "الخطوة")} {i + 1}</p><h2 className="mt-1 text-lg font-semibold">{text(t[0], t[1])}</h2><p className="mt-1.5 leading-7 text-muted-foreground">{text(d[0], d[1])}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs leading-6 text-muted-foreground">{text("The platform supports SAR, BHD, AED, QAR, KWD, OMR and USD. In Bahrain and Saudi Arabia, funds are to be held by payment providers licensed by the Central Bank of Bahrain (CBB) and the Saudi Central Bank (SAMA), respectively. Insight runs the deal rules and keeps the record; Insight is not licensed, regulated or approved by either central bank.", "تدعم المنصة الريال السعودي والدينار البحريني والدرهم الإماراتي والريال القطري والدينار الكويتي والريال العُماني والدولار الأمريكي. في البحرين والسعودية تُحفظ الأموال لدى مزوّدي دفع مرخّصين من مصرف البحرين المركزي والبنك المركزي السعودي على التوالي. تدير إنسايت قواعد الصفقة وتحفظ سجلها، وإنسايت غير مرخّصة أو خاضعة لرقابة أو معتمدة من أيٍّ من البنكين المركزيين.")}</p>
    </section>

    <section className="border-y border-border bg-secondary"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader title={["What each status means", "ماذا تعني كل حالة"]} />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{STATUSES.map((s) => <article key={s} className="rounded-2xl border border-border bg-card p-5"><StatusBadge status={s} /><p className="mt-3 text-sm leading-7 text-muted-foreground">{DESC[s] ? text(DESC[s]![0], DESC[s]![1]) : null}</p></article>)}</div>
    </div></section>

    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 lg:grid-cols-2 lg:py-20">
      <article id="contracting" className="scroll-mt-24 rounded-3xl border border-border bg-card p-8">
        <div className="flex items-center gap-4"><IconTile icon={HardHat} size="lg" /><h2 className="text-2xl font-bold">{text("Contracting in stages", "المقاولات على مراحل")}</h2></div>
        <ul className="mt-6 space-y-3 leading-8 text-muted-foreground">{([["2 to 20 milestones, each paid when you approve it.", "من 2 إلى 20 مرحلة، تُدفع كل مرحلة حين تعتمدها."], ["An advance of up to 20% to get the work started.", "دفعة مقدّمة حتى 20% لبدء العمل."], ["Pay the whole contract up front, or each milestone when it is due.", "ادفع العقد كاملاً مقدّماً، أو كل مرحلة عند موعدها."], ["Retention released after the defects period.", "محتجز ضمان يُصرف بعد فترة ضمان العيوب."]] as const).map(([en, ar]) => <li key={en} className="flex gap-3"><span className="mt-3 size-1.5 shrink-0 rounded-full bg-primary" />{text(en, ar)}</li>)}</ul>
      </article>
      <article id="auctions" className="scroll-mt-24 rounded-3xl border border-border bg-card p-8">
        <div className="flex items-center gap-4"><IconTile icon={Gavel} size="lg" /><h2 className="text-2xl font-bold">{text("Social-media auctions", "مزادات وسائل التواصل")}</h2></div>
        <ul className="mt-6 space-y-3 leading-8 text-muted-foreground">{([["You run the auction on Instagram or TikTok — the bidding does not take place on Insight.", "تدير المزاد على إنستغرام أو تيك توك، والمزايدة لا تجري داخل إنسايت."], ["Once you record the winner, they get a payment link with a 24-hour deadline.", "حين تسجّل الفائز، يصله رابط دفع بمهلة 24 ساعة."], ["If they do not pay, the offer passes to the backup bidder automatically.", "إن لم يدفع، ينتقل العرض تلقائياً إلى المزايد الاحتياطي."], ["After inspection, the owner and the organiser are paid separately.", "بعد الفحص يُحوَّل للمالك وللمنظّم كلٌّ على حدة."]] as const).map(([en, ar]) => <li key={en} className="flex gap-3"><span className="mt-3 size-1.5 shrink-0 rounded-full bg-primary" />{text(en, ar)}</li>)}</ul>
      </article>
    </section>

    <CtaBand title={["Ready for your first deal?", "جاهز لصفقتك الأولى؟"]} body={["Creating a deal is free. Fees only when you pay.", "إنشاء الصفقة مجاني، والرسوم عند الدفع فقط."]} />
  </div></SiteShell>;
}
