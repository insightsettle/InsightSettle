import { createFileRoute, Link } from "@tanstack/react-router";

import { Bell, CheckCircle2, Coins, FileCheck2, Gavel, Globe, Handshake, HardHat, Layers, LayoutDashboard, Package, Receipt, Scale, ShieldCheck, Truck, Users, Wallet } from "@/components/icons";
import { CtaBand, FaqList, FeatureGrid, PageHero, SectionHeader, StepsFlow, type Feature, type T2 } from "@/components/site/Marketing";
import { SiteShell } from "@/components/site/SiteShell";
import { useLocale } from "@/lib/locale";

const TITLE = "Insight for your platform | Add payment protection to your store or platform";
const DESC = "Connect your store, marketplace or service platform to Insight: every order becomes a protected deal, the customer pays on Insight, and the money waits until delivery is confirmed.";

export const Route = createFileRoute("/business-api")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessApiPage,
});

const PROBLEMS: Feature[] = [
  { icon: Users, title: ["New customers hesitate to pay a store they do not know", "العميل الجديد يتردد في الدفع لمتجر لا يعرفه"], body: ["With Insight, the customer pays into the deal, not to you directly, and the money waits until they receive the order. That reassurance helps a first-time buyer complete the order.", "مع إنسايت يدفع العميل في الصفقة لا لك مباشرة، ويبقى المبلغ محفوظاً حتى يستلم طلبه. هذه الطمأنينة تساعد المشتري لأول مرة على إكمال الطلب."] },
  { icon: Truck, title: ["Cash on delivery costs you", "الدفع عند الاستلام يكلّفك"], body: ["Refused parcels, wasted shipping and cash to collect. With Insight the order is paid before it ships, and you ship knowing the amount is already held.", "طلبات تُرفض عند الباب، وشحن يضيع، ونقد يحتاج تحصيلاً. مع إنسايت يُدفع الطلب قبل الشحن، فتشحن وأنت تعلم أن المبلغ محفوظ."] },
  { icon: Handshake, title: ["Large business orders stall on who pays first", "طلبات الأعمال الكبيرة تتوقف عند: من يدفع أولاً؟"], body: ["The buyer will not pay up front and the supplier will not ship on credit. Insight holds the payment in the middle, so the deal moves without a deposit or a bank guarantee.", "المشتري لا يريد الدفع مقدماً، والمورّد لا يشحن بالآجل. إنسايت يحفظ المبلغ في المنتصف، فتمضي الصفقة دون عربون أو ضمان بنكي."] },
  { icon: Scale, title: ["Disputes take your team's time", "النزاعات تستهلك وقت فريقك"], body: ["When something goes wrong, payout stops, both sides add evidence, and Insight issues a written decision approved by two staff members. Your team does not have to judge every complaint.", "إذا حدثت مشكلة يتوقف التحويل، ويضيف الطرفان أدلتهما، وتصدر إنسايت قراراً مكتوباً يعتمده موظفان. لا يحتاج فريقك إلى الحكم في كل شكوى."] },
  { icon: Globe, title: ["Customers across the Gulf, in different currencies", "عملاء في الخليج بعملات مختلفة"], body: ["Your customer pays in their own currency and you are paid in yours, with the exchange rate shown before payment.", "يدفع عميلك بعملته وتستلم أنت بعملتك، مع سعر الصرف واضحاً قبل الدفع."] },
  { icon: HardHat, title: ["Projects and services paid in stages", "مشاريع وخدمات تُدفع على مراحل"], body: ["Contracting, fit-out and long services: each milestone is paid when it is approved, with retention held after handover, without spreadsheets or reminders.", "المقاولات والتجهيز والخدمات الطويلة: تُدفع كل مرحلة عند اعتمادها، ويُحجز الضمان بعد التسليم، دون جداول أو تذكير يدوي."] },
];

