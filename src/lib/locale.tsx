import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "ar";

const STORAGE_KEY = "insight.locale";
const originalText = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

const translations: Record<string, string> = {
  Home: "الرئيسية",
  "How it works": "كيف تعمل المنصة",
  Services: "الخدمات",
  Pricing: "الرسوم",
  Help: "المساعدة",
  "Sign in": "تسجيل الدخول",
  "Sign out": "تسجيل الخروج",
  "Create account": "إنشاء حساب",
  "My dashboard": "لوحة تحكمي",
  "Staff console": "لوحة الإدارة",
  "Customer view": "واجهة العميل",
  "Open navigation": "فتح القائمة",
  Platform: "المنصة",
  Legal: "قانوني",
  "Fee calculator": "حاسبة الرسوم",
  "Roles & access": "الأدوار والصلاحيات",
  "Help centre": "مركز المساعدة",
  "Terms of service": "شروط الخدمة",
  "Privacy policy": "سياسة الخصوصية",
  "Disputes & refunds": "النزاعات والاسترداد",
  "Secure escrow that protects every payment until delivery is confirmed.":
    "ضمان آمن يحمي كل دفعة حتى تأكيد الاستلام.",
  "Demo experience — all balances and payment details are sample data. No real funds are moved.":
    "نسخة تجريبية — جميع الأرصدة وتفاصيل الدفع بيانات نموذجية، ولا تُنقل أموال حقيقية.",
  "Secure escrow · Demo environment": "ضمان آمن · بيئة تجريبية",
  "The safer way to close every deal": "الطريقة الأكثر أمانًا لإتمام كل صفقة",
  "Insight holds funds until the buyer confirms delivery. Every milestone, message, and decision stays documented from agreement to settlement.":
    "تحتفظ إنسايت بالأموال حتى يؤكد المشتري الاستلام، وتوثّق كل مرحلة ورسالة وقرار من الاتفاق حتى التسوية.",
  "Get started now": "ابدأ الآن",
  "See how it works": "شاهد كيف تعمل",
  "Protected volume": "حجم الأموال المحمية",
  "Completion rate": "نسبة الإتمام",
  "Average resolution": "متوسط الحل",
  "3 days": "3 أيام",
  "Brand identity project": "مشروع هوية تجارية",
  Value: "القيمة",
  "Buyer identity": "هوية المشتري",
  Verified: "موثّق",
  "Funds in escrow": "الأموال في الضمان",
  Secured: "مؤمّنة",
  "Delivery & release": "التسليم والإفراج",
  Pending: "قيد الانتظار",
  "New update": "تحديث جديد",
  "Funds verified and locked": "تم التحقق من الأموال وحجزها",
  "Four steps between agreement and settlement": "أربع خطوات من الاتفاق إلى التسوية",
  "Create the agreement": "أنشئ الاتفاق",
  "Define the scope, amount, milestones, and delivery terms in minutes.":
    "حدّد النطاق والمبلغ والمراحل وشروط التسليم خلال دقائق.",
  "Invite the other party": "ادعُ الطرف الآخر",
  "Share a secure link. Both sides verify their identity before money moves.":
    "شارك رابطًا آمنًا، ويتحقق الطرفان من هويتهما قبل انتقال الأموال.",
  "Fund the escrow": "موّل الضمان",
  "The buyer deposits the amount. Insight holds it safely and neutrally.":
    "يودع المشتري المبلغ وتحتفظ به إنسايت بأمان وحياد.",
  "Confirm and release": "أكّد وأفرج عن المبلغ",
  "Once delivery is confirmed, funds are released to the seller — fully documented.":
    "بعد تأكيد التسليم يُفرج عن الأموال للبائع مع توثيق كامل.",
  "Built for trust": "مصممة للثقة",
  "Everything both parties need to move with confidence": "كل ما يحتاجه الطرفان لإتمام الصفقة بثقة",
  "Protected funds": "أموال محمية",
  "Funds remain in neutral escrow until the agreed release conditions are met.":
    "تبقى الأموال في ضمان محايد حتى استيفاء شروط الإفراج المتفق عليها.",
  "Milestone payments": "دفعات المراحل",
  "Split complex work into defined stages and release each payment independently.":
    "قسّم العمل إلى مراحل واضحة وأفرج عن كل دفعة بشكل مستقل.",
  "Documented communication": "محادثات موثقة",
  "Keep messages and validated attachments within the deal record.":
    "احتفظ بالرسائل والمرفقات المعتمدة ضمن سجل الصفقة.",
  "AI-assisted disputes": "نزاعات بمساعدة الذكاء الاصطناعي",
  "Organize facts, identify evidence gaps, and get a neutral mediation plan fast.":
    "نظّم الوقائع وحدد نقص الأدلة واحصل سريعًا على خطة وساطة محايدة.",
  "Receipts and reports": "إيصالات وتقارير",
  "Download records for funding, releases, refunds, and account activity.":
    "نزّل سجلات التمويل والإفراج والاسترداد ونشاط الحساب.",
  "Account safeguards": "حماية الحساب",
  "Identity verification, two-step sign-in, and session controls on every account.":
    "توثيق الهوية والتحقق بخطوتين والتحكم في الجلسات لكل حساب.",
  "Full visibility": "وضوح كامل",
  "One clear status at every step": "حالة واضحة في كل خطوة",
  "Both parties always see the same state of the deal — no guessing, no chasing.":
    "يرى الطرفان دائمًا الحالة نفسها للصفقة دون تخمين أو متابعة متكررة.",
  "Security & compliance": "الأمان والامتثال",
  "Protection built into every layer": "حماية مدمجة في كل طبقة",
  "Identity checks, encrypted documents, and a full audit trail — designed for high-value transactions.":
    "تحقق من الهوية ومستندات مشفرة وسجل تدقيق كامل للصفقات عالية القيمة.",
  "KYC identity verification": "التحقق من الهوية",
  "Every account verified before funds move.": "يتم توثيق كل حساب قبل انتقال الأموال.",
  "Two-step sign-in": "تسجيل دخول بخطوتين",
  "2FA on every account, enforced for payouts.": "تحقق ثنائي لكل حساب وإلزامي عند السحب.",
  "Encrypted documents": "مستندات مشفرة",
  "Contracts and evidence stored securely per deal.": "تُحفظ العقود والأدلة بأمان لكل صفقة.",
  "Full audit log": "سجل تدقيق كامل",
  "Every action timestamped and downloadable.": "كل إجراء مؤرخ وقابل للتنزيل.",
  "Who it's for": "لمن صُممت",
  "Made for deals that matter": "للصفقات التي تهمك",
  "Freelancers & agencies": "المستقلون والوكالات",
  "Get paid on delivery without chasing invoices or risking non-payment.":
    "استلم مستحقاتك عند التسليم دون ملاحقة الفواتير أو مخاطر عدم الدفع.",
  "E-commerce & marketplaces": "التجارة الإلكترونية والأسواق",
  "Protect buyers on high-value orders and custom-made goods.":
    "احمِ المشترين في الطلبات عالية القيمة والمنتجات المصنوعة حسب الطلب.",
  "Business services": "خدمات الأعمال",
  "Close B2B contracts with staged payments and a documented trail.":
    "أتمم عقود الشركات بدفعات مرحلية وسجل موثق.",
  "Transparent fees, no surprises": "رسوم شفافة بلا مفاجآت",
  "One clear fee per deal — you see the exact amount before funding.":
    "رسم واضح لكل صفقة، وتعرف المبلغ الدقيق قبل التمويل.",
  "View fees": "عرض الرسوم",
  "Ready to secure your next deal?": "هل أنت جاهز لتأمين صفقتك القادمة؟",
  "Create your account, set up the agreement, invite the other party, and let Insight protect the payment.":
    "أنشئ حسابك وحدد الاتفاق وادعُ الطرف الآخر ودع إنسايت تحمي الدفعة.",
  "Sign up now": "سجّل الآن",
  "Welcome back": "مرحبًا بعودتك",
  "Create your account": "أنشئ حسابك",
  "Sign in to reach your dashboard, deals, and documents.":
    "سجّل الدخول للوصول إلى لوحة التحكم والصفقات والمستندات.",
  "One account for creating deals, receiving deals, and tracking delivery.":
    "حساب واحد لإنشاء الصفقات واستلامها ومتابعة التسليم.",
  "Continue with Google": "المتابعة باستخدام Google",
  "or use your email": "أو استخدم بريدك الإلكتروني",
  "Full name": "الاسم الكامل",
  "Mobile number": "رقم الجوال",
  Email: "البريد الإلكتروني",
  Password: "كلمة المرور",
  "Please wait…": "يرجى الانتظار…",
  "New to Insight?": "جديد في إنسايت؟",
  "Already have an account?": "لديك حساب بالفعل؟",
  "Create an account": "إنشاء حساب",
  "Check your inbox and confirm your email address to activate the account.":
    "تحقق من بريدك الإلكتروني وأكّد عنوانك لتفعيل الحساب.",
  "Something went wrong. Please try again.": "حدث خطأ. يرجى المحاولة مرة أخرى.",
  "Google sign-in did not complete. Please try again.":
    "لم يكتمل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.",
  "WORKSPACE OVERVIEW": "نظرة عامة على مساحة العمل",
  "Here is what needs your attention today.": "إليك ما يحتاج إلى اهتمامك اليوم.",
  "New deal": "صفقة جديدة",
  "You are signed in as Insight staff": "أنت مسجل الدخول ضمن فريق إنسايت",
  "This page is the customer view. Platform-wide members, deals, revenue, rates, fees, and disputes live in the internal console.":
    "هذه واجهة العميل. الأعضاء والصفقات والإيرادات والأسعار والرسوم والنزاعات موجودة في لوحة الإدارة.",
  "Open staff console": "فتح لوحة الإدارة",
  "Your saved deals": "صفقاتك المحفوظة",
  "You have no deals yet. Create one and send the invitation link to the other party — or open an invitation link you received.":
    "ليس لديك صفقات بعد. أنشئ صفقة وأرسل رابط الدعوة للطرف الآخر، أو افتح رابط دعوة استلمته.",
  "Both parties joined": "انضم الطرفان",
  "Waiting for the other party": "بانتظار الطرف الآخر",
  "Available balance": "الرصيد المتاح",
  "Funds held": "الأموال المحجوزة",
  "Active deals": "الصفقات النشطة",
  "Open disputes": "النزاعات المفتوحة",
  "Sample data": "بيانات نموذجية",
  "Recent activity": "النشاط الأخير",
  "Paying in another currency?": "تدفع بعملة أخرى؟",
  "Your riyal total is fixed at the rate shown when you fund the deal — no surprises later.":
    "يثبت إجمالي الريال بالسعر المعروض عند تمويل الصفقة دون مفاجآت لاحقًا.",
  "Verify your identity": "وثّق هويتك",
  "Your last submission was not accepted. Upload a clearer document to continue.":
    "لم يُقبل طلبك السابق. ارفع مستندًا أوضح للمتابعة.",
  "Upload an ID or commercial register so you can fund and receive payouts without delays.":
    "ارفع الهوية أو السجل التجاري لتتمكن من التمويل واستلام الدفعات دون تأخير.",
  "Upload documents": "رفع المستندات",
  "Insight Operations": "عمليات إنسايت",
  "Internal staff console": "لوحة فريق داخلية",
  Overview: "نظرة عامة",
  "All deals": "جميع الصفقات",
  Members: "الأعضاء",
  "Identity documents": "مستندات الهوية",
  "Risk review": "مراجعة المخاطر",
  "Currency rates": "أسعار العملات",
  "Fee rules": "قواعد الرسوم",
  Disputes: "النزاعات",
  "Platform console": "لوحة المنصة",
  "Operations, revenue and controls": "العمليات والإيرادات والتحكم",
  "Staff view of every member, deal, fee, currency rate, and dispute.":
    "عرض إداري شامل لكل عضو وصفقة ورسم وسعر عملة ونزاع.",
  "Checking your access…": "جارٍ التحقق من صلاحيتك…",
  "Restricted area": "منطقة مقيّدة",
  "Insight staff only": "لفريق إنسايت فقط",
  "This console is reserved for the Insight operations team. Your account does not have staff access.":
    "هذه اللوحة مخصصة لفريق عمليات إنسايت، وحسابك لا يملك صلاحية الوصول.",
  "Go to my dashboard": "الذهاب إلى لوحة تحكمي",
  Notifications: "الإشعارات",
  "Mark all read": "تحديد الكل كمقروء",
  "You have no notifications yet.": "ليس لديك إشعارات بعد.",
  "Page not found": "الصفحة غير موجودة",
  "The page you're looking for doesn't exist or has been moved.":
    "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
  "Go home": "العودة للرئيسية",
  "This page didn't load": "تعذر تحميل الصفحة",
  "Something went wrong on our end. You can try refreshing or head back home.":
    "حدث خطأ لدينا. يمكنك إعادة المحاولة أو العودة للرئيسية.",
  "Try again": "إعادة المحاولة",
  "Create a deal": "إنشاء صفقة",
  "Create your first deal": "أنشئ صفقتك الأولى",
  "Deal title": "عنوان الصفقة",
  Description: "الوصف",
  Amount: "المبلغ",
  Currency: "العملة",
  "Delivery date": "تاريخ التسليم",
  "Buyer pays": "يدفع المشتري",
  "Seller pays": "يدفع البائع",
  "Split equally": "مقسمة بالتساوي",
  "I am paying (buyer)": "أنا المشتري",
  "I am delivering (seller)": "أنا البائع",
  "Counterparty email": "بريد الطرف الآخر",
  "Buyer inspection period (days)": "مدة فحص المشتري (بالأيام)",
  "Create deal": "إنشاء الصفقة",
  "Deal terms need agreement": "شروط الصفقة تحتاج إلى موافقة",
  "Accept the terms": "قبول الشروط",
  "Request changes": "طلب تعديلات",
  "Reject terms": "رفض الشروط",
  "What you can do now": "ما يمكنك فعله الآن",
  "Fund deal": "تمويل الصفقة",
  "Confirm delivery": "تأكيد التسليم",
  "Release funds": "الإفراج عن الأموال",
  "Request arbitration": "طلب التحكيم",
  "Shipping and tracking": "الشحن والتتبع",
  Carrier: "شركة الشحن",
  "Tracking number": "رقم التتبع",
  "Save shipping update": "حفظ تحديث الشحن",
  "Rate the other party": "قيّم الطرف الآخر",
  "Submit rating": "إرسال التقييم",
  "Platform fee": "رسوم المنصة",
  "Standard fee": "الرسوم القياسية",
  "Fee paid by": "دافع الرسوم",
  "Seller receives": "يستلم البائع",
  "Inspection period": "مدة الفحص",
  Created: "تاريخ الإنشاء",
  Due: "تاريخ الاستحقاق",
  Conversation: "المحادثة",
  "Send message": "إرسال الرسالة",
  "Add a note about this deal for the Insight team to review.":
    "أضف ملاحظة حول هذه الصفقة ليراجعها فريق إنسايت.",
  "Payment records": "سجلات الدفع",
  "Activity log": "سجل النشاط",
  "Identity verification": "توثيق الهوية",
  "Document type": "نوع المستند",
  "Choose documents or images": "اختر مستندات أو صورًا",
  Upload: "رفع",
  Delete: "حذف",
  Approved: "مقبول",
  Rejected: "مرفوض",
  "Under review": "قيد المراجعة",
  Save: "حفظ",
  Cancel: "إلغاء",
  Approve: "موافقة",
  Reject: "رفض",
  Edit: "تعديل",
  Actions: "الإجراءات",
  Status: "الحالة",
  User: "المستخدم",
  Deal: "الصفقة",
  Fee: "الرسم",
  Revenue: "الإيراد",
  "No due date": "دون تاريخ استحقاق",
};

