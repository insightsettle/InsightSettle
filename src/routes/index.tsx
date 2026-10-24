import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight, BadgeCheck, BriefcaseBusiness, Building2, Check, CircleAlert, Coins, FileCheck2, Gavel, Globe, HardHat, Lock, Package, PenTool, Receipt, Scale, ShieldCheck, Truck, Users, Wallet,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PublicPricing, publicPricingOptions } from "@/components/site/PublicPricing";
import { CompareTable, CtaBand, FaqList, IconTile, StepsFlow } from "@/components/site/Marketing";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { ContactPopup } from "@/components/site/ContactPopup";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicPricingOptions),
  head: () => ({
    meta: [
      { title: "Insight | ادفع حين تطمئن، واستلم حين تُسلِّم" },
      { name: "description", content: "Buying from a supplier you have never met? Insight keeps the agreement, the payment and the delivery in one place: you pay in your own currency, and the supplier is paid after you receive and inspect. Demo with a simulated payment provider." },
      { property: "og:title", content: "Insight | Pay with confidence. Get paid on delivery." },
      { property: "og:description", content: "Clear terms, payment in your currency and payout after inspection — for imports, Gulf trade, contracting, services and freelance work. Demo; no real money moves." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { text } = useLocale();
  const pains: [string, string][] = [
    ["A factory you have never met asks for 30% up front before it starts production.", "مصنع لم تتعامل معه من قبل يطلب 30% مقدّماً قبل أن يبدأ التصنيع."],
    ["You shipped the goods weeks ago and are still chasing the buyer for payment.", "شحنت البضاعة منذ أسابيع، وما زلت تلاحق المشتري ليدفع."],
    ["The contractor took the first payment, and the work slowed down.", "أخذ المقاول الدفعة الأولى، ثم تباطأ العمل."],
  ];
  const pillars: [typeof ShieldCheck, string, string, string, string][] = [
    [FileCheck2, "Terms both sides sign off", "اتفاق لا لبس فيه", "What is delivered, when, and how it is accepted — agreed by both parties before anyone pays.", "ما سيُسلَّم، ومتى، وكيف يُقبل. يتفق عليه الطرفان قبل أي دفع."],
    [Coins, "Pay in your own currency", "ادفع بعملتك", "Six Gulf currencies and USD, with the rate locked for 15 minutes and every fee shown before you pay.", "ست عملات خليجية والدولار، بسعر صرف ثابت 15 دقيقة، وكل الرسوم أمامك قبل الدفع."],
    [Wallet, "Payout after inspection", "تحويل بعد التأكد", "The other side is paid only after you receive and check, within an agreed inspection period.", "لا يُحوَّل المبلغ للطرف الآخر إلا بعد أن تستلم وتتأكد، خلال مدة فحص متفق عليها."],
  ];
  const audiences: [string, string, [string, string][], typeof ShieldCheck, "/individuals" | "/business", [string, string]][] = [
    ["For individuals", "للأفراد", [
      ["A used car, a watch from an Instagram seller, a freelancer: never pay a stranger up front.", "سيارة مستعملة، ساعة من بائع على إنستغرام، مستقل لمشروعك: لا تدفع مقدّماً لمن لا تعرفه."],
      ["The seller sees the money is paid — no screenshots of receipts.", "البائع يرى أن المبلغ مدفوع، دون صور إيصالات."],
      ["A clear dispute path if something arrives wrong.", "مسار نزاع واضح إن وصل شيء غير مطابق."],
    ], Users, "/individuals", ["Insight for individuals", "إنسايت للأفراد"]],
    ["For business", "للشركات", [
      ["Imports from factories abroad and suppliers in neighbouring countries, in your currency.", "الاستيراد من مصانع في الخارج والشراء من دول مجاورة، بعملتك."],
      ["Fit-out and contracting in 2 to 20 milestones, with retention.", "التجهيز والمقاولات على 2 إلى 20 مرحلة، مع محتجز ضمان."],
      ["A tax invoice for every payment and a full audit trail.", "فاتورة ضريبية لكل دفعة، وسجل كامل للتدقيق."],
    ], Building2, "/business", ["Insight for business", "إنسايت للشركات"]],
  ];
  const types: [typeof Package, string, string, string, string][] = [
    [Globe, "Importing from a factory abroad", "الاستيراد من مصنع في الخارج", "Agreed a shipment in US dollars with a factory in China or Turkey? Pay into the deal; the factory is paid only after the shipment arrives and you inspect it.", "اتفقت مع مصنع في الصين أو تركيا على شحنة بالدولار؟ ادفع في الصفقة، ولا يُحوَّل المبلغ للمصنع إلا بعد وصول الشحنة وفحصها."],
    [Package, "Buying from a neighbouring country", "الشراء من دولة مجاورة", "Buying from a supplier in Dubai or selling to a buyer in Kuwait? Each side pays and gets paid in its own currency, at a rate locked for 15 minutes.", "تشتري من مورد في دبي أو تبيع لمشترٍ في الكويت؟ كلٌّ يدفع ويستلم بعملته، بسعر صرف ثابت 15 دقيقة."],
    [HardHat, "Contracting & fit-out", "المقاولات والتجهيز", "Fit out your showroom or office in stages: each milestone is paid when you approve it, and retention is released after the defects period.", "جهّز معرضك أو مكتبك على مراحل: كل مرحلة تُدفع حين تعتمدها، والمحتجز يُصرف بعد فترة ضمان العيوب."],
    [BriefcaseBusiness, "Business services", "خدمات الشركات", "Marketing, software, consulting: clear deliverables and a set date, with payment after acceptance.", "تسويق، برمجة، استشارات: مخرجات واضحة وموعد محدد، والدفع بعد القبول."],
    [PenTool, "Freelance", "العمل الحر", "Freelancers start knowing the client has paid; clients pay knowing nothing moves until they accept the work.", "المستقل يبدأ وهو يعلم أن العميل دفع، والعميل يدفع وهو يعلم أن المبلغ لن يُحوَّل قبل أن يقبل العمل."],
    [Gavel, "Social-media auctions", "مزادات وسائل التواصل", "Run your auction live on Instagram or TikTok; Insight sets the payment steps after it: 24 hours for the winner, two backup bidders, and separate payouts from the payment provider to owner and organiser. The bidding itself does not take place on Insight.", "تدير مزادك في بث على إنستغرام أو تيك توك، وإنسايت تنظّم خطوات الدفع بعده: 24 ساعة للفائز، ومزايدان احتياطيان، وتحويل منفصل من مزوّد الدفع للمالك والمنظّم. المزايدة نفسها لا تجري داخل إنسايت."],
  ];
  const trust: [typeof ShieldCheck, string, string, string, string][] = [
    [Receipt, "Every fee before you pay", "كل الرسوم قبل الدفع", "The fee, the VAT and the exchange rate are on screen before you pay, with a tax invoice for every payment.", "الرسوم والضريبة وسعر الصرف أمامك قبل الدفع، وفاتورة ضريبية لكل دفعة."],
    [FileCheck2, "Every step on record", "كل خطوة موثّقة", "Terms, versions, shipping and approvals are kept with a date and a name, for both sides to see.", "الشروط ونسخها والشحن والاعتمادات محفوظة بتاريخها واسم صاحبها، يراها الطرفان."],
    [Scale, "A fair dispute path", "مسار نزاع عادل", "Payout stops, both sides submit evidence, and a written decision is approved by two Insight staff members.", "يتوقف التحويل، ويقدّم الطرفان أدلتهما، ويصدر قرار مكتوب يعتمده موظفان في إنسايت."],
    [Lock, "Funds with a licensed provider", "الأموال لدى مزوّد مرخّص", "At launch, funds are held by a licensed payment provider — never by Insight. This demo simulates the provider.", "عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، ولا تحتفظ بها إنسايت. هذه النسخة تحاكي المزوّد."],
  ];
  const faqs: [string, string, string, string][] = [
    ["Where is the money during the deal?", "أين يكون المبلغ أثناء الصفقة؟", "At launch, funds will be held by a licensed payment provider, and Insight runs the deal rules and keeps the record. This version is a demo with a simulated payment provider: no real money moves.", "عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، وتدير إنسايت قواعد الصفقة وتحفظ سجلها. النسخة الحالية تجريبية بمزوّد دفع محاكى، ولا تتحرك فيها أموال حقيقية."],
    ["What if the goods arrive damaged or incomplete?", "ماذا لو وصلت البضاعة تالفة أو ناقصة؟", "Open a dispute during the inspection period. The payout stops, the Insight team reviews both sides' evidence and issues a written decision approved by two staff members.", "افتح نزاعاً خلال مدة الفحص. يتوقف التحويل، ويراجع فريق إنسايت أدلة الطرفين ويصدر قراراً مكتوباً يعتمده موظفان."],
    ["Can I pay in a different currency from the other side?", "هل أدفع بعملة غير عملة الطرف الآخر؟", "Yes. You pay in your currency and the other side is paid in theirs. You see the exchange rate, locked for 15 minutes, before you pay.", "نعم. تدفع بعملتك ويستلم الطرف الآخر بعملته، وترى سعر الصرف ثابتاً لمدة 15 دقيقة قبل الدفع."],
    ["How much does it cost?", "كم تكلف الخدمة؟", "Creating a deal is free. The fee is charged only when the deal is paid, from USD 15 and never more than USD 3,500 per deal, and you choose who pays it.", "إنشاء الصفقة مجاني. تُحتسب الرسوم عند الدفع فقط، تبدأ من 15 دولاراً ولا تتجاوز 3,500 دولار للصفقة، وتختاران من يدفعها."],
    ["Can I deal with a supplier outside the Gulf?", "هل أتعامل مع مورد خارج الخليج؟", "Yes. Choose \"Outside the Gulf\" as the supplier's country and set the deal in US dollars. You pay in your own currency and the supplier is paid in dollars. At launch, the countries a payout can reach depend on the licensed payment provider.", "نعم. اختر «خارج الخليج» دولةً للمورد وحدّد مبلغ الصفقة بالدولار الأمريكي. تدفع بعملتك ويستلم المورد بالدولار. عند الإطلاق تعتمد الدول التي يصلها التحويل على مزوّد الدفع المرخّص."],
    ["What if the other side does not deliver?", "ماذا لو لم يُسلّم الطرف الآخر ما اتفقتما عليه؟", "Open a dispute. The amount stays in the deal and is not paid out until a decision is issued.", "افتح نزاعاً. يبقى المبلغ في الصفقة ولا يُحوَّل للطرف الآخر حتى يصدر القرار."],
    ["Is it for businesses or individuals?", "هل الخدمة للشركات أم للأفراد؟", "Both. A company buying stock from a factory, or a person hiring a designer, use the same steps: agree, pay, deliver, inspect.", "للاثنين. الشركة التي تشتري بضاعة من مصنع، والشخص الذي يتعاقد مع مصمم، يمرّان بالخطوات نفسها: اتفاق، دفع، تسليم، فحص."],
  ];

  return <SiteShell><ContactPopup /><div data-no-localize>
    {/* Hero */}
    <section className="relative overflow-hidden border-b border-border bg-secondary">
      <div aria-hidden="true" className="gradient-brand absolute inset-x-0 top-0 h-1" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pt-10 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24">
        <div className="text-center lg:text-start">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-accent-foreground"><ShieldCheck className="size-4 shrink-0" />{text("For businesses and individuals: the other side is paid only after you receive", "للشركات والأفراد: لا يصل المبلغ للطرف الآخر قبل أن تستلم")}</span>
          <h1 className="mt-6 text-[2.6rem] leading-[1.3] font-bold sm:text-[3.4rem]">{text("Pay with confidence.", "ادفع حين تطمئن،")}<br /><span className="text-primary">{text("Get paid on delivery.", "واستلم حين تُسلِّم.")}</span></h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-9 text-foreground/80 lg:mx-0">{text("Agree the terms, pay in your own currency, and the money waits in the deal until you receive and check what you bought. If something goes wrong, it stays there until the matter is settled.", "اتفقا على الشروط، وادفع بعملتك، ويبقى المبلغ في الصفقة حتى تستلم ما اشتريته وتتأكد منه. وإن حدثت مشكلة، يبقى حيث هو حتى تُحسم.")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
            <Button asChild size="lg" className="h-14 rounded-full px-7 text-base shadow-[0_14px_30px_-16px_rgb(19_128_101/0.9)] sm:h-12"><Link to="/auth" search={{ mode: "signup" }}>{text("Start your first deal", "ابدأ صفقتك الأولى")}<ArrowUpRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="h-14 rounded-full bg-card px-7 text-base sm:h-12"><Link to="/how-it-works">{text("See how it works", "شاهد كيف تعمل")}</Link></Button>
          </div>
          <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground lg:justify-start">{[["Free to create a deal", "إنشاء الصفقة مجاني"], ["Fees only when you pay", "الرسوم عند الدفع فقط"], ["Arabic and English", "بالعربية والإنجليزية"]].map(([en, ar]) => <li key={en} className="flex items-center gap-2"><Check className="size-4 text-primary" />{text(en ?? "", ar)}</li>)}</ul>
          <p className="mx-auto mt-6 max-w-xl text-xs leading-6 text-muted-foreground lg:mx-0">{text("Demo: the payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider, and Insight runs the deal rules and keeps the record.", "نسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية. عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، وتدير إنسايت قواعد الصفقة وتحفظ سجلها.")}</p>
        </div>
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div aria-hidden="true" className="absolute -top-8 -start-6 size-44 rounded-full bg-brand-mint/25 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-10 -end-6 size-44 rounded-full bg-brand-teal/25 blur-3xl" />
          <div className="relative rounded-[2rem] bg-gradient-to-br from-accent via-card to-secondary p-4 pb-14 ring-1 ring-border shadow-[0_40px_80px_-50px_rgb(12_42_34/0.6)] sm:p-7 sm:pb-16">
          <ul aria-hidden="true" className="absolute -end-3 top-12 z-10 flex flex-col gap-3 sm:-end-5">{[Lock, Coins, Truck].map((I, k) => <li key={k} className="grid size-12 place-items-center rounded-full bg-card text-primary shadow-[0_12px_24px_-12px_rgb(12_42_34/0.5)] ring-1 ring-border"><I className="size-5" strokeWidth={1.9} /></li>)}</ul>
        <div className="me-8 rounded-3xl border border-border bg-card p-5 shadow-[0_30px_60px_-40px_rgb(12_42_34/0.45)] sm:me-10 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">{text("Example deal", "مثال")} · {text("Jeddah – Shenzhen", "جدة – شنتشن")}</p><h2 className="mt-2 text-lg font-semibold">{text("Office chairs from a factory", "كراسي مكتبية من مصنع")}</h2></div>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{text("Shipped", "تم الشحن")}</span>
          </div>
          <p className="mt-6 text-3xl font-bold tabular-nums"><bdi dir="ltr">{formatMoney(12000, "USD")}</bdi></p>
          <div className="mt-6 grid grid-cols-4 gap-1.5" aria-hidden="true"><span className="h-2 rounded bg-brand-mint" /><span className="h-2 rounded bg-brand-mint" /><span className="gradient-brand h-2 rounded" /><span className="h-2 rounded bg-surface" /></div>
          <ol className="mt-2 grid grid-cols-4 gap-1.5 text-xs text-muted-foreground"><li>{text("Agreed", "الاتفاق")}</li><li>{text("Paid", "الدفع")}</li><li className="font-semibold text-primary">{text("Shipping", "الشحن")}</li><li>{text("Payout", "التحويل")}</li></ol>
          <div className="mt-6 space-y-3">{([[BadgeCheck, "Both parties verified", "الطرفان موثّقان"], [Truck, "Shipment on its way · DEMO-24817", "الشحنة في الطريق · DEMO-24817"], [Wallet, "Paid to the factory after a 5-day inspection", "يُحوَّل للمصنع بعد فحص 5 أيام"]] as const).map(([I, en, ar]) => <div key={en} className="flex items-center gap-3 rounded-xl bg-background p-3 text-sm"><I className="size-5 shrink-0 text-primary" /><span>{text(en, ar)}</span></div>)}</div>
        </div>
          </div>
          <div className="absolute -bottom-6 start-3 end-3 z-10 flex items-center gap-3 rounded-2xl bg-card p-3.5 text-start shadow-[0_20px_40px_-20px_rgb(12_42_34/0.55)] ring-1 ring-border sm:start-8 sm:end-auto sm:min-w-80">
            <IconTile icon={ShieldCheck} size="sm" />
            <div className="min-w-0"><p className="text-sm font-semibold">{text("The payment is held in the deal", "المبلغ محفوظ في الصفقة")}</p><p className="truncate text-xs text-muted-foreground">{text("Not paid to the factory before you inspect", "لن يُحوَّل للمصنع قبل أن تفحص الشحنة")}</p></div>
          </div>
        </div>
      </div>
    </section>

    {/* Currencies */}
    <section className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-6"><p className="text-sm text-muted-foreground">{text("You pay in your currency. The other side is paid in theirs.", "أنت تدفع بعملتك، والطرف الآخر يستلم بعملته.")}</p><div className="flex flex-wrap gap-2" dir="ltr">{["SAR", "AED", "BHD", "KWD", "QAR", "OMR", "USD"].map(c => <span key={c} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold">{c}</span>)}</div></div></section>

    {/* Pain points */}
    <section className="mx-auto max-w-7xl px-5 pt-16 lg:pt-20">
      <h2 className="text-3xl font-bold sm:text-4xl">{text("Sound familiar?", "هل مررت بهذا؟")}</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">{pains.map(([en, ar]) => <p key={en} className="flex gap-3 rounded-2xl border border-border bg-card p-6 text-lg leading-8"><CircleAlert className="mt-1.5 size-5 shrink-0 text-muted-foreground" /><span>{text(en, ar)}</span></p>)}</div>
    </section>

    {/* Pillars */}
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <h2 className="max-w-3xl text-3xl font-bold leading-snug sm:text-4xl">{text("Insight keeps the money in the middle until each side keeps its word", "إنسايت يُبقي المبلغ في المنتصف، حتى يفي كل طرف بما اتفقتما عليه")}</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{pillars.map(([I, en, ar, d, da]) => <article key={en} className="rounded-2xl border border-border bg-card p-7"><IconTile icon={I} /><h3 className="mt-5 text-xl font-semibold">{text(en, ar)}</h3><p className="mt-3 leading-8 text-muted-foreground">{text(d, da)}</p></article>)}</div>
    </section>

    {/* How it works */}
    <section className="border-y border-border bg-secondary"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-bold sm:text-4xl">{text("Four steps, every one on record", "أربع خطوات، وكل خطوة موثّقة")}</h2><p className="mt-3 text-lg text-muted-foreground">{text("Each party always knows what happens next.", "يعرف كل طرف دائماً ما المطلوب منه الآن.")}</p></div><Link to="/how-it-works" className="font-semibold text-primary">{text("The full walkthrough", "الشرح الكامل")}</Link></div>
      <StepsFlow />
    </div></section>

    {/* Individuals and business */}
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20"><div className="grid gap-5 lg:grid-cols-2">{audiences.map(([en, ar, items, icon, to, cta]) => <article key={en} className="flex flex-col rounded-3xl border border-border bg-card p-8"><div className="flex items-center gap-4"><IconTile icon={icon} size="lg" /><h2 className="text-2xl font-bold">{text(en, ar)}</h2></div><ul className="mt-6 flex-1 space-y-4">{items.map(([ie, ia]) => <li key={ie} className="flex gap-3 leading-8"><span className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent"><Check className="size-4 text-primary" /></span><span>{text(ie, ia)}</span></li>)}</ul><Button asChild variant="outline" className="mt-8 self-start"><Link to={to}>{text(cta[0], cta[1])}<ArrowUpRight className="size-4" /></Link></Button></article>)}</div></section>

    {/* Use cases */}
    <section className="bg-brand-strong text-primary-foreground"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <h2 className="text-3xl font-bold sm:text-4xl">{text("Whatever you are buying or selling", "أياً كان ما تشتريه أو تبيعه")}</h2>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-white/75">{text("Whether the person you deal with is in your city or on the other side of the world.", "سواء كان من تتعامل معه في مدينتك أو في الطرف الآخر من العالم.")}</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{types.map(([I, en, ar, d, da]) => <article key={en} className="rounded-2xl bg-white/[0.06] p-6"><IconTile icon={I} /><h3 className="mt-5 text-lg font-semibold">{text(en, ar)}</h3><p className="mt-3 leading-7 text-white/75">{text(d, da)}</p></article>)}</div>
      <div className="mt-8 flex flex-wrap gap-3"><Button asChild variant="secondary"><Link to="/auth" search={{ mode: "signup" }}>{text("Start your deal", "ابدأ صفقتك")}<ArrowUpRight className="size-4" /></Link></Button><Button asChild variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"><Link to="/how-it-works" hash="auctions">{text("How auctions work", "كيف تعمل المزادات")}</Link></Button></div>
    </div></section>

    {/* Comparison */}
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <h2 className="text-3xl font-bold sm:text-4xl">{text("Compare before you pay", "قارن قبل أن تدفع")}</h2>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-muted-foreground">{text("How Insight compares with the two ways most deals are paid today.", "كيف يختلف إنسايت عن الطريقتين اللتين تُدفع بهما أغلب الصفقات اليوم.")}</p>
      <CompareTable />
    </section>

    {/* Trust */}
    <section className="border-y border-border bg-secondary"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <h2 className="text-3xl font-bold sm:text-4xl">{text("Why you can deal with peace of mind", "لماذا تتعامل وأنت مطمئن")}</h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{trust.map(([I, en, ar, d, da]) => <article key={en} className="rounded-2xl border border-border bg-card p-6"><IconTile icon={I} /><h3 className="mt-4 text-lg font-semibold">{text(en, ar)}</h3><p className="mt-2 leading-7 text-muted-foreground">{text(d, da)}</p></article>)}</div>
    </div></section>

    {/* Fees */}
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20"><h2 className="text-3xl font-bold sm:text-4xl">{text("Clear fees, before you pay", "رسوم واضحة قبل أن تدفع")}</h2><p className="mt-3 mb-10 max-w-2xl text-lg leading-8 text-muted-foreground">{text("Creating a deal is free. The fee is charged only when the deal is paid, and you choose who pays it: the buyer, the supplier, or half each.", "إنشاء الصفقة مجاني. تُحتسب الرسوم عند الدفع فقط، وتختاران من يدفعها: المشتري أو المورد أو مناصفة.")}</p><PublicPricing /></section>

    {/* FAQ */}
    <section className="border-t border-border bg-secondary"><div className="mx-auto max-w-4xl px-5 py-16 lg:py-20"><h2 className="text-3xl font-bold">{text("Questions we hear most", "أسئلة نسمعها كثيراً")}</h2><FaqList items={faqs.map(([q, qa, a, aa]) => [[q, qa], [a, aa]] as [[string, string], [string, string]])} /><Link to="/faq" className="mt-6 inline-block font-semibold text-primary">{text("All questions", "كل الأسئلة")}</Link></div></section>

    {/* CTA */}
    <CtaBand title={["Your next deal deserves a clear start", "صفقتك القادمة تستحق بداية واضحة"]} body={["Create it in minutes and send the other party one link — wherever they are.", "أنشئها في دقائق، وأرسل للطرف الآخر رابطاً واحداً، أينما كان."]} />
  </div></SiteShell>;
}
