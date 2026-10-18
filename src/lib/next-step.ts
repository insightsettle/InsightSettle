/**
 * "What happens now" for one viewer of a deal: a title, one sentence and, when it is the viewer's turn, the
 * one action to take. Pure and presentation-only: it mirrors the server's party rules but never decides them
 * (every action still goes through the existing server functions).
 */
export type Bilingual = [en: string, ar: string];
export type NextStepAction = "accept-terms" | "scroll-terms" | "scroll-pay" | "scroll-ship" | "deliver" | "release" | "scroll-dispute";
export type NextStep = {
  icon: "terms" | "pay" | "ship" | "inspect" | "wait" | "done" | "dispute";
  mine: boolean;
  title: Bilingual;
  body: Bilingual;
  note?: Bilingual;
  primary?: { label: Bilingual; action: NextStepAction };
  secondary?: { label: Bilingual; action: NextStepAction };
};

export type NextStepInput = {
  status: string;
  termsAgreed: boolean;
  isBuyer: boolean;
  isSeller: boolean;
  bothJoined: boolean;
  canDecideTerms: boolean;
  shippingNeeded: boolean;
  shipped: boolean;
  autoRelease: boolean;
  frozen: boolean;
  hasMilestones: boolean;
  nextMilestoneToFund: number | null;
  /** Inspection deadline already formatted for display, or null. */
  deadline: Bilingual | null;
};

export const RELEASE_LABEL: Bilingual = ["Confirm receipt and pay the supplier", "أكّد الاستلام وحوّل المبلغ للمورد"];
export const DELIVER_LABEL: Bilingual = ["Mark as delivered", "أكّد أنك سلّمت"];
export const ACCEPT_LABEL: Bilingual = ["Accept the terms", "أوافق على الشروط"];