const dynamicTranslations: Array<[RegExp, (...matches: string[]) => string]> = [
  [/^Welcome back(?:, (.+))?$/, (name = "") => `مرحبًا بعودتك${name ? `، ${name}` : ""}`],
  [/^(\d+) day\(s\)$/, (days) => `${days} يوم`],
  [/^Deal (.+)$/, (ref) => `الصفقة ${ref}`],
  [/^Back to (.+)$/, (target) => `العودة إلى ${translations[target] ?? target}`],
];

function translateText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const exact = translations[normalized];
  if (exact) return value.replace(normalized, exact);
  for (const [pattern, render] of dynamicTranslations) {
    const match = normalized.match(pattern);
    if (match) return value.replace(normalized, render(...match.slice(1)));
  }
  return value;
}

type LocaleContextValue = {
  locale: Locale;
  direction: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  text: (english: string, arabic?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ar") setLocaleState("ar");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem(STORAGE_KEY, locale);
    let translating = false;
    const apply = () => {
      if (translating) return;
      translating = true;
      localizeDocument(locale);
      translating = false;
    };
    apply();
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      direction: locale === "ar" ? "rtl" : "ltr",
      setLocale: setLocaleState,
      toggleLocale: () => setLocaleState((current) => (current === "en" ? "ar" : "en")),
      text: (english, arabic) => (locale === "ar" ? (arabic ?? translations[english] ?? english) : english),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export function localizeDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = textNodes.nextNode();
  while (node) {
    if (node.parentElement && !["SCRIPT", "STYLE", "TEXTAREA"].includes(node.parentElement.tagName)) {
      const original = originalText.get(node) ?? node.textContent ?? "";
      if (!originalText.has(node) && original.trim()) originalText.set(node, original);
      const localized = locale === "ar" ? translateText(original) : original;
      if (node.textContent !== localized) node.textContent = localized;
    }
    node = textNodes.nextNode();
  }
  for (const element of document.body.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]")) {
    for (const attribute of ["placeholder", "aria-label", "title"] as const) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const stored = originalAttributes.get(element) ?? new Map<string, string>();
      const original = stored.get(attribute) ?? current;
      stored.set(attribute, original);
      originalAttributes.set(element, stored);
      element.setAttribute(attribute, locale === "ar" ? translateText(original) : original);
    }
  }
}