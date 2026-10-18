import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight, BadgeCheck, BriefcaseBusiness, Check, ChevronDown, Coins, FileCheck2, Gavel, HardHat, Package, PenTool, ShieldCheck, Truck, Wallet,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PublicPricing, publicPricingOptions } from "@/components/site/PublicPricing";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicPricingOptions),
  head: () => ({
    meta: [
      { title: "Insight | ادفع حين تطمئن، واستلم حين تُسلِّم" },
      { name: "description", content: "Insight brings the agreement, the payment and the delivery of every Gulf deal into one place: the buyer pays in their own currency and the supplier is paid after delivery and inspection. Demo with a simulated payment provider." },
      { property: "og:title", content: "Insight | Pay with confidence. Get paid on delivery." },
      { property: "og:description", content: "Clear terms, payment in your currency and payout after inspection, for goods, services, contracting and freelance deals across the Gulf. Demo; no real money moves." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { text } = useLocale();
  const pillars: [typeof ShieldCheck, string, string, string, string][] = [
    [FileCheck2, "Terms both sides sign off", "اتفاق لا لبس فيه", "What is delivered, when, and how it is accepted — agreed by both parties before anyone pays.", "ما سيُسلَّم، ومتى، وكيف يُقبل. يتفق عليه الطرفان قبل أي دفع."],
    [Coins, "Pay in your own currency", "ادفع بعملتك", "Six Gulf currencies and USD, with the rate locked for 15 minutes and every fee shown before you pay.", "ست عملات خليجية والدولار، بسعر صرف ثابت 15 دقيقة، وكل الرسوم أمامك قبل الدفع."],
    [Wallet, "Payout after inspection", "تحويل بعد التأكد", "The supplier is paid once the buyer has received the goods or work and the inspection period has passed.", "يُحوَّل المبلغ للمورد بعد أن يستلم المشتري ويفحص خلال مدة متفق عليها."],
  ];
  const steps: [string, string, string, string][] = [
    ["Agree the terms", "اتفقا على الشروط", "Create the deal, invite the other party and accept the terms together — on one page.", "أنشئ الصفقة وادعُ الطرف الآخر، واقبلا الشروط معاً في صفحة واحدة."],
    ["The buyer pays", "يدفع المشتري", "In their own currency, with a tax invoice issued on the spot.", "بعملته، مع فاتورة ضريبية تصدر فوراً."],
    ["The supplier delivers", "يسلّم المورد", "Ships the goods or completes the work; both sides follow every step.", "يشحن البضاعة أو يُنجز العمل، ويتابع الطرفان كل خطوة."],
    ["Inspect and pay out", "فحص ثم تحويل", "The buyer confirms, and the amount is paid out to the supplier. A problem? Open a dispute in one tap.", "يؤكد المشتري فيُحوَّل المبلغ للمورد. هناك مشكلة؟ افتح نزاعاً بضغطة."],
  ];
  const audiences: [string, string, [string, string][]][] = [
    ["For buyers", "للمشترين", [
      ["Never pay a stranger up front: payout follows delivery and inspection.", "لا تدفع للمجهول: التحويل للمورد يأتي بعد الاستلام والفحص."],
      ["Every term on record — quantity, specification, deadline.", "كل شرط موثّق: الكمية والمواصفات والموعد."],
      ["A clear dispute path if something arrives wrong.", "مسار نزاع واضح إن وصل شيء غير مطابق."],
    ]],
    ["For suppliers", "للموردين", [
      ["Ship knowing the buyer has already paid into the deal.", "اشحن وأنت تعلم أن المشتري دفع في الصفقة قبل أن تبدأ."],
      ["Get paid in your own currency, to your verified bank account.", "استلم بعملتك على حسابك البنكي الموثّق."],
      ["Win buyers in other Gulf countries who would not pay a new supplier in advance.", "اكسب مشترين من دول الخليج الأخرى لا يدفعون مقدماً لمورد جديد."],
    ]],
  ];
  const types: [typeof Package, string, string, string, string][] = [
    [Package, "Goods", "بضائع", "Shipments across the Gulf, with tracking and an inspection period.", "شحنات بين دول الخليج، مع تتبع ومدة فحص."],
    [BriefcaseBusiness, "Services", "خدمات", "One delivery or several milestones, each paid on its own.", "تسليم واحد أو مراحل، تُدفع كل مرحلة على حدة."],
    [HardHat, "Contracting & fit-out", "مقاولات وتجهيز", "2–20 milestones, an advance up to 20%, and retention released after the defects period.", "من 2 إلى 20 مرحلة، ودفعة مقدمة حتى 20%، ومحتجزات تُصرف بعد فترة الضمان."],
    [PenTool, "Freelance", "عمل حر", "Deliverables, an agreed number of revisions and acceptance on record.", "مخرجات واضحة، وعدد تعديلات متفق عليه، وقبول موثّق."],
  ];
  const faqs: [string, string, string, string][] = [
    ["Where is the money during the deal?", "أين يكون المبلغ أثناء الصفقة؟", "At launch, funds will be held by a licensed payment provider, and Insight runs the deal rules and keeps the record. This version is a demo with a simulated payment provider: no real money moves.", "عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، وتدير إنسايت قواعد الصفقة وتحفظ سجلها. النسخة الحالية تجريبية بمزوّد دفع محاكى، ولا تتحرك فيها أموال حقيقية."],
    ["What if the goods arrive damaged or incomplete?", "ماذا لو وصلت البضاعة تالفة أو ناقصة؟", "Open a dispute during the inspection period. The payout stops, the Insight team reviews both sides' evidence and issues a written decision approved by two staff members.", "افتح نزاعاً خلال مدة الفحص. يتوقف التحويل، ويراجع فريق إنسايت أدلة الطرفين ويصدر قراراً مكتوباً يعتمده موظفان."],
    ["Can I pay in a different currency from the supplier?", "هل أدفع بعملة غير عملة المورد؟", "Yes. You pay in your currency and the supplier is paid in theirs. You see the exchange rate, locked for 15 minutes, before you pay.", "نعم. تدفع بعملتك ويستلم المورد بعملته، وترى سعر الصرف ثابتاً لمدة 15 دقيقة قبل الدفع."],
    ["How much does it cost?", "كم تكلف الخدمة؟", "Creating a deal is free. The fee is charged only when the deal is paid, from USD 15 and never more than USD 3,500 per deal, and you choose who pays it.", "إنشاء الصفقة مجاني. تُحتسب الرسوم عند الدفع فقط، تبدأ من 15 دولاراً ولا تتجاوز 3,500 دولار للصفقة، وتختاران من يدفعها."],
  ];

  return <SiteShell><div data-no-localize>
    {/* Hero */}
    <section className="relative overflow-hidden border-b border-border bg-secondary">
      <div aria-hidden="true" className="gradient-brand absolute inset-x-0 top-0 h-1" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-accent-foreground"><ShieldCheck className="size-4 shrink-0" />{text("Deal management for businesses and individuals across the Gulf", "إدارة الصفقات للشركات والأفراد بين دول الخليج")}</span>
          <h1 className="mt-6 text-4xl leading-[1.3] font-bold sm:text-[3.4rem]">{text("Pay with confidence.", "ادفع حين تطمئن،")}<br /><span className="text-primary">{text("Get paid on delivery.", "واستلم حين تُسلِّم.")}</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-9 text-foreground/80">{text("Insight brings the agreement, the payment and the delivery of every deal into one place. The buyer pays in their own currency; the supplier is paid after delivery and inspection.", "إنسايت يجمع الاتفاق والدفع والتسليم في مكان واحد. يدفع المشتري بعملته، ويُحوَّل المبلغ للمورد بعد الاستلام والفحص.")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base"><Link to="/auth" search={{ mode: "signup" }}>{text("Start your first deal", "ابدأ صفقتك الأولى")}<ArrowUpRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="h-12 bg-card px-6 text-base"><Link to="/how-it-works">{text("See how it works", "شاهد كيف تعمل")}</Link></Button>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">{[["Free to create a deal", "إنشاء الصفقة مجاني"], ["Fees only when you pay", "الرسوم عند الدفع فقط"], ["Arabic and English", "بالعربية والإنجليزية"]].map(([en, ar]) => <li key={en} className="flex items-center gap-2"><Check className="size-4 text-primary" />{text(en ?? "", ar)}</li>)}</ul>
          <p className="mt-6 max-w-xl text-xs leading-6 text-muted-foreground">{text("Demo: the payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider, and Insight runs the deal rules and keeps the record.", "نسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية. عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، وتدير إنسايت قواعد الصفقة وتحفظ سجلها.")}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_30px_60px_-40px_rgb(12_42_34/0.45)] sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">{text("Example deal", "مثال")} · <bdi>Riyadh ← Manama</bdi></p><h2 className="mt-2 text-lg font-semibold">{text("Packaging materials", "مواد تغليف")}</h2></div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{text("Shipped", "تم الشحن")}</span>
          </div>
          <p className="mt-6 text-3xl font-bold tabular-nums"><bdi dir="ltr">{formatMoney(1000, "BHD")}</bdi></p>
          <div className="mt-6 grid grid-cols-4 gap-1.5" aria-hidden="true"><span className="h-2 rounded bg-brand-mint" /><span className="h-2 rounded bg-brand-mint" /><span className="gradient-brand h-2 rounded" /><span className="h-2 rounded bg-surface" /></div>
          <ol className="mt-2 grid grid-cols-4 gap-1.5 text-xs text-muted-foreground"><li>{text("Agreed", "الاتفاق")}</li><li>{text("Paid", "الدفع")}</li><li className="font-semibold text-primary">{text("Shipping", "الشحن")}</li><li>{text("Payout", "التحويل")}</li></ol>
          <div className="mt-6 space-y-3">{([[BadgeCheck, "Both parties verified", "الطرفان موثّقان"], [Truck, "Tracking DEMO-24817 · arrives Sunday", "رقم التتبع DEMO-24817 · يصل الأحد"], [Wallet, "Paid out after a 3-day inspection", "يُحوَّل بعد فحص 3 أيام"]] as const).map(([I, en, ar]) => <div key={en} className="flex items-center gap-3 rounded-xl bg-background p-3 text-sm"><I className="size-5 shrink-0 text-primary" /><span>{text(en, ar)}</span></div>)}</div>
        </div>
      </div>
    </section>

    {/* Currencies */}
    <section className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-6"><p className="text-sm text-muted-foreground">{text("Pay and get paid in the six Gulf currencies and USD — with exact decimals for each", "ادفع واستلم بعملات الخليج الست والدولار، بمنازل عشرية دقيقة لكل عملة")}</p><div className="flex flex-wrap gap-2" dir="ltr">{["SAR", "AED", "BHD", "KWD", "QAR", "OMR", "USD"].map(c => <span key={c} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold">{c}</span>)}</div></div></section>

    {/* Pillars */}
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <h2 className="max-w-2xl text-3xl font-bold leading-snug sm:text-4xl">{text("Everything a cross-border deal needs, without the back-and-forth", "كل ما تحتاجه صفقتك بين دولتين، دون رسائل ومتابعات لا تنتهي")}</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{pillars.map(([I, en, ar, d, da]) => <article key={en} className="rounded-2xl border border-border bg-card p-7"><span className="grid size-12 place-items-center rounded-xl bg-accent"><I className="size-6 text-primary" /></span><h3 className="mt-5 text-xl font-semibold">{text(en, ar)}</h3><p className="mt-3 leading-8 text-muted-foreground">{text(d, da)}</p></article>)}</div>
    </section>

    {/* How it works */}
    <section className="border-y border-border bg-secondary"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-bold sm:text-4xl">{text("Four steps, every one on record", "أربع خطوات، وكل خطوة موثّقة")}</h2><p className="mt-3 text-lg text-muted-foreground">{text("Each party always knows what happens next.", "يعرف كل طرف دائماً ما المطلوب منه الآن.")}</p></div><Link to="/how-it-works" className="font-semibold text-primary">{text("The full walkthrough", "الشرح الكامل")}</Link></div>
      <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{steps.map(([en, ar, d, da], i) => <li key={en} className="rounded-2xl border border-border bg-card p-6"><span className="grid size-11 place-items-center rounded-xl border border-border bg-secondary text-lg font-bold text-primary">{i + 1}</span><h3 className="mt-5 text-lg font-semibold">{text(en, ar)}</h3><p className="mt-3 leading-7 text-muted-foreground">{text(d, da)}</p></li>)}</ol>
    </div></section>

    {/* Buyers and suppliers */}
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20"><div className="grid gap-5 lg:grid-cols-2">{audiences.map(([en, ar, items]) => <article key={en} className="rounded-3xl border border-border bg-card p-8"><h2 className="text-2xl font-bold">{text(en, ar)}</h2><ul className="mt-6 space-y-4">{items.map(([ie, ia]) => <li key={ie} className="flex gap-3 leading-8"><span className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent"><Check className="size-4 text-primary" /></span><span>{text(ie, ia)}</span></li>)}</ul></article>)}</div></section>

    {/* Deal types */}
    <section className="bg-brand-strong text-primary-foreground"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <h2 className="text-3xl font-bold sm:text-4xl">{text("Built for the way the Gulf trades", "مصمم لطريقة التجارة في الخليج")}</h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{types.map(([I, en, ar, d, da]) => <article key={en} className="rounded-2xl bg-white/[0.06] p-6"><span aria-hidden="true" className="gradient-brand block h-1 w-12 rounded" /><I className="mt-5 size-7 text-brand-mint" /><h3 className="mt-4 text-lg font-semibold">{text(en, ar)}</h3><p className="mt-3 leading-7 text-white/75">{text(d, da)}</p></article>)}</div>
      <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-2xl bg-white/[0.06] p-6 sm:flex-row sm:items-center"><div className="flex items-start gap-4"><Gavel className="mt-1 size-7 shrink-0 text-brand-mint" /><div><h3 className="text-lg font-semibold">{text("Live auctions, paid properly", "مزادات مباشرة بدفع منظّم")}</h3><p className="mt-2 leading-7 text-white/75">{text("A 24-hour payment link for the winner in their own currency, two backup bidders, and separate payouts to the owner and the organiser. Available in the demo.", "رابط دفع لمدة 24 ساعة للفائز بعملته، ومزايدان احتياطيان، وتحويل منفصل للمالك وللمنظّم. متاحة في النسخة التجريبية.")}</p></div></div><Button asChild variant="secondary"><Link to="/how-it-works" hash="auctions">{text("Learn about auctions", "تعرّف على المزادات")}<ArrowUpRight className="size-4" /></Link></Button></div>
    </div></section>

    {/* Fees */}
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20"><h2 className="text-3xl font-bold sm:text-4xl">{text("Clear fees, before you pay", "رسوم واضحة قبل أن تدفع")}</h2><p className="mt-3 mb-10 max-w-2xl text-lg leading-8 text-muted-foreground">{text("Creating a deal is free. The fee is charged only when the deal is paid, and you choose who pays it: the buyer, the supplier, or half each.", "إنشاء الصفقة مجاني. تُحتسب الرسوم عند الدفع فقط، وتختاران من يدفعها: المشتري أو المورد أو مناصفة.")}</p><PublicPricing /></section>

    {/* FAQ */}
    <section className="border-t border-border bg-secondary"><div className="mx-auto max-w-4xl px-5 py-16 lg:py-20"><h2 className="text-3xl font-bold">{text("Questions we hear most", "أسئلة نسمعها كثيراً")}</h2><div className="mt-8 space-y-3">{faqs.map(([q, qa, a, aa]) => <details key={q} className="group rounded-2xl border border-border bg-card p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">{text(q, qa)}<ChevronDown className="size-5 shrink-0 text-muted-foreground transition group-open:rotate-180" /></summary><p className="mt-4 leading-8 text-muted-foreground">{text(a, aa)}</p></details>)}</div><Link to="/faq" className="mt-6 inline-block font-semibold text-primary">{text("All questions", "كل الأسئلة")}</Link></div></section>

    {/* CTA */}
    <section className="bg-brand-strong text-primary-foreground"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center"><div><h2 className="text-3xl font-bold">{text("Your next deal deserves a clear start", "صفقتك القادمة تستحق بداية واضحة")}</h2><p className="mt-3 text-white/75">{text("Create it in minutes and invite the other party with one link.", "أنشئها في دقائق، وادعُ الطرف الآخر برابط واحد.")}</p></div><Button asChild size="lg" variant="secondary" className="h-12 px-6 text-base"><Link to="/auth" search={{ mode: "signup" }}>{text("Create a free account", "أنشئ حسابك مجاناً")}<ArrowUpRight className="size-4" /></Link></Button></div></section>
  </div></SiteShell>;
}
