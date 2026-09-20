export type DealStatus =
  | "pending_funding"
  | "held"
  | "delivered"
  | "under_review"
  | "released"
  | "refunded"
  | "disputed";

export const statusLabels: Record<DealStatus, string> = {
  pending_funding: "Pending funding",
  held: "Funds held",
  delivered: "Delivered",
  under_review: "Under review",
  released: "Released",
  refunded: "Refunded",
  disputed: "Disputed",
};

export const statusTone: Record<DealStatus, "muted" | "primary" | "warning" | "destructive"> = {
  pending_funding: "muted",
  held: "primary",
  delivered: "primary",
  under_review: "warning",
  released: "primary",
  refunded: "warning",
  disputed: "destructive",
};

export type Stage = {
  name: string;
  amount: number;
  status: DealStatus;
};

export type TimelineEvent = {
  title: string;
  at: string;
  note?: string;
};

export type Deal = {
  id: string;
  title: string;
  description: string;
  amount: number;
  buyer: string;
  seller: string;
  role: "buyer" | "seller";
  status: DealStatus;
  createdAt: string;
  dueAt: string;
  stages: Stage[];
  timeline: TimelineEvent[];
  attachments: { name: string; size: string }[];
  messages: { from: string; at: string; body: string }[];
  actionRequired?: string;
};

/** نموذج العمولات وفق مستند التصميم (بيانات تجريبية) */
export const feeTiers = [
  { from: 0, to: 5000, rate: 0.03, min: 15, label: "Up to SAR 5,000" },
  { from: 5001, to: 50000, rate: 0.025, min: 0, label: "SAR 5,001 to 50,000" },
  { from: 50001, to: Infinity, rate: 0.018, min: 0, label: "Above SAR 50,000" },
];

export function calcFee(amount: number) {
  const tier = feeTiers.find((t) => amount >= t.from && amount <= t.to) ?? feeTiers[0];
  if (!tier) return { fee: 0, rate: 0, tier: { from: 0, to: 0, rate: 0, min: 0, label: "Unavailable" } };
  const fee = Math.max(amount * tier.rate, tier.min);
  return { fee: Math.round(fee * 100) / 100, rate: tier.rate, tier };
}

export function formatSAR(amount: number) {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
}

