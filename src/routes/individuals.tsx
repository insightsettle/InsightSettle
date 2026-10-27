import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Car, CircleCheckBig, Eye, Gavel, Hammer, KeyRound, Link2, PenTool, Receipt, Scale, ShieldCheck, Smartphone, Wallet, Watch } from "lucide-react";

import { CtaBand, FaqList, FeatureGrid, IconTile, PageHero, SectionHeader, StepsFlow, type Feature, type T2 } from "@/components/site/Marketing";
import { SiteShell } from "@/components/site/SiteShell";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/individuals")({
  head: () => ({
    meta: [
      { title: "Insight for individuals | Buy and sell with people you don't know" },
      { property: "og:title", content: "Insight for individuals | Buy and sell with people you don't know" },
      { property: "og:description", content: "Buying a used car, a watch from an Instagram seller or hiring a freelancer? Pay into the deal; the other side is paid only after you receive and check. Demo with a simulated payment provider." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Buying a used car, a watch from an Instagram seller or hiring a freelancer? Pay into the deal; the other side is paid only after you receive and check. Demo with a simulated payment provider." },
    ],
  }),
  component: IndividualsPage,
});

const USES: Feature[] = [
  { icon: Car, title: ["Used cars", "السيارات المستعملة"], body: ["Agree the price and the inspection, then pay into the deal. The seller is paid after you take the car and check its condition.", "اتفقا على السعر والفحص، ثم ادفع في الصفقة. يُحوَّل المبلغ للبائع بعد أن تستلم السيارة وتتأكد من حالتها."] },
  { icon: Watch, title: ["Watches and valuables", "الساعات والمقتنيات الثمينة"], body: ["Buy from an account on social media without transferring money to someone you have never met.", "اشترِ من حساب على وسائل التواصل دون أن تحوّل مالك لشخص لم تقابله."] },
  { icon: Smartphone, title: ["Phones and electronics", "الأجهزة والإلكترونيات"], body: ["A phone or a laptop from a new seller: check it first, and only then is the seller paid.", "هاتف أو حاسوب من بائع جديد: افحصه أولاً، وبعدها فقط يُحوَّل المبلغ للبائع."] },
  { icon: PenTool, title: ["Freelance work", "العمل الحر"], body: ["Design, code, writing: the freelancer starts knowing the money is paid, and you accept the work before it is released.", "تصميم، برمجة، كتابة: يبدأ المستقل وهو يعلم أن المبلغ مدفوع، وتقبل أنت العمل قبل أن يُحوَّل."] },
  { icon: Gavel, title: ["Social-media auctions", "مزادات وسائل التواصل"], body: ["Won a piece in an auction on Instagram or TikTok? Pay through Insight within 24 hours; the money moves after you inspect it.", "فزت بقطعة في مزاد على إنستغرام أو تيك توك؟ ادفع عبر إنسايت خلال 24 ساعة، ويُحوَّل المبلغ بعد أن تفحصها."] },
  { icon: Hammer, title: ["Home renovation", "تجديد المنزل"], body: ["A contractor for your kitchen or garden, in stages: each stage is paid when you approve it.", "مقاول لمطبخك أو حديقتك على مراحل: كل مرحلة تُدفع حين تعتمدها."] },
];

const SELLER: T2[] = [
  ["The buyer is serious: they paid before you hand anything over.", "المشتري جادّ: دفع قبل أن تسلّم أي شيء."],
  ["No more screenshots of transfer receipts — the deal itself shows the money is paid.", "لا تعتمد على صورة إيصال: الصفقة نفسها تُظهر أن المبلغ مدفوع."],
  ["You are paid to your verified bank account once the buyer confirms, or when the inspection period ends without an objection.", "يُحوَّل المبلغ لحسابك البنكي الموثّق حين يؤكد المشتري، أو بانتهاء مدة الفحص دون اعتراض."],
];

