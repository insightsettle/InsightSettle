import { useLocale } from "@/lib/locale";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help centre | Insight" },
      {
        name: "description",
        content:
          "Answers about funding, inspection periods, releasing funds, refunds, disputes and verification on Insight.",
      },
      { property: "og:title", content: "Insight help centre" },
      { property: "og:description", content: "How escrow works, step by step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpPage,
});

const faqs: { q: readonly [string, string]; a: readonly [string, string] }[] = [
  { q: ["How does a deal on Insight work, step by step?", "كيف تسير الصفقة في إنسايت خطوة بخطوة؟"],
    a: ["1) One side creates the deal: what is sold, the amount, the checking time and who pays the fee. 2) The other side opens the invitation link and accepts the terms. 3) The buyer pays into the deal. 4) The seller delivers. 5) The buyer checks and confirms, and the amount is paid out to the seller.",
        "1) ينشئ أحد الطرفين الصفقة: ما يُباع، والمبلغ، ومدة الفحص، ومن يدفع الرسوم. 2) يفتح الطرف الآخر رابط الدعوة ويوافق على الشروط. 3) يدفع المشتري المبلغ في الصفقة. 4) يسلّم البائع. 5) يفحص المشتري ويؤكد، فيُحوَّل المبلغ للبائع."] },
  { q: ["Who holds my money while the deal is open?", "مَن يحتفظ بمبلغي طوال مدة الصفقة؟"],
    a: ["Not the other party, and not Insight. At launch the amount is held by a licensed payment provider. This version is a demo: the provider is simulated and no real money moves.",
        "لا الطرف الآخر ولا إنسايت. عند الإطلاق يُحفظ المبلغ لدى مزوّد دفع مرخّص. هذه النسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية."] },
  { q: ["What is the checking time?", "ما هي مدة الفحص؟"],
    a: ["The number of days you both agree when the deal is created. It starts when the seller confirms delivery. During it the buyer can confirm, ask for changes, or open a dispute. If the buyer does nothing, the amount is paid out automatically when it ends.",
        "عدد الأيام الذي تتفقان عليه عند إنشاء الصفقة، ويبدأ عندما يؤكد البائع التسليم. خلالها يستطيع المشتري التأكيد أو طلب تعديل أو فتح نزاع، وإن لم يفعل شيئاً يُحوَّل المبلغ تلقائياً بانتهائها."] },
  { q: ["Can I get my money back?", "هل يمكنني استرداد مبلغي؟"],
    a: ["Yes, in full or in part. Both sides can agree a partial refund, or Insight decides the split when a dispute is escalated. Every refund appears in the deal's payment record.",
        "نعم، كاملاً أو جزئياً. يمكن للطرفين الاتفاق على استرداد جزئي، أو تحدد إنسايت التقسيم عند تصعيد النزاع. ويظهر كل استرداد في سجل مدفوعات الصفقة."] },
  { q: ["What happens if we disagree?", "ماذا يحدث إذا اختلفنا؟"],
    a: ["Open a dispute from the deal page and the payout stops. Insight reviews both sides' evidence under the dispute policy, and a second staff member approves the written decision.",
        "افتح نزاعاً من صفحة الصفقة فيتوقف التحويل. تراجع إنسايت أدلة الطرفين وفق سياسة النزاعات، ويعتمد موظف ثانٍ القرار المكتوب."] },
  { q: ["Why do I need to verify my identity?", "لماذا يجب أن أوثّق هويتي؟"],
    a: ["So both sides know who they are dealing with, and to meet anti-money-laundering rules. Upload your ID, or your commercial registration for a company, from the verification page. Only you and the Insight review team can see it.",
        "ليعرف كل طرف مع من يتعامل، وللالتزام بأنظمة مكافحة غسل الأموال. ارفع هويتك، أو سجلك التجاري للشركات، من صفحة التحقق، ولا يطّلع عليها إلا أنت وفريق المراجعة في إنسايت."] },
  { q: ["Which currencies can I use?", "ما العملات التي يمكنني استخدامها؟"],
    a: ["The Bahraini dinar is the default, and you can choose any Gulf currency or the US dollar. If you pay in a different currency from the deal, you see the exchange rate and the exact amount before you confirm.",
        "الدينار البحريني هو العملة الافتراضية، ويمكنك اختيار أي عملة خليجية أو الدولار الأمريكي. وإن دفعت بعملة غير عملة الصفقة، ترى سعر الصرف والمبلغ بالضبط قبل التأكيد."] },
  { q: ["How do I contact Insight about a specific deal?", "كيف أتواصل مع إنسايت بشأن صفقة معيّنة؟"],
    a: ["Every deal page has a chat with the other party and a private note box for the Insight team. Both are saved with that deal.",
        "في كل صفحة صفقة محادثة مع الطرف الآخر، وخانة ملاحظة خاصة لفريق إنسايت، وكلاهما يُحفظ مع الصفقة."] },
];

function HelpPage() {
  const { text } = useLocale();
  return (
    <SiteShell>
      <div data-no-localize className="reveal mx-auto max-w-3xl px-4 py-14">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <LifeBuoy className="size-3.5" />{text("Help centre")}</span>
        <h1 className="mt-4 text-4xl font-extrabold">{text("Questions, answered")}</h1>
        <p className="mt-3 text-muted-foreground">{text("Everything you need to know before opening your first deal.")}</p>

        <div className="reveal mt-8 space-y-3">
          {faqs.map((f) => (
            <Card key={f.q[0]} className="lift">
              <CardContent className="p-6">
                <h2 className="font-bold">{text(f.q[0], f.q[1])}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text(f.a[0], f.a[1])}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-primary/25 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="font-bold">{text("Still stuck?")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{text("Open the deal and use the note box for the Insight team, or create an account to start a conversation.")}</p>
            </div>
            <Button asChild>
              <Link to="/auth">{text("Sign in")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