const FEATURES: Feature[] = [
  { icon: Package, title: ["Deals created from your system", "صفقات تُنشأ من نظامك"], body: ["Each order on your store or platform becomes a protected deal automatically, with your own order number on it.", "كل طلب في متجرك أو منصتك يصبح صفقة محمية تلقائياً، وعليها رقم طلبك."] },
  { icon: Wallet, title: ["An Insight checkout", "صفحة دفع بهوية إنسايت"], body: ["Your customer accepts the terms and pays on Insight by mada, credit card or bank transfer. Card details never pass through your system.", "يوافق عميلك على الشروط ويدفع في إنسايت بمدى أو بطاقة ائتمانية أو تحويل بنكي. بيانات البطاقة لا تمر عبر نظامك."] },
  { icon: Bell, title: ["An update at every step", "تحديث عند كل خطوة"], body: ["Your system is told the moment the customer pays, the order ships, it is delivered, the money is paid out, or a dispute opens.", "يصل لنظامك تحديث فوري عندما يدفع العميل، ويُشحن الطلب، ويُسلَّم، ويُحوَّل المبلغ، أو يُفتح نزاع."] },
  { icon: Truck, title: ["Shipping from your side", "الشحن من جهتك"], body: ["Send the carrier and tracking number and confirm delivery from your own system; the customer sees it on Insight.", "أرسل شركة الشحن ورقم التتبع وأكّد التسليم من نظامك، ويراها العميل في إنسايت."] },
  { icon: Layers, title: ["One payment or milestones", "دفعة واحدة أو مراحل"], body: ["Goods, services, freelance work and contracting, with retention and a defects period when you need them.", "بضائع وخدمات وعمل حر ومقاولات، مع الضمان المحتجز وفترة العيوب عند الحاجة."] },
  { icon: Receipt, title: ["A tax invoice for every payment", "فاتورة ضريبية لكل دفعة"], body: ["Issued automatically for Insight's fee on every payment, ready for your accountant.", "تصدر تلقائياً لرسوم إنسايت عن كل دفعة، جاهزة لمحاسبك."] },
  { icon: Coins, title: ["Seven currencies", "سبع عملات"], body: ["The six Gulf currencies and US dollars, Bahraini dinar first.", "عملات الخليج الست والدولار، والدينار البحريني أولاً."] },
  { icon: LayoutDashboard, title: ["Your own control page", "صفحة تحكم خاصة بك"], body: ["Turn the connection on, manage keys and follow every update from your Insight business account.", "فعّل الربط وأدر المفاتيح وتابع كل تحديث من حسابك في إنسايت للأعمال."] },
  { icon: ShieldCheck, title: ["Payouts follow clear rules", "التحويل بقواعد واضحة"], body: ["Money is paid out only when the customer confirms, the inspection period ends, or a written dispute decision says so. No one can move it outside these rules.", "لا يُحوَّل المبلغ إلا بتأكيد العميل، أو بانتهاء مدة الفحص، أو بقرار نزاع مكتوب. لا أحد يستطيع تحريكه خارج هذه القواعد."] },
];

const WHO: Feature[] = [
  { icon: Package, title: ["Online stores", "المتاجر الإلكترونية"], body: ["Higher-value orders, new customers, and selling across the Gulf.", "الطلبات ذات القيمة العالية، والعملاء الجدد، والبيع في الخليج."] },
  { icon: Handshake, title: ["Business supply platforms", "منصات التوريد بين الأعمال"], body: ["Orders between companies that do not know each other yet.", "الطلبات بين شركات لم تتعامل مع بعضها من قبل."] },
  { icon: FileCheck2, title: ["Service and freelance platforms", "منصات الخدمات والعمل الحر"], body: ["Pay after the work is delivered and accepted.", "الدفع بعد تسليم العمل وقبوله."] },
  { icon: HardHat, title: ["Contracting and fit-out", "المقاولات والتجهيز"], body: ["Milestones, approvals and retention in one place.", "المراحل والاعتمادات والضمان في مكان واحد."] },
  { icon: Gavel, title: ["Auction organisers", "منظمو المزادات"], body: ["The winner pays within 24 hours, or the offer moves to the next bidder.", "الفائز يدفع خلال 24 ساعة، وإلا ينتقل العرض للمزايد التالي."] },
];

