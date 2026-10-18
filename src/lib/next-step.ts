/**
 * "What happens now" for one viewer of a deal: a title, one sentence and, when it is the viewer's turn, the
 * one action to take. Pure and presentation-only: it mirrors the server's party rules but never decides them
 * (every action still goes through the existing server functions).
 */
import { GENERIC_ROLES, the, to, type Roles } from "@/lib/roles";

export type Bilingual = [en: string, ar: string];
export type NextStepAction = "accept-terms" | "scroll-terms" | "scroll-pay" | "scroll-ship" | "deliver" | "release" | "scroll-dispute" | "scroll-milestones";
export type NextStep = {
  icon: "terms" | "pay" | "ship" | "inspect" | "wait" | "done" | "dispute";
  mine: boolean;
  title: Bilingual;
  body: Bilingual;
  note?: Bilingual;
  primary?: { label: Bilingual; action: NextStepAction } | undefined;
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
  submittedMilestone?: number | null | undefined;
  workingMilestone?: number | null | undefined;
  nextMilestoneAmount?: string | null;
  /** Inspection deadline already formatted for display, or null. */
  deadline: Bilingual | null;
  /** Party names for this deal type (buyer/seller, client/service provider, owner/contractor…). */
  roles?: Roles;
};

export const RELEASE_LABEL: Bilingual = ["Confirm receipt and release the payment", "أكّد الاستلام وحوّل المبلغ"];
export const DELIVER_LABEL: Bilingual = ["Mark as delivered", "أكّد أنك سلّمت"];
export const ACCEPT_LABEL: Bilingual = ["Accept the terms", "أوافق على الشروط"];

