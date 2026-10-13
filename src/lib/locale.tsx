import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "ar";

const STORAGE_KEY = "insight.locale";
const originalText = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

const translations: Record<string, string> = {
  "Buyer fee share": "حصة المشتري من الرسوم",
  "Supplier fee share": "حصة المورد من الرسوم",
  "Supplier receives": "يستلم المورد",
  "You invited": "دعوتَ",
  "Other party (joined)": "الطرف الآخر (انضم)",
  "Buyer share + VAT": "حصة المشتري + ضريبة القيمة المضافة",
  "Supplier share + VAT": "حصة المورد + ضريبة القيمة المضافة",
  "Buyer funds": "يموّل المشتري",
  "Fee charged": "الرسوم المحتسبة",
  "Pricing (live preview)": "التسعير (معاينة مباشرة)",
  "Locked by funding quote": "مثبّت بعرض سعر التمويل",
  "Not funded yet": "لم تُموَّل بعد",
  "Payout currency": "عملة التحويل",
  "Provisional": "مؤقت",
  "Platform fee bands (USD)": "شرائح رسوم المنصة (دولار أمريكي)",
  "Save bands": "حفظ الشرائح",
  "Band label": "اسم الشريحة",
  "From (USD)": "من (دولار)",
  "To (USD)": "إلى (دولار)",
  "Percent %": "النسبة %",
  "Minimum fee (USD)": "الحد الأدنى للرسوم (دولار)",
  "Fee cap (USD)": "الحد الأقصى للرسوم (دولار)",
  "Try a deal value": "جرّب قيمة صفقة",
  "Deal value (USD)": "قيمة الصفقة (دولار)",
  "No USD fee bands yet.": "لا توجد شرائح رسوم بالدولار بعد.",
  "Saved. New quotes use these bands.": "تم الحفظ. تستخدم عروض الأسعار الجديدة هذه الشرائح.",
  "Each band's percentage applies only to the part of the deal value inside that band, so the fee never falls as the value rises. The deal value is converted to USD at the quote's provider rate, and the fee is charged in the deal currency.":
    "تُطبَّق نسبة كل شريحة على الجزء من قيمة الصفقة الواقع داخلها فقط، فلا تنخفض الرسوم مع ارتفاع القيمة. تُحوَّل قيمة الصفقة إلى الدولار بسعر المزوّد في عرض السعر، وتُحتسب الرسوم بعملة الصفقة.",
  "Special fee offer": "عرض رسوم خاص",
  "Lock an exchange rate for 15 minutes before paying.": "ثبّت سعر الصرف لمدة 15 دقيقة قبل الدفع.",
  "Add a verified payout bank account in the deal currency (Profile → Settlement bank account) before accepting these terms.":
    "أضف حساباً بنكياً موثّقاً للتحويل بعملة الصفقة (الملف الشخصي ← حساب التسوية البنكي) قبل قبول هذه الشروط.",
  "The latest terms version must be accepted by both parties before funding.": "يجب أن يقبل الطرفان أحدث نسخة من الشروط قبل التمويل.",
  "The supplier needs a verified payout account in the deal currency before this deal can be funded.":
    "يحتاج المورد إلى حساب تحويل موثّق بعملة الصفقة قبل تمويل هذه الصفقة.",
  "The other party must accept the terms you proposed.": "يجب أن يقبل الطرف الآخر الشروط التي اقترحتها.",
  "This deal field can only be changed through an Insight deal action.": "لا يمكن تغيير هذا الحقل إلا من خلال إجراء صفقة في Insight.",
  "The inspection period must be between 1 and 30 days.": "يجب أن تكون مدة الفحص بين 1 و30 يوماً.",
  "In this demo the payment provider is simulated and no real money moves.": "في هذه النسخة التجريبية مزوّد الدفع محاكى ولا تُنقل أموال حقيقية.",
  "Confirmed by the payment provider (simulated)": "أكّده مزوّد الدفع (محاكاة)",
  "Payment confirmed by the payment provider (simulated). In this demo no real money moves.": "أكّد مزوّد الدفع الدفعة (محاكاة). في هذه النسخة التجريبية لا تُنقل أموال حقيقية.",
  "Payout confirmed by the payment provider (simulated). In this demo no real money moves.": "أكّد مزوّد الدفع التحويل للمورد (محاكاة). في هذه النسخة التجريبية لا تُنقل أموال حقيقية.",
  "Internal reconciliation note": "ملاحظة تسوية داخلية",
  "Add note": "إضافة ملاحظة",
  "Testing tool — simulated provider": "أداة اختبار — مزوّد محاكى",
  "Simulate provider decline": "محاكاة رفض مزوّد الدفع",
  "Waiting for the payment provider.": "بانتظار مزوّد الدفع.",
  "For buyers": "للمشترين",
  "For suppliers": "للموردين",
  Business: "الأعمال",
  Security: "الأمان",
  FAQ: "الأسئلة الشائعة",
  "Saudi riyal, UAE dirham, Bahraini dinar, Qatari riyal, Kuwaiti dinar and Omani rial, plus US dollar.":
    "الريال السعودي والدرهم الإماراتي والدينار البحريني والريال القطري والدينار الكويتي والريال العماني، بالإضافة إلى الدولار الأمريكي.",
  "Cancel this deal": "إلغاء الصفقة",
  "Deal files": "ملفات الصفقة",
  "Terms history": "سجل الشروط",
  "Tax invoice": "الفاتورة الضريبية",
  "Get exchange-rate quote": "احصل على عرض سعر الصرف",
  "Your exchange rate has expired. Please request a new quote.": "انتهت صلاحية سعر الصرف. يرجى طلب عرض جديد.",
  "Personal details": "البيانات الشخصية",
  "Settlement bank account": "الحساب البنكي للتسوية",
  "Two-step verification": "التحقق بخطوتين",
  "Staff actions": "إجراءات الفريق",
  "Live disputes": "النزاعات الحالية",
  Quantity: "الكمية",
  "Supplier country": "دولة المورد",
  "Delivery country": "دولة التسليم",
  "Shipping responsibility": "مسؤولية الشحن",
  "Acceptance criteria": "معايير القبول",
  "Refund conditions": "شروط الاسترداد",
  "Cancellation conditions": "شروط الإلغاء",
  Home: "الرئيسية",
  "How it works": "كيف تعمل المنصة",
  Services: "الخدمات",
  Pricing: "الرسوم",
  Help: "المساعدة",
  "Sign in": "تسجيل الدخول",
  "Your account was created": "تم إنشاء حسابك",
  "We sent a confirmation link to your email address. Open it and click the link to activate your account, then come back and sign in.":
    "أرسلنا رابط تأكيد إلى بريدك الإلكتروني. افتحه واضغط على الرابط لتفعيل حسابك، ثم عد وسجّل الدخول.",
  "Go to sign in": "الانتقال إلى تسجيل الدخول",
  "Didn't receive the email? Check your spam folder.":
    "لم يصلك البريد؟ تحقق من مجلد الرسائل غير المرغوب فيها.",
  "Your email is confirmed": "تم تأكيد بريدك الإلكتروني",
  "Your account is now active. Sign in to start creating and tracking your escrow deals.":
    "حسابك مفعّل الآن. سجّل الدخول لبدء إنشاء صفقات الضمان ومتابعتها.",
  "Please confirm your email address. Open the confirmation link we sent to your inbox to activate all account features.":
    "يرجى تأكيد بريدك الإلكتروني. افتح رابط التأكيد الذي أرسلناه إلى بريدك لتفعيل جميع ميزات الحساب.",
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
  "Funds are held by a licensed payment provider. Insight runs the deal rules and keeps the record.": "يحتفظ بالأموال مزوّد دفع مرخّص، وتدير Insight قواعد الصفقة وتحفظ سجلّها.",
  "Demo experience — all balances and payment details are sample data. No real funds are moved.":
    "نسخة تجريبية — جميع الأرصدة وتفاصيل الدفع بيانات نموذجية، ولا تُنقل أموال حقيقية.",
  "Secure escrow · Demo environment": "ضمان آمن · بيئة تجريبية",
  "The safer way to close every deal": "الطريقة الأكثر أمانًا لإتمام كل صفقة",
  "The safer way to": "الطريقة الأكثر أمانًا",
  "close every deal": "لإتمام كل صفقة",
  "Get started now": "ابدأ الآن",
  "See how it works": "شاهد كيف تعمل",
  "Brand identity project": "مشروع هوية تجارية",
  Value: "القيمة",
  "Buyer identity": "هوية المشتري",
  Verified: "موثّق",
  "Funds held by the payment provider": "الأموال لدى مزوّد الدفع",
  Secured: "مؤمّنة",
  "Delivery & release": "التسليم والإفراج",
  Pending: "قيد الانتظار",
  "New update": "تحديث جديد",
  "Provider confirmation (simulated)": "تأكيد مزوّد الدفع (محاكاة)",
  "Four steps between agreement and settlement": "أربع خطوات من الاتفاق إلى التسوية",
  "Create the agreement": "أنشئ الاتفاق",
  "Define the scope, amount, and delivery terms in minutes.": "حدّد النطاق والمبلغ وشروط التسليم خلال دقائق.",
  "Invite the other party": "ادعُ الطرف الآخر",
  "Share a secure link. Both sides verify their identity before money moves.":
    "شارك رابطًا آمنًا، ويتحقق الطرفان من هويتهما قبل انتقال الأموال.",
  "Fund the escrow": "موّل الضمان",
  "Confirm and release": "أكّد وأفرج عن المبلغ",
  "Once delivery is confirmed, the licensed payment provider releases funds to the seller — fully documented.": "بعد تأكيد التسليم، يُفرج مزوّد الدفع المرخّص عن الأموال للبائع مع توثيق كامل.",
  "Built for trust": "مصممة للثقة",
  "Everything both parties need to move with confidence": "كل ما يحتاجه الطرفان لإتمام الصفقة بثقة",
  "Protected funds": "أموال محمية",
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
  "Identity verification and session controls for every account.":
    "التحقق من الهوية وضوابط الجلسات لكل حساب.",
  "Full visibility": "وضوح كامل",
  "One clear status at every step": "حالة واضحة في كل خطوة",
  "Both parties always see the same state of the deal — no guessing, no chasing.":
    "يرى الطرفان دائمًا الحالة نفسها للصفقة دون تخمين أو متابعة متكررة.",
  "Security & compliance": "الأمان والامتثال",
  "Protection built into every layer": "حماية مدمجة في كل طبقة",
  "Identity checks, encrypted documents, and a full audit trail — designed for high-value transactions.":
    "تحقق من الهوية ومستندات مشفرة وسجل تدقيق كامل للصفقات عالية القيمة.",
  "KYC identity verification": "التحقق من الهوية",
  "Buyers and suppliers verify their identity in the app.":
    "يتحقق المشترون والموردون من هويتهم داخل التطبيق.",
  "Staff access controls": "ضوابط وصول الموظفين",
  "Staff console access is restricted to authorised roles.":
    "يقتصر الوصول إلى لوحة الموظفين على الأدوار المصرّح لها.",
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
  "Close B2B contracts with agreed delivery terms and a documented trail.": "أتمم عقود الشركات بشروط تسليم متفق عليها وسجل موثّق.",
  "Transparent fees, no surprises": "رسوم شفافة بلا مفاجآت",
  "One clear fee per deal — you see the exact amount before funding.":
    "رسم واضح لكل صفقة، وتعرف المبلغ الدقيق قبل التمويل.",
  "View fees": "عرض الرسوم",
  "Ready to secure your next deal?": "هل أنت جاهز لتأمين صفقتك القادمة؟",
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
  "Open a dispute": "فتح نزاع",
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
  "Insight | Secure Escrow": "إنسايت | ضمان آمن",
  "Secure escrow for buyers, sellers, freelancers, and growing teams.":
    "ضمان آمن للمشترين والبائعين والمستقلين والفرق المتنامية.",
  "Provider-held funds, clear deal rules, and documented dispute resolution.": "أموال لدى مزوّد الدفع، وقواعد صفقة واضحة، وحل نزاعات موثّق.",
  "Sign in or create an account | Insight": "تسجيل الدخول أو إنشاء حساب",
  "Create your Insight account or sign in to open escrow deals, fund them, and track delivery.":
    "أنشئ حساب إنسايت الخاص بك أو سجّل الدخول لفتح صفقات الضمان، وتمويلها، وتتبع التسليم.",
  "Sign in to Insight": "تسجيل الدخول إلى إنسايت",
  "Accounts for buyers and sellers using Insight escrow.":
    "حسابات المشترين والبائعين باستخدام ضمان إنسايت.",
  "Loading deal…": "جارٍ تحميل الصفقة...",
  "This deal reference does not exist.": "مرجع الصفقة هذا غير موجود.",
  "Back to all deals": "العودة إلى جميع الصفقات",
  "Change deal status": "تغيير حالة الصفقة",
  "The reason is written into the deal log and is visible to both parties.":
    "يتم كتابة السبب في سجل الصفقة ويكون مرئيًا لكلا الطرفين.",
  "Fee percentage": "نسبة الرسوم",
  "Fixed fee (SAR)": "الرسوم الثابتة (ريال سعودي)",
  "Fixed fee (deal currency)": "الرسوم الثابتة (بعملة الصفقة)",
  "Record payment provider confirmations (simulated in this demo). The outcome and reason are shown to both parties.": "سجّل تأكيدات مزوّد الدفع (محاكاة في هذه النسخة التجريبية). تظهر النتيجة والسبب للطرفين.",
  "No payments recorded for this deal yet.": "لا توجد مدفوعات مسجلة لهذه الصفقة حتى الآن.",
  "No messages on this deal yet.": "لا توجد رسائل حول هذه الصفقة حتى الآن.",
  "Send as Insight support": "إرسال كدعم إنسايت",
  "Deal value": "قيمة الصفقة",
  Parties: "الأطراف",
  "Dispute reason": "سبب الخلاف",
  "No activity recorded.": "لم يتم تسجيل أي نشاط.",
  "All platform deals": "جميع عروض المنصات",
  "Loading deals…": "جارٍ تحميل الصفقات...",
  "Could not load deals.": "تعذر تحميل الصفقات.",
  "No deals match this view yet.": "لا توجد عروض تطابق هذا الصفقة حتى الآن.",
  "Resolution policy": "سياسة الحل",
  "AI guidance supports evidence review. Insight records the dispute decision; the licensed payment provider handles releases and refunds.": "تساعد إرشادات الذكاء الاصطناعي في مراجعة الأدلة. تسجّل Insight قرار النزاع، ويتولى مزوّد الدفع المرخّص الإفراج والاسترداد.",
  Reset: "إعادة ضبط",
  "AI mediation window (days)": "نافذة وساطة الذكاء الاصطناعي (أيام)",
  "Demo review setting (SAR; not a charge)": "إعداد مراجعة تجريبي (ريال؛ ليس رسماً)",
  "Demo review setting assigned to": "إعداد المراجعة التجريبي المخصّص لـ",
  "Escalate automatically": "التصعيد تلقائيًا",
  "Yes, when the window expires": "نعم، عند انتهاء صلاحية النافذة",
  "No, staff decide": "لا، الموظفون يقررون",
  "Dispute queue": "قائمة انتظار النزاعات",
  Case: "القضية",
  Stage: "المرحلة",
  "AI window": "نافذة الذكاء الاصطناعي",
  Closed: "مغلق",
  "Under dispute review": "قيد مراجعة النزاع",
  "No action needed": "لا  اجراء مطلوب",
  "Current AI recommendation:": "التوصية الحالية للذكاء الاصطناعي:",
  "Analyzing…": "التحليل",
  "Run AI mediation plan": "تشغيل خطة وساطة الذكاء الاصطناعي",
  "AI mediation plan": "خطة وساطة الذكاء الاصطناعي",
  "AI-generated guidance for mediation. Not a binding decision or legal advice.":
    "إرشادات تم إنشاؤها بواسطة الذكاء الاصطناعي للوساطة. ليس قرارًا ملزمًا أو مشورة قانونية.",
  "Platform fee rules": "قواعد رسوم المنصة",
  "Define each value band yourself: charge a percentage, a fixed amount, or whichever is higher.":
    "حدد كل نطاق قيمة بنفسك: قم بتحصيل نسبة مئوية أو مبلغ ثابت أو أيهما أعلى.",
  "Add band": "إضافة شريط",
  "From (SAR)": "من (ريال سعودي)",
  "To (SAR)": "إلى (ريال سعودي)",
  Rule: "القاعدة",
  "Amount (SAR)": "الإجمالي (بالريال السعودي)",
  "Test a deal value": "اختبر قيمة الصفقة",
  "Deal value (SAR)": "القيمة (بالريال السعودي)",
  "Fee revenue on current deals": "إيرادات الرسوم على الصفقات الحالية",
  "New band": "سوار جديد",
  "Live platform data": "بيانات المنصة",
  "Manage members →": "إدارة الأعضاء",
  "Review all deals →": "مراجعة جميع الصفقات →",
  "Run risk screening →": "إجراء فحص المخاطر →",
  "Monthly volume and fee revenue": "الحجم الشهري وإيرادات الرسوم",
  "Deal status distribution": "توزيع حالة الصفقة",
  "Revenue mix": "مزيج الإيرادات",
  "Controls are editable": "الضوابط قابلة للتعديل",
  "Update currency rates daily and define fee tiers by percentage, fixed amount, or whichever is higher.":
    "قم بتحديث أسعار العملات يوميًا وحدد مستويات الرسوم حسب النسبة المئوية أو المبلغ الثابت أو أيهما أعلى.",
  "All deals across the platform": "جميع الصفقات عبر المنصة",
  "Fees calculated with the current rules": "الرسوم المحسوبة وفقًا للقواعد الحالية",
  Effective: "فعال",
  "Disputes needing attention": "النزاعات التي تحتاج إلى عناية",
  "Open dispute resolution": "حل النزاعات",
  "Total transaction volume": "إجمالي حجم المعاملات",
  "Total revenue": "إجمالي الإيرادات",
  "Escrow fee revenue": "إيرادات رسوم الضمان",
  "Currency margin revenue": "إيرادات هامش العملة",
  "Funds currently held": "الأموال المحتفظ بها حاليًا",
  "Blended take rate": "معدل الالتقاط المختلط",
  "Average deal value": "متوسط قيمة الصفقة",
  "Average release time": "متوسط وقت الإصدار",
  "Successful releases": "الإصدارات الناجحة",
  "Dispute rate": "معدل النزاع",
  "Disputes under review": "نزاعات قيد المراجعة",
  "Rates needing a daily update": "الأسعار التي تحتاج إلى تحديث يومي",
  "Active fee tiers": "مستويات الرسوم النشطة",
  "Registered members": "الأعضاء المسجلين",
  "Pending identity checks": "في انتظار التحقق من الهوية",
  "Deals created": "تم إنشاء الصفقات",
  "Deal volume": "حجم الصفقة",
  "Deals in dispute": "الصفقات المتنازع عليها",
  "Loading documents…": "جارٍ تحميل المستندات...",
  "No documents have been submitted yet.": "لم يتم تقديم أي مستندات حتى الآن.",
  "Base rate is the mid-market rate in SAR per 1 unit. The customer rate adds the margin you set here — customers never see the margin.":
    "السعر الأساسي هو سعر السوق المتوسط بالريال السعودي لكل وحدة. يضيف سعر العميل الهامش الذي تحدده هنا — لا يرى العملاء الهامش أبدًا.",
  "Mark all updated today": "وضع علامة على كل ما تم تحديثه اليوم",
  "Base rate (SAR)": "السعر الأساسي (ريال سعودي)",
  "Margin %": "الهامش %",
  "Customer rate": "سعر العميل",
  Updated: "محدث",
  "Add a currency": "إضافة عملة",
  Name: "الاسم",
  "Base rate (SAR per unit)": "السعر الأساسي (ريال سعودي لكل وحدة)",
  "Add currency": "إضافة عملة",
  "Margin preview": "معاينة الهامش",
  "Change the sample deal value to see the expected margin per currency in the table.":
    "قم بتغيير قيمة نموذج الصفقة لرؤية الهامش المتوقع لكل عملة في الجدول.",
  "Sample deal value (SAR)": "نموذج لقيمة الصفقة (ريال سعودي)",
  "AI risk review": "مراجعة المخاطر",
  "Pick the deals to screen, add anything members sent you outside the platform, and the model ranks which deals need a manual review.":
    "اختر الصفقات المراد فرزها، وأضف أي شيء يرسله لك الأعضاء خارج المنصة، وتحتاج رتب النماذج التي تتعامل معها إلى مراجعة يدوية.",
  "No deals yet.": "لا توجد صفقات حتى الآن.",
  Stop: "التوقف عن استخدام الرد",
  "Save a risk flag from this analysis": "احفظ علامة خطر من هذا التحليل",
  "Deals flagged for review": "تم وضع علامة على الصفقات للمراجعة",
  "Everything you marked medium or high risk, newest score first.":
    "كل شيء وضعت علامة عليه مخاطر متوسطة أو عالية، أحدث درجة أولاً.",
  "No deals are flagged right now.": "لم يتم الإبلاغ عن أي صفقات في الوقت الحالي.",
  "Platform console | Insight": "وحدة تحكم المنصة | نظرة ثاقبة",
  "Internal Insight console: KPIs, revenue analytics, currency rates, fee rules, and dispute resolution.":
    "وحدة تحكم INSIGHT الداخلية: مؤشرات الأداء الرئيسية وتحليلات الإيرادات وأسعار العملات وقواعد الرسوم وحل النزاعات.",
  "Insight platform console": "وحدة تحكم منصة إنسايت",
  "Internal oversight of volume, revenue, rates, fees, and disputes.":
    "الرقابة الداخلية على الحجم والإيرادات والمعدلات والرسوم والنزاعات.",
  "Everyone who signed up on Insight, with identity checks and team access.":
    "كل من اشترك في إنسايت، من خلال التحقق من الهوية والوصول إلى الفريق.",
  "Loading members…": "جارٍ تحميل الأعضاء...",
  "Could not load members.": "تعذر تحميل الأعضاء.",
  "Insight team": "فريق INSIGHT",
  "Approve identity": "الموافقة على الهوية",
  "No members match that search.": "لا يوجد أعضاء يطابقون هذا البحث.",
  "Held funds are never released while a dispute is open. This is the exact path a case follows.":
    "لا يتم إطلاق الأموال المحتفظ بها أبدًا أثناء وجود نزاع مفتوح. هذا هو المسار الدقيق الذي تتبعه الحالة.",
  "Refund types": "أنواع رد الأموال",
  "Full refund": "الاسترداد الكامل ",
  "— the buyer receives the funded amount back when delivery did not happen or was materially different from the terms.":
    "— يسترد المشتري المبلغ الممول عندما لم يحدث التسليم أو كان مختلفًا جوهريًا عن الشروط.",
  "Partial refund": "استرداد جزئي للمال",
  "— the parties agree, or Insight decides, a split of the held amount; the rest is released to the seller.":
    "— يتفق الطرفان، أو تقرر إنسايت، تقسيم المبلغ المحتفظ به ؛ يتم الإفراج عن الباقي للبائع.",
  "Cancellation before delivery": "الإلغاء قبل التوصيل",
  "— if both sides cancel before delivery, the funded amount is returned.":
    "— إذا قام كلا الجانبين بالإلغاء قبل التسليم، فسيتم إرجاع المبلغ الممول.",
  "Visit the help centre": "زيارة مركز المساعدة",
  "Read the terms": "قراءة الشروط",
  "Disputes & refunds policy | Insight": "سياسة المنازعات والمبالغ المستردة | إنسايت",
  "How Insight reviews dispute evidence and records decisions, with releases and refunds handled by a licensed payment provider.": "كيف تراجع Insight أدلة النزاع وتسجّل القرارات، مع تنفيذ الإفراج والاسترداد بواسطة مزوّد دفع مرخّص.",
  "Insight disputes and refunds policy": "سياسة نزاعات البصيرة واسترداد الأموال",
  "A clear path from disagreement to decision.": "مسار واضح من الخلاف إلى القرار.",
  "1. Raise the case": "1. رفع الدعوى",
  "Either party can open a dispute from the deal page while the funds are still held. The reason is recorded and both sides are notified immediately. The money stays locked until the case closes.":
    "يمكن لأي من الطرفين فتح نزاع من صفحة الصفقة بينما لا تزال الأموال محتجزة. يتم تسجيل السبب ويتم إخطار كلا الجانبين على الفور. يبقى المال مغلقًا حتى تغلق القضية.",
  "2. Evidence window": "2. نافذة الأدلة",
  "Both parties upload evidence — files, screenshots, delivery proof, shipping tracking — and answer Insight's questions inside the deal conversation.":
    "يقوم كلا الطرفين بتحميل الأدلة — الملفات ولقطات الشاشة وإثبات التسليم وتتبع الشحن — والإجابة على أسئلة إنسايت داخل محادثة الصفقة.",
  "3. Insight review": "3. مراجعة البصيرة",
  "Insight reviews the case within the review window published in the dispute centre (3 days by default) and proposes an outcome: release, full refund, or a partial settlement split between the parties.":
    "تستعرض إنسايت الحالة ضمن نافذة المراجعة المنشورة في مركز المنازعات (3 أيام افتراضيًا) وتقترح نتيجة: الإفراج أو رد الأموال بالكامل أو تقسيم التسوية الجزئية بين الطرفين.",
  "4. Decision and payout": "4. القرار والدفع",
  "The licensed payment provider handles the release or refund under the recorded decision. Insight keeps the amount, reason and reference in the deal record, visible to both parties.": "يتولى مزوّد الدفع المرخّص الإفراج أو الاسترداد وفق القرار المسجّل. تحفظ Insight المبلغ والسبب والمرجع في سجل الصفقة، ويطّلع عليه الطرفان.",
  "Questions, answered": "الأسئلة التي تم الإجابة عليها",
  "Everything you need to know before opening your first deal.":
    "كل ما تحتاج إلى معرفته قبل فتح صفقتك الأولى.",
  "Still stuck?": "هل ما زلت لا تستطيع تحميل الفيديو؟",
  "Open the deal and use the note box for the Insight team, or create an account to start a conversation.":
    "افتح الصفقة واستخدم مربع الملاحظات لفريق إنسايت، أو أنشئ حسابًا لبدء محادثة.",
  "Help centre | Insight": "مركز المساعدة | نظرة ثاقبة",
  "Answers about funding, inspection periods, releasing funds, refunds, disputes and verification on Insight.":
    "إجابات حول التمويل وفترات التفتيش والإفراج عن الأموال والمبالغ المستردة والنزاعات والتحقق من إنسايت.",
  "Insight help centre": "مركز مساعدة INSIGHT",
  "How escrow works, step by step.": "كيف يعمل الضمان، خطوة بخطوة.",
  "THE ESCROW JOURNEY": "رحلة الضمان",
  "From agreement to settlement": "من الاتفاق إلى التسوية",
  "The platform supports SAR, BHD, AED, QAR, KWD, OMR and USD. In Bahrain and Saudi Arabia, funds are to be held by payment providers licensed by the Central Bank of Bahrain (CBB) and the Saudi Central Bank (SAMA), respectively. Insight runs the deal rules and keeps the record; Insight is not licensed, regulated or approved by either central bank.": "تدعم المنصة SAR وBHD وAED وQAR وKWD وOMR وUSD. في البحرين والسعودية، يُعتزم الاحتفاظ بالأموال لدى مزوّدي دفع مرخّصين من مصرف البحرين المركزي (CBB) والبنك المركزي السعودي (SAMA)، على الترتيب. تدير Insight قواعد الصفقة وتحفظ سجلّها؛ ولا يُعدّ ذلك ادعاءً بترخيص Insight أو تنظيمها أو اعتمادها من أيّ من البنكين المركزيين.",
  "Deal statuses": "حالات الصفقة",
  "Review fees": "مراجعة الرسوم",
  "Explore dashboard": "استكشف لوحة البيانات",
  "How Insight works | Secure escrow steps": "كيفية عمل إنسايت | خطوات الضمان الآمنة",
  "Follow an Insight deal from account verification and funding through delivery, release, refund, or dispute.":
    "اتبع صفقة إنسايت من التحقق من الحساب والتمويل من خلال التسليم أو الإصدار أو رد الأموال أو النزاع.",
  "How Insight works": "كيف تعمل إنسايت",
  "Seven clear steps from agreement to settlement.": "سبع خطوات واضحة من الاتفاق إلى التسوية.",
  article: "مقالة",
  "Create and verify your account": "إنشاء حسابك والتحقق منه",
  "Confirm your email and phone. Identity checks apply when required.":
    "قم بتأكيد بريدك الإلكتروني وهاتفك. يتم تطبيق عمليات التحقق من الهوية عند الحاجة.",
  "Define the deal": "تحديد الصفقة",
  "Set the scope, value, currency, parties, delivery window, and release conditions.":
    "حدد النطاق والقيمة والعملة والأطراف ونافذة التسليم وشروط الإصدار.",
  "Send a secure, time-limited invitation for review and acceptance.":
    "أرسل دعوة آمنة ومحدودة المدة للمراجعة والقبول.",
  "Fund the agreement": "العقد",
  "Payment is confirmed by the payment provider (simulated in this demo).": "يؤكده مزوّد الدفع (محاكاة في هذه النسخة التجريبية).",
  "Payment is confirmed by the payment provider (simulated in this demo). Funds are held by a licensed payment provider. Insight runs the deal rules and keeps the record.": "يؤكده مزوّد الدفع (محاكاة في هذه النسخة التجريبية). يحتفظ بالأموال مزوّد دفع مرخّص، وتدير Insight قواعد الصفقة وتحفظ سجلّها.",
  "Indicative pricing for this demo; final pricing to be confirmed": "أسعار استرشادية لهذه النسخة التجريبية؛ ستُعتمد الأسعار النهائية لاحقاً",
  "Indicative pricing for this demo; final pricing to be confirmed.": "أسعار استرشادية لهذه النسخة التجريبية؛ ستُعتمد الأسعار النهائية لاحقاً.",
  "Indicative pricing for this demo; final pricing to be confirmed. The platform supports SAR, BHD, AED, QAR, KWD, OMR and USD. In Bahrain and Saudi Arabia, funds are to be held by payment providers licensed by the Central Bank of Bahrain (CBB) and the Saudi Central Bank (SAMA), respectively. Insight runs the deal rules and keeps the record; Insight is not licensed, regulated or approved by either central bank.": "أسعار استرشادية لهذه النسخة التجريبية؛ ستُعتمد الأسعار النهائية لاحقاً. تدعم المنصة SAR وBHD وAED وQAR وKWD وOMR وUSD. في البحرين والسعودية، يُعتزم الاحتفاظ بالأموال لدى مزوّدي دفع مرخّصين من مصرف البحرين المركزي (CBB) والبنك المركزي السعودي (SAMA)، على الترتيب. تدير Insight قواعد الصفقة وتحفظ سجلّها؛ ولا يُعدّ ذلك ادعاءً بترخيص Insight أو تنظيمها أو اعتمادها من أيّ من البنكين المركزيين.",
  "Indicative demo pricing": "أسعار تجريبية استرشادية",
  "Indicative escrow fee calculator": "حاسبة رسوم ضمان استرشادية",
  "Indicative escrow fee": "رسوم ضمان استرشادية",
  "Indicative buyer total": "إجمالي المشتري الاسترشادي",
  "Indicative seller receipt": "مستحقات البائع الاسترشادية",
  "Indicative fee bands": "شرائح الرسوم الاسترشادية",
  "Cross-currency deals include a currency conversion margin shown in the indicative total before you confirm. Final pricing is to be confirmed.": "تتضمن الصفقات متعددة العملات هامش تحويل يظهر في الإجمالي الاسترشادي قبل التأكيد. ستُعتمد الأسعار النهائية لاحقاً.",
  "The licensed payment provider releases or refunds funds; Insight keeps the receipt and complete timeline.": "يُفرج مزوّد الدفع المرخّص عن الأموال أو يعيدها، وتحفظ Insight الإيصال والسجل الزمني الكامل.",
  "Funds are held by the licensed payment provider and work can begin.": "يحتفظ مزوّد الدفع المرخّص بالأموال ويمكن بدء العمل.",
  "The licensed payment provider released funds to the seller.": "أفرج مزوّد الدفع المرخّص عن الأموال للبائع.",
  "The licensed payment provider returned funds under the refund policy.": "أعاد مزوّد الدفع المرخّص الأموال وفق سياسة الاسترداد.",
  "Funds are held by a licensed payment provider. Insight runs the deal rules and keeps the record. Payment is confirmed by the payment provider (simulated in this demo).": "يحتفظ بالأموال مزوّد دفع مرخّص، وتدير Insight قواعد الصفقة وتحفظ سجلّها. يؤكده مزوّد الدفع (محاكاة في هذه النسخة التجريبية).",
  "Insight reviews both sides' evidence under the dispute policy and records the decision. The licensed payment provider handles any release or refund.": "تراجع Insight أدلة الطرفين وفق سياسة النزاعات وتسجّل القرار. يتولى مزوّد الدفع المرخّص أي إفراج أو استرداد.",
  "Disputes are handled under the published dispute and refund policy. Insight reviews evidence supplied by both parties and records the decision; the licensed payment provider handles any release or refund.": "تُعالج النزاعات وفق سياسة النزاعات والاسترداد المنشورة. تراجع Insight أدلة الطرفين وتسجّل القرار؛ ويتولى مزوّد الدفع المرخّص أي إفراج أو استرداد.",
  "Funds are held by a licensed payment provider. Insight runs the deal rules and keeps the record. We are not a party to the underlying commercial agreement, do not guarantee the quality of goods or services, and our liability is limited to the value of the funds held in the affected deal.": "يحتفظ بالأموال مزوّد دفع مرخّص، وتدير Insight قواعد الصفقة وتحفظ سجلّها. لسنا طرفاً في الاتفاق التجاري الأصلي، ولا نضمن جودة السلع أو الخدمات، وتقتصر مسؤوليتنا على قيمة الأموال المحتفظ بها في الصفقة المعنية.",
  "The escrow fee is shown before the deal is funded and is charged to the party agreed in the deal. Currency conversion, where used, includes a margin shown in the final amount.": "تظهر رسوم الضمان قبل التمويل ويتحملها الطرف المتفق عليه في الصفقة. عند تحويل العملات، يُدرج الهامش في المبلغ النهائي المعروض.",
  "A licensed payment provider handles cross-border payments; Insight records the deal and the rate shown before funding.": "يتولى مزوّد دفع مرخّص المدفوعات العابرة للحدود؛ وتسجّل Insight الصفقة وسعر الصرف المعروض قبل التمويل.",
  "Payment provider": "مزوّد الدفع",
  "Payment provider simulation": "محاكاة مزوّد الدفع",
  "Funding request recorded. Payment is confirmed by the payment provider (simulated in this demo).": "تم تسجيل طلب التمويل. يؤكده مزوّد الدفع (محاكاة في هذه النسخة التجريبية).",
  "Payment submitted to the licensed payment provider, which holds the funds. Insight records the confirmation.": "أُرسل طلب الدفع إلى مزوّد الدفع المرخّص الذي يحتفظ بالأموال. تسجّل Insight التأكيد.",
  "The payout to the seller is processed by the payment provider (simulated in this demo).": "يتولى مزوّد الدفع دفع مستحقات البائع (محاكاة في هذه النسخة التجريبية).",
  "Release recorded. The payment provider handles the transfer and settlement (simulated in this demo).": "تم تسجيل طلب الإفراج. يتولى مزوّد الدفع التحويل والتسوية (محاكاة في هذه النسخة التجريبية).",
  "A buyer started funding this deal. Record the payment provider confirmation (simulated in this demo) in the console.": "بدأ المشتري تمويل الصفقة. سجّل تأكيد مزوّد الدفع (محاكاة في هذه النسخة التجريبية) في لوحة الإدارة.",
  "The buyer approved a release. Record the payment provider payout confirmation (simulated in this demo) in the console.": "وافق المشتري على الإفراج. سجّل تأكيد مزوّد الدفع للدفع (محاكاة في هذه النسخة التجريبية) في لوحة الإدارة.",
  "Dispute opened": "تم فتح نزاع",
  "Arbitration requested": "تم فتح نزاع",
  "Arbitration was requested on this deal": "تم فتح نزاع",
  "Record provider confirmation (simulated)": "تسجيل تأكيد مزوّد الدفع (محاكاة)",
  "Requesting provider payout…": "جارٍ طلب الدفع من مزوّد الدفع…",
  "Dispute review": "مراجعة النزاع",
  "Insight dispute review": "مراجعة نزاعات Insight",
  "Review team": "فريق المراجعة",
  "Demo review setting (not a charge)": "إعداد مراجعة تجريبي (ليس رسماً)",
  "Evidence is balanced; further dispute review is required.": "الأدلة متوازنة؛ يلزم استكمال مراجعة النزاع.",
  "Resolved in the AI mediation window.": "حُلّ النزاع خلال فترة الوساطة بمساعدة الذكاء الاصطناعي.",
  "Resolved inside the AI mediation window.": "حُلّ النزاع خلال فترة الوساطة بمساعدة الذكاء الاصطناعي.",
  "Review the delayed admin area and the delivery terms before recommending a decision.": "راجع لوحة الإدارة المتأخرة وشروط التسليم قبل التوصية بقرار.",
  "Logo, brand guide, and social templates delivered under the agreed scope with two revisions each.": "شعار ودليل هوية وقوالب تواصل تُسلّم وفق النطاق المتفق عليه، مع مراجعتين لكل منها.",
  "Deliverable — Logo": "مخرج التسليم — الشعار",
  "Deliverable — Brand guide": "مخرج التسليم — دليل الهوية",
  "Deliverable — Templates": "مخرج التسليم — القوالب",
  "Payment funding recorded": "تم تسجيل تمويل الدفع",
  "Provider payment release recorded": "تم تسجيل إفراج مزوّد الدفع",
  "Brand guide delivered": "تم تسليم دليل الهوية",
  "Brand guide delivered — DL-10428": "تم تسليم دليل الهوية — DL-10428",
  "Review the brand guide or request changes": "راجع دليل الهوية أو اطلب تعديلات",
  "Office furniture": "أثاث مكتبي",
  "Furniture supply": "توريد الأثاث",
  "Installation deliverable": "مخرج التسليم — التركيب",
  "Fund the deal to start delivery": "موّل الصفقة لبدء التسليم",
  "window for dispute review.": "فترة لمراجعة النزاع.",
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
      text: (english, arabic) =>
        locale === "ar" ? (arabic ?? translations[english] ?? english) : english,
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
    if (
      node.parentElement &&
      !node.parentElement.closest("[data-no-localize]") &&
      !["SCRIPT", "STYLE", "TEXTAREA"].includes(node.parentElement.tagName)
    ) {
      const original = originalText.get(node) ?? node.textContent ?? "";
      if (!originalText.has(node) && original.trim()) originalText.set(node, original);
      const localized = locale === "ar" ? translateText(original) : original;
      if (node.textContent !== localized) node.textContent = localized;
    }
    node = textNodes.nextNode();
  }
  for (const element of document.body.querySelectorAll<HTMLElement>(
    "[placeholder], [aria-label], [title]",
  )) {
    if (element.closest("[data-no-localize]")) continue;
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