const STEPS: [T2, T2][] = [
  [["Turn it on", "فعّل الربط"], ["From your verified Insight business account, open Partner API.", "من حساب الأعمال الموثّق في إنسايت، افتح «واجهة الربط»."]],
  [["Connect your system", "اربط نظامك"], ["Your developer follows our guide; a simple connection usually takes a few days.", "يتبع مطوّرك دليلنا، والربط البسيط يحتاج عادةً أياماً قليلة."]],
  [["Your customer pays on Insight", "عميلك يدفع في إنسايت"], ["They accept the terms and pay; the amount is held in the deal.", "يوافق على الشروط ويدفع، ويبقى المبلغ محفوظاً في الصفقة."]],
  [["Deliver, then get paid", "سلّم ثم استلم"], ["You ship and confirm delivery; after the customer checks, the amount is paid out to you.", "تشحن وتؤكد التسليم، وبعد أن يتأكد العميل يُحوَّل المبلغ إليك."]],
];

const FAQ: [T2, T2][] = [
  [["Do I need a developer?", "هل أحتاج إلى مبرمج؟"], ["For an automatic connection, yes: a developer connects your system using the guide in your account. Without one, you can start today with deal links that you share with your customers.", "للربط التلقائي نعم، يربط المطوّر نظامك باستخدام الدليل الموجود في حسابك. وبدون مبرمج تستطيع البدء اليوم بروابط الصفقات التي ترسلها لعملائك."]],
  [["Who decides when the money is paid out?", "مَن يقرر متى يُحوَّل المبلغ؟"], ["The deal's rules: the customer's confirmation, the end of the inspection period, or a written dispute decision approved by two Insight staff members.", "قواعد الصفقة: تأكيد العميل، أو انتهاء مدة الفحص، أو قرار نزاع مكتوب يعتمده موظفان من إنسايت."]],
  [["Where is the customer's money held?", "أين يُحفظ مبلغ العميل؟"], ["Not with you, and not with Insight. At launch the amount is held by a licensed payment provider. This version is a demo with a simulated provider: no real money moves.", "لا عندك ولا عند إنسايت. عند الإطلاق يُحفظ المبلغ لدى مزوّد دفع مرخّص. هذه النسخة تجريبية بمزوّد محاكى، ولا تتحرك فيها أموال حقيقية."]],
  [["What does it cost?", "كم التكلفة؟"], ["The usual Insight fee on each deal, shown to the payer before paying, with its tax invoice. There is no extra charge for the connection in test mode.", "رسوم إنسايت المعتادة على كل صفقة، تظهر لمن يدفعها قبل الدفع ومعها فاتورتها الضريبية. لا توجد رسوم إضافية للربط في وضع التجربة."]],
  [["Who can use it today?", "مَن يستطيع استخدامه الآن؟"], ["Verified business accounts, in test mode. Live connections open after review, once the payment provider is connected.", "حسابات الأعمال الموثّقة، في وضع التجربة. يُفتح الربط الحقيقي بعد المراجعة وعند ربط مزوّد الدفع."]],
];