export function nextStepFor(i: NextStepInput): NextStep | null {
  const party = i.isBuyer || i.isSeller;
  if (!party) return null;
  const R = i.roles ?? GENERIC_ROLES;
  const [payerEn, payerAr] = the(R.payer);
  const [payeeEn, payeeAr] = the(R.payee);
  const [toPayeeEn, toPayeeAr] = to(R.payee);
  if (i.frozen) return { icon: "wait", mine: false, title: ["This deal is on hold", "الصفقة موقوفة مؤقتاً"], body: ["The Insight team has paused this deal. No money moves until it is resumed; you will be notified.", "أوقف فريق إنسايت هذه الصفقة مؤقتاً. لا يتحرك أي مبلغ حتى تُستأنف، وسنبلغك فوراً."] };
  if (i.status === "disputed") return { icon: "dispute", mine: false, title: ["The dispute is under review", "النزاع قيد المراجعة"], body: ["The payout is paused until the Insight team issues its written decision. Add any evidence in the dispute section.", "توقف التحويل حتى يصدر فريق إنسايت قراره المكتوب. أضف أدلتك في قسم النزاع."], secondary: { label: ["Open the dispute", "افتح قسم النزاع"], action: "scroll-dispute" } };
  if (["cancelled", "rejected"].includes(i.status)) return { icon: "done", mine: false, title: ["This deal was cancelled", "أُلغيت هذه الصفقة"], body: ["No further action is needed.", "لا يلزم أي إجراء آخر."] };
  if (["refunded", "partially_refunded"].includes(i.status)) return { icon: "done", mine: false, title: ["The deal is closed", "أُغلقت الصفقة"], body: ["The amount was settled under the recorded decision. The full record stays on this page.", "سُوّي المبلغ وفق القرار المسجّل، ويبقى السجل كاملاً في هذه الصفحة."] };
  if (["released", "completed"].includes(i.status)) return { icon: "done", mine: false, title: ["Deal complete", "اكتملت الصفقة"], body: i.isSeller ? ["The amount was paid out to you. Thank you for using Insight — you can rate the other party below.", "حُوِّل المبلغ إليك. شكراً لاستخدامك إنسايت، ويمكنك تقييم الطرف الآخر أدناه."] : [`The amount was paid out ${toPayeeEn}. Thank you for using Insight — you can rate the other party below.`, `حُوِّل المبلغ ${toPayeeAr}. شكراً لاستخدامك إنسايت، ويمكنك تقييم الطرف الآخر أدناه.`] };

  if (i.status === "pending_funding") {
    if (!i.bothJoined) return { icon: "wait", mine: false, title: ["Waiting for the other party to join", "بانتظار انضمام الطرف الآخر"], body: ["Share the invitation link so they can review the terms.", "شارك رابط الدعوة ليراجع الشروط."] };
    if (!i.termsAgreed) {
      if (i.canDecideTerms) return { icon: "terms", mine: true, title: ["Review the terms and accept them", "راجع الشروط ووافق عليها"], body: ["Check the amount, what will be delivered and the inspection period. Nothing is paid before you both agree.", "تأكد من المبلغ وما سيُسلَّم ومدة الفحص. لا يُدفع أي مبلغ قبل موافقتكما."], primary: { label: ACCEPT_LABEL, action: "accept-terms" }, secondary: { label: ["Ask for a change", "أطلب تعديلاً"], action: "scroll-terms" } };
      return { icon: "wait", mine: false, title: ["Waiting for the other party to accept the terms", "بانتظار موافقة الطرف الآخر على الشروط"], body: ["We will notify you as soon as they accept or ask for a change.", "سنخبرك فور موافقته أو طلبه تعديلاً."] };
    }
    if (i.isBuyer) {
      const ms = i.nextMilestoneToFund;
      return { icon: "pay", mine: true, title: ms ? [`Pay milestone ${ms} to get started`, `ادفع المرحلة ${ms} ليبدأ العمل`] : ["Pay for the deal", "ادفع مبلغ الصفقة"], body: [`The amount stays in the deal and is paid out ${toPayeeEn} only after delivery and the inspection period.`, `يبقى المبلغ في الصفقة، ولا يُحوَّل ${toPayeeAr} إلا بعد التسليم ومدة الفحص.`], primary: { label: ["See my amount and pay", "اعرض المبلغ وادفع"], action: "scroll-pay" } };
    }
    return { icon: "wait", mine: false, title: [`Waiting for ${payerEn} to pay`, `بانتظار دفع ${payerAr}`], body: ["We will notify you as soon as the payment is confirmed, so you can start.", "سنخبرك فور تأكيد الدفع لتبدأ التنفيذ."] };
  }

  if (i.status === "in_progress" && i.hasMilestones) {
    if (i.submittedMilestone) return { icon: "inspect", mine: i.isBuyer, title: [`Review milestone ${i.submittedMilestone}`, `راجع المرحلة ${i.submittedMilestone}`], body: [`${cap1(payeeEn)} submitted the milestone. Review the evidence and payment schedule below.`, `سلّم ${payeeAr} المرحلة. راجع الأدلة وجدول الدفع أدناه.`], primary: i.isBuyer ? { label: ["Review the milestone", "راجع المرحلة"], action: "scroll-milestones" } : undefined };
    if (i.workingMilestone) return { icon: "inspect", mine: i.isSeller, title: [`Milestone ${i.workingMilestone} is in progress`, `المرحلة ${i.workingMilestone} قيد التنفيذ`], body: [`${cap1(payeeEn)} can submit completion evidence in the milestone schedule.`, `يمكن ${payeeAr} تقديم إثبات الإنجاز في جدول المراحل.`], primary: i.isSeller ? { label: ["Open the milestone", "افتح المرحلة"], action: "scroll-milestones" } : undefined };
    if (i.nextMilestoneToFund) return { icon: "pay", mine: i.isBuyer, title: [`Fund milestone ${i.nextMilestoneToFund}${i.nextMilestoneAmount ? ` · ${i.nextMilestoneAmount}` : ""}`, `موّل المرحلة ${i.nextMilestoneToFund}${i.nextMilestoneAmount ? ` · ${i.nextMilestoneAmount}` : ""}`], body: [`${cap1(payerEn)} funds the next milestone before work starts.`, `يموّل ${payerAr} المرحلة التالية قبل بدء العمل.`], primary: i.isBuyer ? { label: ["See my amount and pay", "اعرض المبلغ وادفع"], action: "scroll-pay" } : undefined };
    return { icon: "wait", mine: false, title: ["Milestone schedule", "جدول المراحل"], body: ["Review the complete payment and retention record below.", "راجع سجل الدفع والمحتجزات الكامل أدناه."], secondary: { label: ["View milestones", "عرض المراحل"], action: "scroll-milestones" } };
  }

  if (i.status === "held") {
    if (i.isSeller) {
      if (i.shippingNeeded && !i.shipped) return { icon: "ship", mine: true, title: ["Ship the order and add the tracking number", "اشحن الطلب وأضف رقم التتبع"], body: [`${cap1(payerEn)} has paid. Once you ship, add the carrier and tracking number so they can follow it.`, `دفع ${payerAr} المبلغ. بعد الشحن أضف شركة الشحن ورقم التتبع ليتابع طلبه.`], primary: { label: ["Add shipping details", "أضف بيانات الشحن"], action: "scroll-ship" } };
      return { icon: "inspect", mine: true, title: ["Confirm when you have delivered", "أكّد عندما تُسلِّم"], body: [`Once you confirm, ${payerEn}'s inspection period starts.`, `بعد تأكيدك تبدأ مدة الفحص لدى ${payerAr}.`], primary: { label: DELIVER_LABEL, action: "deliver" } };
    }
    if (i.hasMilestones) return null;
    return i.shipped
      ? { icon: "ship", mine: false, title: [`${cap1(payeeEn)} has shipped your order`, `${payeeAr} شحن طلبك`], body: ["Follow the shipment below. Your inspection period starts when it is delivered.", "تابع الشحنة أدناه. تبدأ مدة الفحص عند التسليم."] }
      : { icon: "wait", mine: false, title: [`${cap1(payeeEn)} is preparing your order`, `${payeeAr} يجهّز طلبك`], body: ["Your payment is in the deal. We will notify you when it ships.", "دفعتك في الصفقة، وسنخبرك عند الشحن."] };
  }

  if (i.status === "delivered") {
    const until: Bilingual = i.deadline ? [`You have until ${i.deadline[0]} to check it.`, `لديك حتى ${i.deadline[1]} للتأكد.`] : ["Check it carefully.", "تأكد منه جيداً."];
    if (i.isBuyer) return {
      icon: "inspect", mine: true, title: ["Inspect, then confirm receipt", "افحص ثم أكّد الاستلام"],
      body: [`${until[0]} When you confirm, the amount is paid out ${toPayeeEn}.`, `${until[1]} عند تأكيدك يُحوَّل المبلغ ${toPayeeAr}.`],
      ...(i.autoRelease ? { note: ["If you take no action by the end of the inspection period, the amount is paid out automatically.", "إذا لم تتخذ إجراءً حتى نهاية مدة الفحص، يُحوَّل المبلغ تلقائياً."] as Bilingual } : {}),
      primary: { label: RELEASE_LABEL, action: "release" }, secondary: { label: ["Something is wrong", "هناك مشكلة"], action: "scroll-dispute" },
    };
    return { icon: "wait", mine: false, title: [`${cap1(payerEn)} is inspecting the delivery`, `${payerAr} يفحص التسليم`], body: i.autoRelease && i.deadline ? [`You are paid when ${payerEn} confirms, or automatically at the end of the inspection period (${i.deadline[0]}).`, `يُحوَّل المبلغ لك عند تأكيد ${payerAr}، أو تلقائياً بنهاية مدة الفحص (${i.deadline[1]}).`] : [`You are paid when ${payerEn} confirms receipt.`, `يُحوَّل المبلغ لك عند تأكيد ${payerAr} الاستلام.`] };
  }

  if (i.status === "under_review") {
    if (i.isSeller) return { icon: "inspect", mine: true, title: [`${cap1(payerEn)} asked for a revision`, `${payerAr} طلب تعديلاً`], body: [`Read ${payerEn}'s note in the timeline, make the change, then confirm delivery again. A new inspection period starts.`, `اقرأ ملاحظة ${payerAr} في السجل، ونفّذ التعديل، ثم أكّد التسليم من جديد لتبدأ مدة فحص جديدة.`], primary: { label: DELIVER_LABEL, action: "deliver" } };
    return { icon: "wait", mine: false, title: [`Waiting for ${payeeEn}'s revision`, `بانتظار تعديل ${payeeAr}`], body: ["You will be notified when it is delivered again. If you are already satisfied, you can confirm now.", "سنخبرك عند التسليم مجدداً. وإن كنت راضياً الآن يمكنك التأكيد."], secondary: { label: RELEASE_LABEL, action: "release" } };
  }
  return null;
}

/** "the buyer" → "The buyer" */
function cap1(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