const SAFETY: Feature[] = [
  { icon: Wallet, title: ["Never pay outside the deal", "لا تدفع خارج الصفقة"], body: ["If someone asks you to transfer directly \"to save the fee\", that is the moment to stop.", "إن طلب منك أحد التحويل المباشر «لتوفير الرسوم»، فهذه لحظة التوقف."] },
  { icon: Link2, title: ["Check the link", "تأكد من الرابط"], body: ["Every deal invitation opens on insightsettle.com. Do not trust copies of the page on other addresses.", "كل دعوة صفقة تُفتح على insightsettle.com. لا تثق بنسخ من الصفحة على عناوين أخرى."] },
  { icon: KeyRound, title: ["Keep your codes to yourself", "لا تشارك رموزك"], body: ["Insight staff will never ask for your password or a verification code.", "لن يطلب منك فريق إنسايت كلمة المرور أو رمز التحقق أبداً."] },
];

const FAQ: [T2, T2][] = [
  [["Do I need a commercial registration to use Insight?", "هل أحتاج إلى سجل تجاري لاستخدام إنسايت؟"],
   ["No. A personal account with a verified ID is enough to buy or sell.", "لا. يكفي حساب شخصي مع توثيق هويتك لتشتري أو تبيع."]],
  [["What if the item is not as described?", "ماذا لو كانت السلعة مختلفة عن الوصف؟"],
   ["Open a dispute before your checking time ends. The payout stops, both sides upload their evidence, and a written decision is approved by two Insight staff members.",
    "افتح نزاعاً قبل انتهاء مدة الفحص. يتوقف تحويل المبلغ، ويرفع الطرفان أدلتهما، ويصدر قرار مكتوب يعتمده موظفان في إنسايت."]],
  [["When does the seller receive the money?", "متى يستلم البائع المبلغ؟"],
   ["As soon as you confirm you received what you agreed. If you do nothing, it is paid automatically when the agreed checking time ends with no dispute.",
    "فور تأكيدك أنك استلمت ما اتفقتما عليه. وإن لم تفعل شيئاً، يُحوَّل تلقائياً عند انتهاء مدة الفحص المتفق عليها دون نزاع."]],
  [["Who pays the fee, and how much is it?", "من يدفع الرسوم، وكم هي؟"],
   ["You decide together: the buyer, the seller, or half each. Creating a deal is free; the fee, 2.5% with a minimum of BHD 6, is charged only when the deal is paid.",
    "تقرران معاً: المشتري أو البائع أو مناصفة. إنشاء الصفقة مجاني، والرسوم 2.5% بحد أدنى 6 دنانير بحرينية، ولا تُحتسب إلا عند الدفع."]],
];

function DealPreview() {
  const { text } = useLocale();
  const rows: [typeof BadgeCheck, T2][] = [
    [BadgeCheck, ["Buyer and seller verified", "المشتري والبائع موثّقان"]],
    [Eye, ["Inspection at the buyer's garage · 2 days", "فحص في ورشة يختارها المشتري · يومان"]],
    [CircleCheckBig, ["Paid to the seller after the inspection", "يُحوَّل للبائع بعد الفحص"]],
  ];
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_30px_60px_-40px_rgb(12_42_34/0.45)] sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3"><IconTile icon={Car} size="sm" /><div><p className="text-xs text-muted-foreground">{text("Example deal", "مثال")}</p><h2 className="text-lg font-semibold">{text("Used sedan, 2021", "سيارة سيدان مستعملة 2021")}</h2></div></div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{text("Paid into the deal", "المبلغ محفوظ")}</span>
      </div>
      <p className="mt-6 text-3xl font-bold tabular-nums"><bdi dir="ltr">{formatMoney(6800, "BHD")}</bdi></p>
      <div className="mt-6 space-y-3">{rows.map(([I, t]) => <div key={t[0]} className="flex items-center gap-3 rounded-xl bg-background p-3 text-sm"><I className="size-5 shrink-0 text-primary" /><span>{text(t[0], t[1])}</span></div>)}</div>
    </div>
  );
}

