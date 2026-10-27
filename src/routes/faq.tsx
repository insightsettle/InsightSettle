import { createFileRoute } from "@tanstack/react-router";

import { InfoPage, infoHead } from "@/components/site/InfoPage";

export const Route = createFileRoute("/faq")({
  head: () => infoHead("FAQ", "Answers to common questions about Insight escrow payments in Saudi Arabia and the Gulf."),
  component: () => (
    <InfoPage
      eyebrow="FAQ"
      title="Frequently asked questions"
      intro="Clear answers about where your money is, fees, currencies, checking what you receive and disputes."
      sections={[
        { h: ["Who holds my money while the deal is open?", "مَن يحتفظ بمبلغي طوال مدة الصفقة؟"],
          p: ["Not the other party, and not Insight. At launch the amount is held by a licensed payment provider and paid out only when the deal's conditions are met. This version is a demo: the provider is simulated and no real money moves.",
              "لا الطرف الآخر ولا إنسايت. عند الإطلاق يُحفظ المبلغ لدى مزوّد دفع مرخّص، ولا يُحوَّل إلا عند تحقق شروط الصفقة. هذه النسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية."] },
        { h: ["Which currencies can I use?", "ما العملات التي يمكنني استخدامها؟"],
          p: ["The Bahraini dinar is the default. You can also choose the Saudi riyal, UAE dirham, Qatari riyal, Kuwaiti dinar, Omani rial or US dollar, and each side can pay or be paid in its own currency.",
              "الدينار البحريني هو العملة الافتراضية، ويمكنك اختيار الريال السعودي أو الدرهم الإماراتي أو الريال القطري أو الدينار الكويتي أو الريال العُماني أو الدولار الأمريكي، ويدفع كل طرف أو يستلم بعملته."] },
        { h: ["How much does Insight charge?", "كم رسوم إنسايت؟"],
          p: ["Creating a deal is free. When it is paid, the fee is 2.5% of the deal value, with a minimum of BHD 6; paid by bank transfer, it never goes above BHD 1,300 per deal. VAT applies to the fee only. You agree who pays it: the buyer, the seller, or half each.",
              "إنشاء الصفقة مجاني. عند الدفع تكون الرسوم 2.5% من قيمة الصفقة بحد أدنى 6 دنانير بحرينية، وعند الدفع بتحويل بنكي لا تتجاوز 1,300 دينار للصفقة. والضريبة على الرسوم فقط، وتتفقان على من يدفعها: المشتري أو البائع أو مناصفة."] },
        { h: ["How long do I have to check what I received?", "كم لديّ من الوقت لفحص ما استلمته؟"],
          p: ["You and the other side agree the checking time when you create the deal, usually 2 to 7 days, starting from delivery. If you open no dispute in that time, the amount is paid out automatically, unless automatic payout was switched off for the deal.",
              "تتفقان على مدة الفحص عند إنشاء الصفقة، وهي عادة من يومين إلى 7 أيام تبدأ من التسليم. إن لم تفتح نزاعاً خلالها يُحوَّل المبلغ تلقائياً، إلا إذا أُوقف التحويل التلقائي في تلك الصفقة."] },
        { h: ["Can I cancel a deal?", "هل يمكنني إلغاء الصفقة؟"],
          p: ["Before you pay: yes, at any time. After you pay but before shipping: under the cancellation terms you both agreed. After shipping, cancellation is not available; if something is wrong, open a dispute instead.",
              "قبل الدفع: نعم، في أي وقت. بعد الدفع وقبل الشحن: وفق شروط الإلغاء التي اتفقتما عليها. بعد الشحن لا يمكن الإلغاء، وإن كانت هناك مشكلة فافتح نزاعاً."] },
        { h: ["What happens if we disagree?", "ماذا يحدث إذا اختلفنا؟"],
          p: ["Open a dispute and the payout stops. The other side has 48 hours to respond, both sides add their evidence within 72 hours, and Insight issues a written decision within 7 days, approved by two staff members.",
              "افتح نزاعاً فيتوقف تحويل المبلغ. أمام الطرف الآخر 48 ساعة للرد، ويضيف الطرفان أدلتهما خلال 72 ساعة، وتُصدر إنسايت قراراً مكتوباً خلال 7 أيام يعتمده موظفان."] },
        { h: ["Can I pay in one currency while the other side is paid in another?", "هل يمكن أن أدفع بعملة ويستلم الطرف الآخر بعملة أخرى؟"],
          p: ["Yes. For example, you pay in Bahraini dinars and a supplier in Riyadh receives Saudi riyals. You see the exchange rate before you pay, and it stays fixed for 15 minutes.",
              "نعم. مثلاً تدفع بالدينار البحريني ويستلم مورّد في الرياض بالريال السعودي. ترى سعر الصرف قبل أن تدفع، ويبقى ثابتاً لمدة 15 دقيقة."] },
        { h: ["My supplier is outside the Gulf, for example in China or Turkey. Can I still use Insight?", "المورّد خارج دول الخليج، مثلاً في الصين أو تركيا. هل أستطيع استخدام إنسايت؟"],
          p: ["Yes. When you create the deal, choose \"Outside the Gulf\" as the supplier's country and set the amount in US dollars. You pay in your own currency and the supplier is paid in dollars. At launch, the countries a payout can reach depend on the payment provider.",
              "نعم. عند إنشاء الصفقة اختر «خارج الخليج» دولةً للمورّد وحدّد المبلغ بالدولار الأمريكي. تدفع أنت بعملتك ويستلم المورّد بالدولار. عند الإطلاق تحدد جهة الدفع الدول التي يمكن التحويل إليها."] },
        { h: ["Does the other party need an Insight account?", "هل يحتاج الطرف الآخر إلى حساب في إنسايت؟"],
          p: ["Yes. You send one invitation link; they sign up in a few minutes, review and accept the terms, and the deal can start.",
              "نعم. ترسل له رابط دعوة واحداً، فيسجّل خلال دقائق ويراجع الشروط ويوافق عليها، ثم تبدأ الصفقة."] },
        { h: ["Do I need a commercial registration?", "هل أحتاج إلى سجل تجاري؟"],
          p: ["No. Individuals use a personal account with a verified ID. Businesses can add their commercial registration to deal in the business's name.",
              "لا. يستخدم الأفراد حساباً شخصياً مع توثيق الهوية، ويمكن لأصحاب الأعمال إضافة السجل التجاري للتعامل باسم المنشأة."] },
      ]}
    />
  ),
});
