/**
 * C03 market survey: questions, answer options and validation shared by the public page, the server and the console.
 * Answers are stored as option keys; labels are [English, Arabic].
 */
import { z } from "zod";

type Opt = readonly [key: string, en: string, ar: string];
export type SurveyQuestion = { id: SurveyField; en: string; ar: string; multi?: boolean; options: readonly Opt[] };
export type SurveyField = "respondent" | "country" | "unknown_party" | "problems" | "deal_size" | "current_method" | "would_use" | "fee_ok" | "heard_of";

export const SURVEY_QUESTIONS: readonly SurveyQuestion[] = [
  { id: "respondent", en: "Which describes you best?", ar: "أيّ وصف ينطبق عليك أكثر؟", options: [
    ["individual_buyer", "I buy as an individual", "أشتري بصفتي فرداً"],
    ["business_buyer", "I buy for a business", "أشتري لمنشأة"],
    ["supplier", "I sell goods (supplier or shop)", "أبيع بضائع (مورد أو متجر)"],
    ["services", "I sell services or freelance", "أقدّم خدمات أو أعمل مستقلاً"],
    ["contractor", "Contractor or fit-out", "مقاول أو تشطيبات"],
    ["auction", "I run or join social-media auctions", "أنظّم أو أشارك في مزادات التواصل الاجتماعي"],
  ] },
  { id: "country", en: "Where are you based?", ar: "أين مقرّك؟", options: [
    ["SA", "Saudi Arabia", "السعودية"], ["BH", "Bahrain", "البحرين"], ["AE", "UAE", "الإمارات"],
    ["KW", "Kuwait", "الكويت"], ["QA", "Qatar", "قطر"], ["OM", "Oman", "عُمان"], ["other", "Elsewhere", "أخرى"],
  ] },
  { id: "unknown_party", en: "In the last 12 months, did you pay or get paid by someone you had not dealt with before?", ar: "خلال آخر 12 شهراً، هل دفعت أو استلمت مبلغاً من طرف لم تتعامل معه من قبل؟", options: [
    ["often", "Yes, often", "نعم، كثيراً"], ["sometimes", "Yes, a few times", "نعم، بضع مرات"], ["never", "No", "لا"],
  ] },
  { id: "problems", en: "Which of these has happened to you? (choose all that apply)", ar: "أيّ مما يلي حدث معك؟ (اختر كل ما ينطبق)", multi: true, options: [
    ["late_payment", "I was paid late or not at all", "تأخّر الدفع لي أو لم يُدفع"],
    ["not_delivered", "I paid and nothing arrived", "دفعت ولم يصلني شيء"],
    ["not_as_described", "What arrived was not as agreed", "وصلني شيء مختلف عن الاتفاق"],
    ["big_advance", "I was asked for a large payment up front", "طُلب مني دفع مبلغ كبير مقدماً"],
    ["work_stopped", "A contractor took an advance and stopped", "أخذ مقاول دفعة مقدمة وتوقف"],
    ["no_resolution", "A disagreement with no fair way to settle it", "خلاف لم أجد طريقة عادلة لحلّه"],
    ["none", "None of these", "لا شيء مما سبق"],
  ] },
  { id: "deal_size", en: "What is a typical amount for one of these deals?", ar: "ما المبلغ المعتاد لصفقة واحدة من هذا النوع؟", options: [
    ["lt1k", "Under SAR 1,000", "أقل من 1,000 ريال"], ["1k_5k", "SAR 1,000–5,000", "1,000–5,000 ريال"],
    ["5k_25k", "SAR 5,000–25,000", "5,000–25,000 ريال"], ["25k_100k", "SAR 25,000–100,000", "25,000–100,000 ريال"],
    ["gt100k", "More than SAR 100,000", "أكثر من 100,000 ريال"],
  ] },
  { id: "current_method", en: "How do you usually protect yourself today?", ar: "كيف تحمي نفسك عادةً اليوم؟", options: [
    ["trust", "I rely on trust or reviews", "أعتمد على الثقة أو التقييمات"],
    ["half_advance", "Part up front, the rest on delivery", "جزء مقدماً والباقي عند التسليم"],
    ["cash_on_delivery", "Cash or payment on delivery", "الدفع عند الاستلام"],
    ["bank", "Bank guarantee or letter of credit", "ضمان بنكي أو اعتماد مستندي"],
    ["contract", "A written contract only", "عقد مكتوب فقط"],
    ["nothing", "Nothing in particular", "لا شيء محدد"],
  ] },
  { id: "would_use", en: "Would you use a service where the payment stays with a licensed payment provider and is paid out only after delivery is confirmed?", ar: "هل تستخدم خدمة يبقى فيها المبلغ لدى مزوّد دفع مرخّص ولا يُحوَّل إلا بعد تأكيد التسليم؟", options: [
    ["yes", "Yes", "نعم"], ["maybe", "Maybe, depends on the fee", "ربما، حسب الرسوم"], ["no", "No", "لا"],
  ] },
  { id: "fee_ok", en: "What fee would be fair for that protection, as a share of the deal?", ar: "كم رسوماً تراها مناسبة لهذه الحماية، كنسبة من قيمة الصفقة؟", options: [
    ["lt1", "Under 1%", "أقل من 1%"], ["1_2", "1%–2%", "1%–2%"], ["2_3", "2%–3%", "2%–3%"], ["gt3", "More than 3%", "أكثر من 3%"], ["none", "I would not pay a fee", "لن أدفع رسوماً"],
  ] },
  { id: "heard_of", en: "Have you used any of these? (choose all that apply)", ar: "هل استخدمت أياً مما يلي؟ (اختر كل ما ينطبق)", multi: true, options: [
    ["waffy", "Waffy", "وفّي"], ["other_escrow", "Another escrow service", "خدمة ضمان دفع أخرى"],
    ["marketplace", "A marketplace that holds payment (e.g. an online store app)", "منصة بيع تحتفظ بالمبلغ (مثل تطبيق متجر)"],
    ["lc", "A bank letter of credit", "اعتماد مستندي من بنك"], ["none", "None", "لا شيء"],
  ] },
] as const;