export const deals: Deal[] = [
  {
    id: "DL-10428",
    title: "تصميم هوية بصرية لمتجر إلكتروني",
    description:
      "تصميم شعار، دليل هوية، وقوالب سوشيال ميديا. التسليم على ثلاث مراحل مع مراجعتين لكل مرحلة.",
    amount: 18000,
    buyer: "متجر رَفَّة",
    seller: "استوديو نُون",
    role: "buyer",
    status: "under_review",
    createdAt: "2026-08-28",
    dueAt: "2026-09-25",
    stages: [
      { name: "المرحلة 1 — الشعار", amount: 6000, status: "released" },
      { name: "المرحلة 2 — دليل الهوية", amount: 7000, status: "under_review" },
      { name: "المرحلة 3 — القوالب", amount: 5000, status: "pending_funding" },
    ],
    timeline: [
      { title: "إنشاء الصفقة", at: "2026-08-28 10:12" },
      { title: "قبول الطرف الآخر للدعوة", at: "2026-08-28 13:40" },
      { title: "تمويل المرحلتين الأولى والثانية", at: "2026-08-29 09:05", note: "بيانات تجريبية" },
      { title: "الإفراج عن المرحلة الأولى", at: "2026-09-06 16:22" },
      { title: "تأكيد تسليم المرحلة الثانية", at: "2026-09-17 11:48", note: "مرفق 4 ملفات" },
    ],
    attachments: [
      { name: "brand-guide-v2.pdf", size: "4.2 MB" },
      { name: "logo-final.svg", size: "312 KB" },
    ],
    messages: [
      { from: "استوديو نُون", at: "2026-09-17 11:50", body: "تم رفع دليل الهوية، في انتظار ملاحظاتك." },
      { from: "متجر رَفَّة", at: "2026-09-18 08:30", body: "سأراجع اليوم وأؤكد الاستلام." },
    ],
    actionRequired: "تأكيد استلام المرحلة الثانية أو طلب تعديل",
  },
  {
    id: "DL-10391",
    title: "تطوير تطبيق حجز مواعيد",
    description: "تسليم نسخة أولى قابلة للتشغيل مع لوحة إدارة وربط بوابة دفع.",
    amount: 62000,
    buyer: "عيادة صفا",
    seller: "شركة بِنية التقنية",
    role: "seller",
    status: "held",
    createdAt: "2026-08-10",
    dueAt: "2026-10-01",
    stages: [{ name: "دفعة كاملة", amount: 62000, status: "held" }],
    timeline: [
      { title: "إنشاء الصفقة", at: "2026-08-10 09:00" },
      { title: "توثيق الهوية للطرفين", at: "2026-08-11 12:10" },
      { title: "تمويل الصفقة", at: "2026-08-12 15:31", note: "بيانات تجريبية" },
    ],
    attachments: [{ name: "scope-of-work.pdf", size: "1.1 MB" }],
    messages: [
      { from: "عيادة صفا", at: "2026-09-12 14:00", body: "هل نستطيع إضافة تقارير أسبوعية؟" },
    ],
    actionRequired: "تأكيد التسليم قبل 1 أكتوبر",
  },
  {
    id: "DL-10355",
    title: "شراء معدات تصوير مستعملة",
    description: "كاميرا وعدستان مع فحص فني عند الاستلام.",
    amount: 4200,
    buyer: "فيصل الحربي",
    seller: "معرض الضوء",
    role: "buyer",
    status: "disputed",
    createdAt: "2026-07-30",
    dueAt: "2026-09-10",
    stages: [{ name: "دفعة كاملة", amount: 4200, status: "disputed" }],
    timeline: [
      { title: "تمويل الصفقة", at: "2026-08-01 10:20", note: "بيانات تجريبية" },
      { title: "تأكيد التسليم من البائع", at: "2026-09-05 17:02" },
      { title: "فتح نزاع", at: "2026-09-08 09:14", note: "سبب: المنتج غير مطابق للوصف" },
    ],
    attachments: [
      { name: "damage-photo-1.jpg", size: "2.4 MB" },
      { name: "shipping-receipt.pdf", size: "220 KB" },
    ],
    messages: [
      { from: "فيصل الحربي", at: "2026-09-08 09:20", body: "العدسة بها خدوش لم تُذكر في الوصف." },
      { from: "معرض الضوء", at: "2026-09-08 12:05", body: "الخدوش سطحية وموضحة في الصور." },
    ],
    actionRequired: "رفع مستندات النزاع للوسيط",
  },
  {
    id: "DL-10302",
    title: "كتابة محتوى تسويقي — 20 مقالة",
    description: "محتوى عربي محسّن لمحركات البحث مع مراجعة لغوية.",
    amount: 9600,
    buyer: "منصة تَجْر",
    seller: "دانة العتيبي",
    role: "buyer",
    status: "released",
    createdAt: "2026-06-18",
    dueAt: "2026-07-20",
    stages: [{ name: "دفعة كاملة", amount: 9600, status: "released" }],
    timeline: [
      { title: "تمويل الصفقة", at: "2026-06-19 11:00", note: "بيانات تجريبية" },
      { title: "تأكيد الاستلام", at: "2026-07-18 19:40" },
      { title: "الإفراج عن المبلغ", at: "2026-07-18 19:41" },
    ],
    attachments: [{ name: "articles-final.zip", size: "8.7 MB" }],
    messages: [],
  },
  {
    id: "DL-10465",
    title: "تأثيث مكتب — دفعتان",
    description: "توريد وتركيب أثاث مكتبي مع ضمان سنة.",
    amount: 27500,
    buyer: "مكتب أفق للاستشارات",
    seller: "مؤسسة ركن الأثاث",
    role: "buyer",
    status: "pending_funding",
    createdAt: "2026-09-16",
    dueAt: "2026-10-12",
    stages: [
      { name: "الدفعة الأولى", amount: 15000, status: "pending_funding" },
      { name: "الدفعة الثانية عند التركيب", amount: 12500, status: "pending_funding" },
    ],
    timeline: [{ title: "إنشاء الصفقة وإرسال الدعوة", at: "2026-09-16 08:45" }],
    attachments: [],
    messages: [],
    actionRequired: "تمويل الدفعة الأولى لبدء التنفيذ",
  },
];

export function getDeal(id: string) {
  return deals.find((d) => d.id === id);
}

export const dashboardStats = {
  available: 14250,
  held: deals
    .filter((d) => ["held", "delivered", "under_review", "disputed"].includes(d.status))
    .reduce((s, d) => s + d.amount, 0),
  activeDeals: deals.filter((d) => !["released", "refunded"].includes(d.status)).length,
  openDisputes: deals.filter((d) => d.status === "disputed").length,
};

export const activity = [
  { at: "2026-09-18 08:30", text: "رسالة جديدة في الصفقة DL-10428", tone: "primary" as const },
  { at: "2026-09-17 11:48", text: "تأكيد تسليم المرحلة الثانية — DL-10428", tone: "primary" as const },
  { at: "2026-09-16 08:45", text: "تم إنشاء الصفقة DL-10465 وإرسال الدعوة", tone: "muted" as const },
  { at: "2026-09-08 09:14", text: "فتح نزاع على الصفقة DL-10355", tone: "destructive" as const },
  { at: "2026-09-06 16:22", text: "إفراج عن 6,000 ر.س للبائع — DL-10428", tone: "primary" as const },
];

export const monthlyVolume = [
  { month: "أبريل", value: 38000, fees: 950 },
  { month: "مايو", value: 52000, fees: 1300 },
  { month: "يونيو", value: 46500, fees: 1160 },
  { month: "يوليو", value: 71000, fees: 1600 },
  { month: "أغسطس", value: 88000, fees: 1980 },
  { month: "سبتمبر", value: 61500, fees: 1420 },
];
