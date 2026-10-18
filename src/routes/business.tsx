import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, Coins, Factory, FileCheck2, FileText, Gavel, HardHat, Handshake, Layers, Package, Receipt, Scale, Truck, Users, Wallet } from "lucide-react";

import { CompareTable, CtaBand, FaqList, FeatureGrid, IconTile, PageHero, SectionHeader, StepsFlow, type Feature, type T2 } from "@/components/site/Marketing";
import { SiteShell } from "@/components/site/SiteShell";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Insight for business | Pay suppliers with confidence, get paid without chasing" },
      { name: "description", content: "Imports from factories abroad, suppliers in neighbouring countries and fit-out contracts in stages: documented terms, payment in your currency, a tax invoice for every payment. Demo with a simulated payment provider." },
    ],
  }),
  component: BusinessPage,
});

const SOLUTIONS: Feature[] = [
  { id: "imports", icon: Factory, title: ["Importing from a factory abroad", "الاستيراد من مصنع في الخارج"], body: ["Replace the 30% deposit by wire with a payment into the deal, in US dollars. The factory is paid after the shipment arrives and passes inspection.", "بدل تحويل 30% مقدّماً، ادفع في الصفقة بالدولار. يُحوَّل المبلغ للمصنع بعد وصول الشحنة واجتياز الفحص."] },
  { id: "suppliers", icon: Package, title: ["Buying from a neighbouring country", "الشراء من دولة مجاورة"], body: ["A supplier in Dubai, Manama or Kuwait: you pay in your currency, they are paid in theirs, at a rate locked for 15 minutes.", "مورد في دبي أو المنامة أو الكويت: تدفع بعملتك ويستلم بعملته، بسعر صرف ثابت 15 دقيقة."] },
  { id: "selling", icon: Truck, title: ["Selling to new customers", "البيع لعملاء جدد"], body: ["Ship to a buyer you have just met, knowing they have already paid into the deal. No more chasing invoices.", "اشحن لعميل تعرّفت عليه للتو وأنت تعلم أنه دفع في الصفقة. لا مزيد من ملاحقة الفواتير."] },
  { id: "contracting", icon: HardHat, title: ["Contracting and fit-out", "المقاولات والتجهيز"], body: ["2 to 20 milestones, an advance of up to 20%, each stage paid when approved, and retention released after the defects period.", "من 2 إلى 20 مرحلة، ودفعة مقدّمة حتى 20%، وكل مرحلة تُدفع حين تُعتمد، والمحتجز يُصرف بعد فترة ضمان العيوب."] },
  { id: "services", icon: Handshake, title: ["Business services", "خدمات الشركات"], body: ["Marketing, software, consulting: deliverables and dates agreed up front, with payment after acceptance.", "تسويق، برمجة، استشارات: المخرجات والمواعيد متفق عليها مسبقاً، والدفع بعد القبول."] },
  { id: "auctions", icon: Gavel, title: ["Auction organisers", "منظمو المزادات"], body: ["You run the auction live on Instagram or TikTok; Insight collects from the winner within 24 hours and pays the owner and you separately.", "تدير المزاد في بث على إنستغرام أو تيك توك، وإنسايت يحصّل من الفائز خلال 24 ساعة ويحوّل للمالك ولك كلٌّ على حدة."] },
];

const TOOLS: Feature[] = [
  { icon: BadgeCheck, title: ["Verified company profile", "ملف شركة موثّق"], body: ["Commercial registration, VAT number, authorised signatory and payout account, reviewed by the Insight team.", "السجل التجاري والرقم الضريبي والمفوّض بالتوقيع وحساب التحويل، يراجعها فريق إنسايت."] },
  { icon: Receipt, title: ["A tax invoice for every payment", "فاتورة ضريبية لكل دفعة"], body: ["Issued for the Insight fee on every deal — and on every milestone when you pay in stages — ready for your accountant.", "تصدر لرسوم إنسايت عن كل صفقة، وعن كل مرحلة إن دفعت على مراحل، جاهزة لمحاسبك."] },
  { icon: Coins, title: ["Seven currencies", "سبع عملات"], body: ["The six Gulf currencies and US dollars, with exact decimals and the exchange rate shown before you pay.", "عملات الخليج الست والدولار، بمنازل عشرية دقيقة، وسعر الصرف أمامك قبل الدفع."] },
  { icon: Layers, title: ["Payment in stages", "الدفع على مراحل"], body: ["Fund the whole deal up front, or each milestone when it is due — you choose when you create the deal.", "ادفع الصفقة كاملة مقدّماً أو كل مرحلة عند موعدها، وتختار ذلك عند إنشاء الصفقة."] },
  { icon: FileCheck2, title: ["A full audit trail", "سجل كامل للتدقيق"], body: ["Every term version, file, approval and payment movement, kept with its date and author.", "كل نسخة من الشروط، وكل ملف واعتماد وحركة دفع، محفوظة بتاريخها وصاحبها."] },
  { icon: Scale, title: ["A fair dispute path", "مسار نزاع عادل"], body: ["Payout stops, both sides submit evidence, and a written decision is approved by two Insight staff members.", "يتوقف التحويل، ويقدّم الطرفان أدلتهما، ويصدر قرار مكتوب يعتمده موظفان في إنسايت."] },
];