export function nextStepFor(i: NextStepInput): NextStep | null {
  const party = i.isBuyer || i.isSeller;
  if (!party) return null;
  if (i.frozen) return { icon: "wait", mine: false, title: ["This deal is on hold", "الصفقة موقوفة مؤقتاً"], body: ["The Insight team has paused this deal. No money moves until it is resumed; you will be notified.", "أوقف فريق إنسايت هذه الصفقة مؤقتاً. لا يتحرك أي مبلغ حتى تُستأنف، وسنبلغك فوراً."] };
  if (i.status === "disputed") return { icon: "dispute", mine: false, title: ["The dispute is under review", "النزاع قيد المراجعة"], body: ["The payout is paused until the Insight team issues its written decision. Add any evidence in the dispute section.", "توقف التحويل حتى يصدر فريق إنسايت قراره المكتوب. أضف أدلتك في قسم النزاع."], secondary: { label: ["Open the dispute", "افتح قسم النزاع"], action: "scroll-dispute" } };
  if (["cancelled", "rejected"].includes(i.status)) return { icon: "done", mine: false, title: ["This deal was cancelled", "أُلغيت هذه الصفقة"], body: ["No further action is needed.", "لا يلزم أي إجراء آخر."] };
  if (["refunded", "partially_refunded"].includes(i.status)) return { icon: "done", mine: false, title: ["The deal is closed", "أُغلقت الصفقة"], body: ["The amount was settled under the recorded decision. The full record stays on this page.", "سُوّي المبلغ وفق القرار المسجّل، ويبقى السجل كاملاً في هذه الصفحة."] };
  if (["released", "completed"].includes(i.status)) return { icon: "done", mine: false, title: ["Deal complete", "اكتملت الصفقة"], body: i.isSeller ? ["The amount was paid out to you. Thank you for using Insight — you can rate the buyer below.", "حُوِّل المبلغ إليك. شكراً لاستخدامك إنسايت، ويمكنك تقييم المشتري أدناه."] : ["The amount was paid out to the supplier. Thank you for using Insight — you can rate the supplier below.", "حُوِّل المبلغ إلى المورد. شكراً لاستخدامك إنسايت، ويمكنك تقييم المورد أدناه."] };

  if (i.status === "pending_funding") {
    if (!i.bothJoined) return { icon: "wait", mine: false, title: ["Waiting for the other party to join", "بانتظار انضمام الطرف الآخر"], body: ["Share the invitation link so they can review the terms.", "شارك رابط الدعوة ليراجع الشروط."] };
    if (!i.termsAgreed) {
      if (i.canDecideTerms) return { icon: "terms", mine: true, title: ["Review the terms and accept them", "راجع الشروط ووافق عليها"], body: ["Check the amount, what will be delivered and the inspection period. Nothing is paid before you both agree.", "تأكد من المبلغ وما سيُسلَّم ومدة الفحص. لا يُدفع أي مبلغ قبل موافقتكما."], primary: { label: ACCEPT_LABEL, action: "accept-terms" }, secondary: { label: ["Ask for a change", "أطلب تعديلاً"], action: "scroll-terms" } };
      return { icon: "wait", mine: false, title: ["Waiting for the other party to accept the terms", "بانتظار موافقة الطرف الآخر على الشروط"], body: ["We will notify you as soon as they accept or ask for a change.", "سنخبرك فور موافقته أو طلبه تعديلاً."] };
    }
    if (i.isBuyer) {
      const ms = i.nextMilestoneToFund;
      return { icon: "pay", mine: true, title: ms ? [`Pay milestone ${ms} to get started`, `ادفع المرحلة ${ms} ليبدأ العمل`] : ["Pay for the deal", "ادفع مبلغ الصفقة"], body: ["The amount stays in the deal and is paid out to the supplier only after delivery and the inspection period.", "يبقى المبلغ في الصفقة، ولا يُحوَّل للمورد إلا بعد التسليم ومدة الفحص."], primary: { label: ["See my amount and pay", "اعرض المبلغ وادفع"], action: "scroll-pay" } };
    }
    return { icon: "wait", mine: false, title: ["Waiting for the buyer to pay", "بانتظار دفع المشتري"], body: ["We will notify you as soon as the payment is confirmed, so you can start.", "سنخبرك فور تأكيد الدفع لتبدأ التنفيذ."] };
  }

  if (i.status === "held") {
    if (i.isSeller) {
      if (i.shippingNeeded && !i.shipped) return { icon: "ship", mine: true, title: ["Ship the order and add the tracking number", "اشحن الطلب وأضف رقم التتبع"], body: ["The buyer has paid. Once you ship, add the carrier and tracking number so the buyer can follow it.", "دفع المشتري المبلغ. بعد الشحن أضف شركة الشحن ورقم التتبع ليتابع المشتري طلبه."], primary: { label: ["Add shipping details", "أضف بيانات الشحن"], action: "scroll-ship" } };
      return { icon: "inspect", mine: true, title: ["Confirm when you have delivered", "أكّد عندما تُسلِّم"], body: ["Once you confirm, the buyer's inspection period starts.", "بعد تأكيدك تبدأ مدة الفحص لدى المشتري."], primary: { label: DELIVER_LABEL, action: "deliver" } };
    }
    if (i.hasMilestones) return null;
    return i.shipped
      ? { icon: "ship", mine: false, title: ["The supplier has shipped your order", "المورد شحن طلبك"], body: ["Follow the shipment below. Your inspection period starts when it is delivered.", "تابع الشحنة أدناه. تبدأ مدة الفحص عند التسليم."] }
      : { icon: "wait", mine: false, title: ["The supplier is preparing your order", "المورد يجهّز طلبك"], body: ["Your payment is in the deal. We will notify you when it ships.", "دفعتك في الصفقة، وسنخبرك عند الشحن."] };
  }

  if (i.status === "delivered") {
    const until: Bilingual = i.deadline ? [`You have until ${i.deadline[0]} to check it.`, `لديك حتى ${i.deadline[1]} للتأكد.`] : ["Check it carefully.", "تأكد منه جيداً."];
    if (i.isBuyer) return {
      icon: "inspect", mine: true, title: ["Inspect, then confirm receipt", "افحص ثم أكّد الاستلام"],
      body: [`${until[0]} When you confirm, the amount is paid out to the supplier.`, `${until[1]} عند تأكيدك يُحوَّل المبلغ للمورد.`],
      ...(i.autoRelease ? { note: ["If you take no action by the end of the inspection period, the amount is paid out automatically.", "إذا لم تتخذ إجراءً حتى نهاية مدة الفحص، يُحوَّل المبلغ تلقائياً."] as Bilingual } : {}),
      primary: { label: RELEASE_LABEL, action: "release" }, secondary: { label: ["Something is wrong", "هناك مشكلة"], action: "scroll-dispute" },
    };
    return { icon: "wait", mine: false, title: ["The buyer is inspecting the delivery", "المشتري يفحص التسليم"], body: i.autoRelease && i.deadline ? [`You are paid when the buyer confirms, or automatically at the end of the inspection period (${i.deadline[0]}).`, `يُحوَّل المبلغ لك عند تأكيد المشتري، أو تلقائياً بنهاية مدة الفحص (${i.deadline[1]}).`] : ["You are paid when the buyer confirms receipt.", "يُحوَّل المبلغ لك عند تأكيد المشتري الاستلام."] };
  }

  if (i.status === "under_review") {
    if (i.isSeller) return { icon: "inspect", mine: true, title: ["The buyer asked for a revision", "المشتري طلب تعديلاً"], body: ["Read the buyer's note in the timeline, make the change, then confirm delivery again. A new inspection period starts.", "اقرأ ملاحظة المشتري في السجل، ونفّذ التعديل، ثم أكّد التسليم من جديد لتبدأ مدة فحص جديدة."], primary: { label: DELIVER_LABEL, action: "deliver" } };
    return { icon: "wait", mine: false, title: ["Waiting for the supplier's revision", "بانتظار تعديل المورد"], body: ["You will be notified when it is delivered again. If you are already satisfied, you can confirm now.", "سنخبرك عند التسليم مجدداً. وإن كنت راضياً الآن يمكنك التأكيد."], secondary: { label: RELEASE_LABEL, action: "release" } };
  }
  return null;
}
