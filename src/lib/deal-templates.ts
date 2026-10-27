/**
 * Ready-made starting points for the new-deal form (founder, 27 Oct). A template only pre-fills the form;
 * everything stays editable, and the other party still reviews and accepts the terms.
 */
import { minorUnitsFor } from "@/lib/money";
import type { DealType } from "@/lib/milestones";

type T = readonly [en: string, ar: string];
export type DealTemplate = {
  id: string;
  type: DealType;
  role: "buyer" | "seller";
  label: T;
  hint: T;
  title: T;
  description: T;
  acceptance: T;
  refund: T;
  inspectionDays: number;
  shipping: boolean;
  revisions?: number;
  retentionPercent?: number;
  defectsLiabilityDays?: number;
  milestones?: { title: T; pct: number; kind: "advance" | "work"; evidence: T }[];
};

export const DEAL_TEMPLATES: readonly DealTemplate[] = [
  {
    id: "used_device", type: "goods", role: "buyer",
    label: ["Used phone or device", "جوال أو جهاز مستعمل"], hint: ["Buying from someone you met online", "شراء من شخص تعرّفت عليه أونلاين"],
    title: ["Used phone", "جوال مستعمل"],
    description: ["Model, storage, colour, condition and what is in the box.", "الطراز، السعة، اللون، الحالة، وما يشمله الصندوق."],
    acceptance: ["Works as described, not locked to any account, battery health as stated.", "يعمل كما في الوصف، غير مقفل على أي حساب، وصحة البطارية كما ذُكرت."],
    refund: ["Full refund if it differs from the description or is locked.", "استرداد كامل إذا اختلف عن الوصف أو كان مقفلاً."],
    inspectionDays: 3, shipping: true,
  },
  {
    id: "supplier_order", type: "goods", role: "buyer",
    label: ["Order from a supplier", "طلب توريد من مورّد"], hint: ["Goods for your shop or business", "بضاعة لمتجرك أو منشأتك"],
    title: ["Supply order", "طلب توريد بضاعة"],
    description: ["Items, quantities and specifications as in the quotation.", "الأصناف والكميات والمواصفات كما في عرض السعر."],
    acceptance: ["Quantities and specifications match the quotation and purchase order.", "الكميات والمواصفات مطابقة لعرض السعر وأمر الشراء."],
    refund: ["Missing or defective items are refunded pro rata.", "النقص أو العيوب تُسترد بنسبتها من المبلغ."],
    inspectionDays: 5, shipping: true,
  },
  {
    id: "logo_design", type: "freelance", role: "buyer",
    label: ["Logo or brand design", "تصميم شعار أو هوية"], hint: ["Digital files with revisions", "ملفات رقمية مع تعديلات"],
    title: ["Logo and brand identity", "تصميم شعار وهوية بصرية"],
    description: ["Logo in several formats, colours and fonts guide.", "الشعار بعدة صيغ، ودليل الألوان والخطوط."],
    acceptance: ["Source files (AI/SVG) and PNG delivered; up to 2 revisions included.", "تسليم ملفات المصدر (AI/SVG) وPNG، مع تعديلين كحد أقصى."],
    refund: ["Refund if no first draft is delivered by the due date.", "استرداد إذا لم تُسلَّم المسودة الأولى في الموعد."],
    inspectionDays: 3, shipping: false, revisions: 2,
  },
  {
    id: "website", type: "freelance", role: "buyer",
    label: ["Website or online store", "موقع أو متجر إلكتروني"], hint: ["Paid in stages", "يُدفع على مراحل"],
    title: ["Website development", "تطوير موقع إلكتروني"],
    description: ["Pages, features and the hosting or store platform.", "الصفحات والمزايا ومنصة الاستضافة أو المتجر."],
    acceptance: ["Site live on the agreed domain, features working as listed.", "الموقع يعمل على النطاق المتفق عليه، والمزايا تعمل كما ذُكرت."],
    refund: ["Unfinished stages are refunded.", "تُسترد المراحل غير المنجزة."],
    inspectionDays: 5, shipping: false, revisions: 2,
    milestones: [
      { title: ["Design approved", "اعتماد التصميم"], pct: 30, kind: "work", evidence: ["Design files or link", "ملفات أو رابط التصميم"] },
      { title: ["Site built", "تنفيذ الموقع"], pct: 50, kind: "work", evidence: ["Staging link", "رابط نسخة التجربة"] },
      { title: ["Launch", "الإطلاق"], pct: 20, kind: "work", evidence: ["Live link", "الرابط النهائي"] },
    ],
  },
  {
    id: "apartment_fitout", type: "contracting", role: "buyer",
    label: ["Apartment fit-out in stages", "تشطيب شقة على مراحل"], hint: ["Advance, stages and retention", "دفعة مقدمة ومراحل ومبلغ ضمان"],
    title: ["Apartment fit-out", "تشطيب شقة"],
    description: ["Scope of work, materials and the agreed drawings.", "نطاق العمل والمواد والمخططات المتفق عليها."],
    acceptance: ["Each stage is accepted after an on-site check.", "تُقبل كل مرحلة بعد المعاينة في الموقع."],
    refund: ["Advance refunded if work does not start within 14 days.", "تُسترد الدفعة المقدمة إذا لم يبدأ العمل خلال 14 يوماً."],
    inspectionDays: 5, shipping: false, retentionPercent: 5, defectsLiabilityDays: 90,
    milestones: [
      { title: ["Advance (materials)", "دفعة مقدمة (المواد)"], pct: 20, kind: "advance", evidence: ["Material invoices", "فواتير المواد"] },
      { title: ["Main works", "الأعمال الأساسية"], pct: 40, kind: "work", evidence: ["Photos of completed works", "صور الأعمال المنجزة"] },
      { title: ["Finishing and handover", "التشطيب والتسليم"], pct: 40, kind: "work", evidence: ["Handover report", "محضر التسليم"] },
    ],
  },
];

/** Milestone amounts from percentages; the last one takes the rounding difference so the plan always sums to the total. */
export function templateMilestoneAmounts(total: number, pcts: number[], currency: string): string[] {
  if (!(total > 0) || pcts.length === 0) return pcts.map(() => "");
  const d = minorUnitsFor(currency);
  const f = 10 ** d;
  const minorTotal = Math.round(total * f);
  const parts = pcts.map((p) => Math.floor((minorTotal * p) / 100));
  parts[parts.length - 1] = minorTotal - parts.slice(0, -1).reduce((a, b) => a + b, 0);
  return parts.map((m) => (m / f).toFixed(d));
}