const NEXT: [typeof Users, T2][] = [
  [Users, ["Team members and approval rights", "أعضاء الفريق وصلاحيات الاعتماد"]],
  [Wallet, ["Spending limits", "حدود الإنفاق"]],
  [Building2, ["Supplier management", "إدارة الموردين"]],
  [FileText, ["Accounting and ERP connections", "الربط مع أنظمة المحاسبة"]],
];

const FAQ: [T2, T2][] = [
  [["Can I use Insight with a supplier outside the Gulf?", "هل أستخدم إنسايت مع مورد خارج الخليج؟"], ["Yes. Choose \"Outside the Gulf\" as the supplier's country and set the deal in US dollars. At launch, the countries a payout can reach depend on the licensed payment provider.", "نعم. اختر «خارج الخليج» دولةً للمورد وحدّد الصفقة بالدولار. عند الإطلاق تعتمد الدول التي يصلها التحويل على مزوّد الدفع المرخّص."]],
  [["How is VAT handled?", "كيف تُحتسب الضريبة؟"], ["VAT applies to the Insight fee only, at the rate of each party's own country, and appears on that party's tax invoice. The deal amount itself is not taxed by Insight.", "تُحتسب الضريبة على رسوم إنسايت فقط، بنسبة دولة كل طرف، وتظهر في فاتورته الضريبية. مبلغ الصفقة نفسه لا تفرض عليه إنسايت ضريبة."]],
  [["Does the supplier need an account?", "هل يحتاج المورد إلى حساب؟"], ["Yes. You send one invitation link; the supplier joins, accepts the terms and adds a payout account.", "نعم. ترسل له رابط دعوة واحداً، فينضم ويقبل الشروط ويضيف حساب التحويل."]],
  [["Where is the money during the deal?", "أين يكون المبلغ أثناء الصفقة؟"], ["At launch, funds will be held by a licensed payment provider, and Insight runs the deal rules and keeps the record. This version is a demo with a simulated provider: no real money moves.", "عند الإطلاق تُحفظ الأموال لدى مزوّد دفع مرخّص، وتدير إنسايت قواعد الصفقة وتحفظ سجلها. النسخة الحالية تجريبية بمزوّد محاكى، ولا تتحرك فيها أموال حقيقية."]],
];

function MilestonePreview() {
  const { text } = useLocale();
  const ms: [T2, number, "paid" | "now" | "next"][] = [
    [["Mobilisation advance", "الدفعة المقدّمة"], 1000, "paid"],
    [["Partitions and ceilings", "القواطع والأسقف"], 4000, "paid"],
    [["MEP works", "الأعمال الكهروميكانيكية"], 3000, "now"],
    [["Finishes and handover", "التشطيبات والتسليم"], 2000, "next"],
  ];
  const tag = { paid: ["Paid to contractor", "حُوِّل للمقاول"], now: ["Awaiting your approval", "بانتظار اعتمادك"], next: ["Next", "التالية"] } as const;
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_30px_60px_-40px_rgb(12_42_34/0.45)] sm:p-8">
      <div className="flex items-center gap-3"><IconTile icon={HardHat} size="sm" /><div><p className="text-xs text-muted-foreground">{text("Example contract", "مثال")}</p><h2 className="text-lg font-semibold">{text("Showroom fit-out, 240 m²", "تجهيز معرض 240 م²")}</h2></div></div>
      <p className="mt-5 text-3xl font-bold tabular-nums"><bdi dir="ltr">{formatMoney(10000, "BHD")}</bdi></p>
      <ol className="mt-5 space-y-2.5">{ms.map(([t, amt, st], i) => (
        <li key={t[0]} className="flex items-center gap-3 rounded-xl bg-background p-3 text-sm">
          <span className={st === "paid" ? "gradient-brand grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" : st === "now" ? "grid size-7 shrink-0 place-items-center rounded-full border-2 border-primary text-xs font-bold text-primary" : "grid size-7 shrink-0 place-items-center rounded-full border border-border text-xs text-muted-foreground"}>{i + 1}</span>
          <span className="flex-1">{text(t[0], t[1])}<span className="block text-xs text-muted-foreground">{text(tag[st][0], tag[st][1])}</span></span>
          <bdi dir="ltr" className="tabular-nums text-muted-foreground">{formatMoney(amt, "BHD")}</bdi>
        </li>
      ))}</ol>
    </div>
  );
}