const keys = (id: SurveyField) => SURVEY_QUESTIONS.find((q) => q.id === id)!.options.map((o) => o[0]) as [string, ...string[]];
const one = (id: SurveyField) => z.enum(keys(id));
const many = (id: SurveyField) => z.array(z.enum(keys(id))).min(1).max(10).transform((a) => Array.from(new Set(a)));

export const surveySchema = z.object({
  lang: z.enum(["ar", "en"]),
  respondent: one("respondent"),
  country: one("country"),
  unknown_party: one("unknown_party"),
  problems: many("problems"),
  deal_size: one("deal_size"),
  current_method: one("current_method"),
  would_use: one("would_use"),
  fee_ok: one("fee_ok"),
  heard_of: many("heard_of"),
  comment: z.string().trim().max(1000).default(""),
  pilot_email: z.string().trim().email().max(200).or(z.literal("")).default(""),
  source: z.string().trim().max(40).regex(/^[a-z0-9_-]*$/i).default("link"),
  website: z.string().max(0).default(""), // honeypot: must stay empty
});
export type SurveyInput = z.input<typeof surveySchema>;

/** Counts per option for every question. Multi-choice questions count each selected option. */
export function tallySurvey(rows: Record<string, unknown>[]) {
  return SURVEY_QUESTIONS.map((q) => {
    const counts = Object.fromEntries(q.options.map((o) => [o[0], 0])) as Record<string, number>;
    for (const r of rows) {
      const v = r[q.id];
      for (const k of Array.isArray(v) ? v : [v]) if (typeof k === "string" && k in counts) counts[k] = (counts[k] ?? 0) + 1;
    }
    return { id: q.id, en: q.en, ar: q.ar, multi: !!q.multi, options: q.options.map(([k, en, ar]) => ({ key: k, en, ar, count: counts[k] ?? 0 })) };
  });
}