function IndividualsPage() {
  const { text } = useLocale();
  return <SiteShell><div data-no-localize>
    <PageHero
      badge={["For individuals", "للأفراد"]}
      title={["Buy and sell with peace of mind,", "اشترِ وبِع وأنت مطمئن،"]}
      highlight={["even with someone you don't know.", "حتى مع من لا تعرفه."]}
      body={["A used car from a listing, a watch from an Instagram account, or a freelancer for your project: pay into the deal, and the other side is paid only after you receive and check.", "سيارة مستعملة من إعلان، ساعة من حساب على إنستغرام، أو مستقل لمشروعك: ادفع في الصفقة، ولا يصل المبلغ للطرف الآخر إلا بعد أن تستلم وتتأكد."]}
      points={[["Free to create a deal", "إنشاء الصفقة مجاني"], ["Pay in your own currency", "ادفع بعملتك"], ["Arabic and English", "بالعربية والإنجليزية"]]}
      primary={{ label: ["Start your first deal", "ابدأ صفقتك الأولى"], to: "/auth", signup: true }}
      secondary={{ label: ["See how it works", "شاهد كيف تعمل"], to: "/how-it-works" }}
      aside={<DealPreview />}
    />

    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader eyebrow={["What people use it for", "فيمَ يستخدمه الناس"]} title={["Any deal where paying first feels risky", "كل صفقة تخشى فيها أن تدفع أولاً"]} />
      <FeatureGrid items={USES} />
    </section>

    <section className="border-y border-border bg-secondary"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader title={["Four steps, every one on record", "أربع خطوات، وكل خطوة موثّقة"]} intro={["Each side always knows what happens next.", "يعرف كل طرف دائماً ما المطلوب منه الآن."]} />
      <StepsFlow />
    </div></section>

    <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2 lg:py-20">
      <div>
        <SectionHeader eyebrow={["If you are the seller", "إن كنت البائع"]} title={["Sell to strangers without the worry", "بِع لمن لا تعرفه دون قلق"]} />
        <ul className="mt-8 space-y-5">{SELLER.map(([en, ar]) => <li key={en} className="flex gap-4 leading-8"><IconTile icon={ShieldCheck} tone="soft" size="sm" /><span className="pt-1">{text(en, ar)}</span></li>)}</ul>
      </div>
      <div className="rounded-3xl border border-border bg-card p-8">
        <div className="flex items-center gap-3"><IconTile icon={Scale} /><h3 className="text-xl font-semibold">{text("If something goes wrong", "إن حدثت مشكلة")}</h3></div>
        <p className="mt-4 leading-8 text-muted-foreground">{text("Open a dispute in one tap. The payout stops, both sides submit their evidence, and the Insight team issues a written decision approved by two staff members.", "افتح نزاعاً بضغطة. يتوقف التحويل، ويقدّم الطرفان أدلتهما، ويصدر فريق إنسايت قراراً مكتوباً يعتمده موظفان.")}</p>
        <div className="mt-6 flex items-center gap-3"><IconTile icon={Receipt} tone="soft" size="sm" /><p className="text-sm leading-7 text-muted-foreground">{text("Fees from BHD 6, shown before you pay.", "رسوم تبدأ من 6 دنانير بحرينية، تظهر لك قبل الدفع.")} <Link to="/pricing" className="font-semibold text-primary">{text("Fee calculator", "حاسبة الرسوم")}</Link></p></div>
      </div>
    </section>

    <section className="border-y border-border bg-secondary"><div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <SectionHeader eyebrow={["Stay safe", "تعامل بأمان"]} title={["Three habits that protect your money", "ثلاث عادات تحمي مالك"]} />
      <FeatureGrid items={SAFETY} />
    </div></section>

    <section className="mx-auto max-w-4xl px-5 py-16 lg:py-20">
      <SectionHeader title={["Questions from individuals", "أسئلة يطرحها الأفراد"]} />
      <FaqList items={FAQ} />
      <Link to="/faq" className="mt-6 inline-block font-semibold text-primary">{text("All questions", "كل الأسئلة")}</Link>
    </section>

    <CtaBand title={["Your next purchase deserves peace of mind", "مشترياتك القادمة تستحق الاطمئنان"]} body={["Create the deal in minutes and send the other side one link.", "أنشئ الصفقة في دقائق، وأرسل للطرف الآخر رابطاً واحداً."]} />
  </div></SiteShell>;
}