function BusinessPage() {
  const { text } = useLocale();
  return <SiteShell><div data-no-localize>
    <PageHero
      badge={["For business", "للشركات"]}
      title={["Pay your suppliers with confidence,", "ادفع لمورديك بثقة،"]}
      highlight={["and get paid without chasing.", "واستلم من عملائك دون ملاحقة."]}
      body={["From importing from a factory abroad to fit-out contracts in stages: documented terms, payment in your currency, a tax invoice for every payment — and money that does not move until the other side delivers.", "من الاستيراد من مصنع في الخارج إلى عقود التجهيز على مراحل: شروط موثّقة، ودفع بعملتك، وفاتورة ضريبية لكل دفعة، ومبلغ لا يتحرك قبل أن يفي الطرف الآخر بالتزامه."]}
      points={[["Verified company profile", "ملف شركة موثّق"], ["Tax invoice for every payment", "فاتورة ضريبية لكل دفعة"], ["Seven currencies", "سبع عملات"]]}
      primary={{ label: ["Create a company account", "أنشئ حساب شركتك"], to: "/auth", signup: true }}
      secondary={{ label: ["Fee calculator", "حاسبة الرسوم"], to: "/pricing" }}
      aside={<MilestonePreview />}
    />

    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader eyebrow={["Solutions", "الحلول"]} title={["One way to pay for every kind of business deal", "طريقة واحدة لكل صفقات شركتك"]} />
      <FeatureGrid items={SOLUTIONS} />
    </section>

    <section className="bg-brand-strong text-primary-foreground"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader dark eyebrow={["Built for companies", "صُممت للشركات"]} title={["The tools your finance team expects", "الأدوات التي يتوقعها فريقك المالي"]} />
      <FeatureGrid items={TOOLS} dark />
    </div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader title={["Compare before you pay", "قارن قبل أن تدفع"]} intro={["How Insight compares with the two ways most business deals are paid today.", "كيف يختلف إنسايت عن الطريقتين اللتين تُدفع بهما أغلب صفقات الشركات اليوم."]} />
      <CompareTable />
    </section>

    <section className="border-y border-border bg-secondary"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader title={["Four steps, every one on record", "أربع خطوات، وكل خطوة موثّقة"]} intro={["Your team and the other side always know what happens next.", "يعرف فريقك والطرف الآخر دائماً ما المطلوب الآن."]} />
      <StepsFlow />
    </div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <div className="rounded-3xl border border-dashed border-primary/30 bg-card p-8">
        <SectionHeader eyebrow={["Coming next", "قريباً"]} title={["For larger teams", "للفرق الأكبر"]} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{NEXT.map(([I, t]) => <li key={t[0]} className="flex items-center gap-3"><IconTile icon={I} tone="soft" size="sm" /><span className="font-medium">{text(t[0], t[1])}</span></li>)}</ul>
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-5 pb-16 lg:pb-20">
      <SectionHeader title={["Questions from companies", "أسئلة تطرحها الشركات"]} />
      <FaqList items={FAQ} />
      <Link to="/faq" className="mt-6 inline-block font-semibold text-primary">{text("All questions", "كل الأسئلة")}</Link>
    </section>

    <CtaBand title={["Your next supplier payment, without the worry", "دفعتك القادمة لمورديك، دون قلق"]} body={["Create a company account and invite your supplier with one link.", "أنشئ حساب شركتك وادعُ مورديك برابط واحد."]} label={["Create a company account", "أنشئ حساب شركتك"]} />
  </div></SiteShell>;
}
