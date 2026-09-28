import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "ar";

const STORAGE_KEY = "insight.locale";
const originalText = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

const translations: Record<string, string> = {
  "For buyers": "للمشترين",
  "For suppliers": "للموردين",
  Business: "الأعمال",
  Security: "الأمان",
  FAQ: "الأسئلة الشائعة",
  "Open a dispute": "فتح نزاع",
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
  "The safer way to": "الطريقة الأكثر أمانًا",
  "close every deal": "لإتمام كل صفقة",
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
  "Insight | Secure Escrow": "إنسايت | ضمان آمن",
  "Secure escrow for buyers, sellers, freelancers, and growing teams.":
    "ضمان آمن للمشترين والبائعين والمستقلين والفرق المتنامية.",
  "Protected payments, clear milestones, and fair dispute resolution.":
    "المدفوعات المحمية، والمعالم الواضحة، والتسوية العادلة للنزاعات.",
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
  "Special fee offer": "عرض الرسوم الخاصة",
  "Fee percentage": "نسبة الرسوم",
  "Fixed fee (SAR)": "الرسوم الثابتة (ريال سعودي)",
  "Confirm or reject each money movement. The outcome and the reason are shown to both parties.":
    "قم بتأكيد أو رفض كل حركة أموال. يتم عرض النتيجة والسبب لكلا الطرفين.",
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
  "AI mediation runs for a fixed window. If the parties do not settle, the case moves to an external arbitrator and the arbitration fee is charged to the party you choose.":
    "تعمل وساطة الذكاء الاصطناعي لنافذة ثابتة. إذا لم يقم الطرفان بالتسوية، تنتقل القضية إلى محكم خارجي ويتم فرض رسوم التحكيم على الطرف الذي تختاره.",
  Reset: "إعادة ضبط",
  "AI mediation window (days)": "نافذة وساطة الذكاء الاصطناعي (أيام)",
  "Arbitration fee (SAR)": "رسوم التحكيم (ريال سعودي)",
  "Arbitration fee charged to": "رسوم التحكيم المفروضة على",
  "Escalate automatically": "التصعيد تلقائيًا",
  "Yes, when the window expires": "نعم، عند انتهاء صلاحية النافذة",
  "No, staff decide": "لا، الموظفون يقررون",
  "Dispute queue": "قائمة انتظار النزاعات",
  Case: "القضية",
  Stage: "المرحلة",
  "AI window": "نافذة الذكاء الاصطناعي",
  Closed: "مغلق",
  "With arbitrator": "مع المحكم",
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
  "Band label": "تسمية الفرقة",
  "From (SAR)": "من (ريال سعودي)",
  "To (SAR)": "إلى (ريال سعودي)",
  Rule: "القاعدة",
  "Percent %": "النسبة",
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
  "With external arbitrator": "مع محكم خارجي",
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
  "How Insight reviews disputes, the review window, partial refunds, and when a case goes to an external arbitrator.":
    "كيف تستعرض إنسايت النزاعات، ونافذة المراجعة، والمبالغ المستردة الجزئية، وعندما تذهب القضية إلى محكم خارجي.",
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
  "4. External arbitration": "4. التحكيم الخارجي",
  "If a party rejects the proposal, or the case is too complex, it is escalated to an independent arbitrator. The arbitrator's fee is charged according to the deal's dispute settings and is stated before escalation.":
    "إذا رفض أحد الأطراف الاقتراح، أو كانت القضية معقدة للغاية، يتم تصعيدها إلى محكم مستقل. يتم فرض رسوم المحكم وفقًا لإعدادات النزاع الخاصة بالصفقة ويتم ذكرها قبل التصعيد.",
  "5. Decision and payout": "5. القرار والعائد",
  "The final outcome is applied to the held funds and recorded in the deal's payment records with the amount, reason, and reference, visible to both parties.":
    "يتم تطبيق النتيجة النهائية على الأموال المحتفظ بها وتسجيلها في سجلات الدفع الخاصة بالصفقة مع المبلغ والسبب والمرجعية المرئية لكلا الطرفين.",
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
  "Seven transparent steps, each recorded in the deal timeline.":
    "سبع خطوات شفافة، تم تسجيل كل منها في الجدول الزمني للصفقة.",
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
  "The buyer funds the deal and the amount moves into protected escrow.":
    "يقوم المشتري بتمويل الصفقة وينتقل المبلغ إلى الضمان المحمي.",
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