function OrderFlowPreview() {
  const { text } = useLocale();
  const rows: [string, string, boolean][] = [
    ["Order #1001 placed on your store", "طلب #1001 في متجرك", true],
    ["Protected deal created on Insight", "صفقة محمية في إنسايت", true],
    ["Customer paid · amount held", "دفع العميل · المبلغ محفوظ", true],
    ["Shipped · tracking sent", "شُحن الطلب · رقم التتبع وصل", true],
    ["Paid out after the customer checks", "يُحوَّل بعد أن يتأكد العميل", false],
  ];
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 shadow-[0_30px_60px_-30px_rgb(12_42_34/0.45)]">
      <p className="text-xs font-semibold text-muted-foreground">{text("Your store → Insight", "متجرك ← إنسايت")}</p>
      <ol className="mt-4 space-y-3">
        {rows.map(([en, ar, done]) => (
          <li key={en} className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-sm">
            <CheckCircle2 className={done ? "size-5 shrink-0 text-primary" : "size-5 shrink-0 text-muted-foreground/50"} />
            <span className={done ? "" : "text-muted-foreground"}>{text(en, ar)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BusinessApiPage() {
  const { text } = useLocale();
  return <SiteShell><div data-no-localize>
    <PageHero
      badge={["Insight for your platform", "إنسايت لمنصتك"]}
      title={["Add payment protection", "أضف حماية الدفع"]}
      highlight={["to your store or platform.", "إلى متجرك أو منصتك."]}
      body={["Connect your system to Insight once, and every order becomes a protected deal: your customer pays on Insight, and the money waits until delivery is confirmed.", "اربط نظامك بإنسايت مرة واحدة، وكل طلب عندك يصبح صفقة محمية: يدفع عميلك في إنسايت، ويبقى المبلغ محفوظاً حتى يتأكد التسليم."]}
      points={[["Orders become protected deals", "الطلبات تصبح صفقات محمية"], ["Updates at every step", "تحديث عند كل خطوة"], ["Payouts by clear rules", "تحويل بقواعد واضحة"]]}
      primary={{ label: ["Create a business account", "أنشئ حساب أعمال"], to: "/auth", signup: true }}
      secondary={{ label: ["How Insight works", "كيف تعمل إنسايت"], to: "/how-it-works" }}
      aside={<OrderFlowPreview />}
    />

    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader eyebrow={["Problems it solves", "مشكلات يحلّها"]} title={["What holds your sales back today", "ما الذي يعطّل مبيعاتك اليوم"]} intro={["Common reasons orders are lost or delayed, and how a connection to Insight helps.", "أسباب شائعة لضياع الطلبات أو تأخرها، وكيف يساعد الربط مع إنسايت."]} />
      <FeatureGrid items={PROBLEMS} />
    </section>

    <section className="bg-brand-strong text-primary-foreground"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader dark eyebrow={["What you get", "ماذا تحصل"]} title={["Everything Insight does, inside your own system", "كل ما تقدمه إنسايت، داخل نظامك"]} />
      <FeatureGrid items={FEATURES} dark />
    </div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader eyebrow={["Who it is for", "لمن"]} title={["Built for businesses that sell or buy online", "لأصحاب الأعمال الذين يبيعون أو يشترون عبر الإنترنت"]} />
      <FeatureGrid items={WHO} cols={3} />
    </section>

    <section className="border-y border-border bg-secondary"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader title={["Four steps to start", "أربع خطوات للبدء"]} intro={["No change to how your customers shop: they pay on Insight at the moment of payment.", "لا يتغير شيء في طريقة تسوّق عملائك: يدفعون في إنسايت عند لحظة الدفع."]} />
      <StepsFlow steps={STEPS} />
    </div></section>

    <section className="mx-auto max-w-4xl px-5 py-16 lg:py-20">
      <SectionHeader title={["Questions from businesses", "أسئلة أصحاب الأعمال"]} />
      <FaqList items={FAQ} />
      <p className="mt-6 text-sm text-muted-foreground">{text("Already have a verified business account?", "لديك حساب أعمال موثّق؟")}{" "}
        <Link to="/partner" className="font-semibold text-primary">{text("Open Partner API in your account", "افتح «واجهة الربط» في حسابك")}</Link></p>
    </section>

    <CtaBand title={["Protect your next order", "احمِ طلبك القادم"]} body={["Create a business account, verify it, and turn on the connection from your dashboard.", "أنشئ حساب أعمال ووثّقه، ثم فعّل الربط من لوحتك."]} label={["Create a business account", "أنشئ حساب أعمال"]} />
  </div></SiteShell>;
}
