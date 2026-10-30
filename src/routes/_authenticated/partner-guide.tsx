import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/_authenticated/partner-guide")({
  head: () => ({ meta: [{ title: "Partner API guide | Insight" }, { name: "robots", content: "noindex" }] }),
  component: PartnerGuidePage,
});

const Code = ({ children }: { children: string }) => (
  <pre dir="ltr" className="mt-3 overflow-x-auto rounded-xl bg-[#0c2a22] p-4 text-start text-xs leading-6 text-[#d9f3e7]"><code>{children}</code></pre>
);

const CREATE = `curl https://insightsettle.com/api/partner/v1/deals \\
  -H "Authorization: Bearer ins_test_..." \\
  -H "Idempotency-Key: order-1001-create" \\
  -H "Content-Type: application/json" \\
  -d '{
    "reference": "ORDER-1001",
    "title": "12 office chairs",
    "amount": 1850,
    "currency": "BHD",
    "buyer": { "email": "buyer@example.com" },
    "fee_payer": "buyer",
    "inspection_days": 3,
    "delivery_country": "SA",
    "return_url": "https://shop.example.com/orders/1001",
    "metadata": { "order_id": "1001" }
  }'`;

const RESPONSE = `201 Created
{
  "deal": {
    "ref": "DL-12345",
    "reference": "ORDER-1001",
    "status": "pending_funding",
    "terms_status": "pending",
    "amount": 1850, "currency": "BHD",
    "buyer": { "email": "buyer@example.com", "joined": false },
    "checkout_url": "https://insightsettle.com/invite/…",
    "deal_url": "https://insightsettle.com/deals/DL-12345",
    "metadata": { "order_id": "1001" }
  }
}`;

const VERIFY = `// Node.js: check every event before you trust it
import crypto from "node:crypto";

function verify(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = Number(parts.t);
  if (Math.abs(Date.now() / 1000 - t) > 300) return false; // older than 5 minutes
  const expected = crypto.createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(parts.v1, "hex"));
}
// header = request.headers["insight-signature"]   e.g.  t=1793300000,v1=5f2c…`;

const EVENT = `{
  "id": "6f0c…",
  "type": "deal.funded",
  "created_at": "2026-10-30T09:12:44Z",
  "api_version": "v1",
  "data": { "deal": { "ref": "DL-12345", "reference": "ORDER-1001", "status": "held", … }, "previous_status": "pending_funding" }
}`;

/** Technical guide for the partner API, inside the business account (not on the public site). */
function PartnerGuidePage() {
  const { text } = useLocale();
  const endpoints: [string, string, string, string][] = [
    ["POST", "/deals", "Create a deal (Idempotency-Key header required). Returns the checkout link for the buyer.", "إنشاء صفقة (ترويسة Idempotency-Key مطلوبة). يعيد رابط الدفع للمشتري."],
    ["GET", "/deals/{ref}", "Read one deal: status, terms, shipping, milestones.", "قراءة صفقة: الحالة والشروط والشحن والمراحل."],
    ["GET", "/deals?reference=ORDER-1001", "Find deals by your own reference, newest first (limit, starting_after).", "البحث برقم طلبك، الأحدث أولاً (limit و starting_after)."],
    ["POST", "/deals/{ref}/shipping", "Add carrier and tracking: status preparing, shipped, in_transit or out_for_delivery.", "إضافة شركة الشحن ورقم التتبع: preparing أو shipped أو in_transit أو out_for_delivery."],
    ["POST", "/deals/{ref}/deliver", "Confirm delivery. The buyer's inspection period starts.", "تأكيد التسليم، فتبدأ مدة الفحص لدى المشتري."],
    ["POST", "/deals/{ref}/cancel", "Cancel a deal that has not been paid yet (reason required).", "إلغاء صفقة لم تُدفع بعد (مع ذكر السبب)."],
    ["GET", "/events", "Every event for your deals, newest first, with its delivery status.", "كل إشعارات صفقاتك، الأحدث أولاً، مع حالة إرسالها."],
    ["POST", "/webhook/test", "Send a test event to your webhook address.", "إرسال إشعار تجريبي إلى عنوانك."],
    ["GET", "/me", "Check your key: partner name and key mode.", "التحقق من المفتاح: اسم الشريك ونوع المفتاح."],
  ];
  const events: [string, string, string][] = [
    ["deal.created", "The deal was created.", "أُنشئت الصفقة."],
    ["deal.buyer_joined", "The buyer opened the link and joined.", "فتح المشتري الرابط وانضم."],
    ["deal.terms_agreed", "The buyer accepted the terms.", "وافق المشتري على الشروط."],
    ["deal.funded", "The buyer paid; the amount is held.", "دفع المشتري، والمبلغ محفوظ."],
    ["deal.shipping_updated", "Shipping status or tracking changed.", "تغيّرت حالة الشحن أو رقم التتبع."],
    ["deal.delivered", "Delivery confirmed; the inspection period started.", "تأكد التسليم وبدأت مدة الفحص."],
    ["deal.revision_requested", "The buyer asked for a change before release.", "طلب المشتري تعديلاً قبل التحويل."],
    ["deal.released / deal.completed", "The amount was paid out to you.", "حُوِّل المبلغ إليك."],
    ["deal.disputed", "The buyer or you opened a dispute; payout is frozen.", "فُتح نزاع وتجمّد التحويل."],
    ["deal.refunded / deal.partially_refunded", "A dispute decision refunded the buyer in full or in part.", "أعاد قرار النزاع المبلغ للمشتري كاملاً أو جزئياً."],
    ["deal.cancelled", "The deal was cancelled before payment.", "أُلغيت الصفقة قبل الدفع."],
    ["milestone.funded / submitted / released …", "A milestone changed status (staged deals).", "تغيّرت حالة مرحلة (في الصفقات على مراحل)."],
  ];
  const steps: [string, string, string, string][] = [
    ["Turn on the partner API", "From your Insight account (verified business), open Partner API, then create a test key and add your webhook address.", "فعّل واجهة الربط", "من حسابك في إنسايت (حساب أعمال موثّق) افتح «واجهة الربط»، ثم أنشئ مفتاح تجربة وأضف عنوان الإشعارات."],
    ["Create the deal from your server", "When your customer checks out, your server calls POST /deals with the amount, the buyer's email and your order reference.", "أنشئ الصفقة من خادمك", "عندما يشتري عميلك، يرسل خادمك طلب POST /deals فيه المبلغ وبريد المشتري ورقم طلبك."],
    ["Send the buyer to Insight", "Redirect the buyer to checkout_url. They sign in with the invited email, accept the terms and pay on Insight's own page. Payment details never pass through your system.", "حوّل المشتري إلى إنسايت", "حوّل المشتري إلى checkout_url. يدخل بالبريد المدعو، ويوافق على الشروط، ويدفع في صفحة إنسايت. بيانات الدفع لا تمر عبر نظامك."],
    ["Follow every step by events", "Insight sends a signed event to your webhook at every step. Update your order from the event, and read the deal again with GET /deals/{ref} when in doubt.", "تابع كل خطوة بالإشعارات", "ترسل إنسايت إشعاراً موقّعاً لكل خطوة. حدّث طلبك من الإشعار، واقرأ الصفقة بـ GET /deals/{ref} عند الشك."],
    ["Ship and confirm delivery", "Send tracking with /shipping and confirm with /deliver (or do it in Insight). The buyer checks, then confirms; if they do nothing, the amount is paid out when the inspection period ends.", "اشحن وأكّد التسليم", "أرسل التتبع عبر /shipping وأكّد عبر /deliver (أو من إنسايت). يفحص المشتري ثم يؤكد، وإن لم يتخذ إجراءً يُحوَّل المبلغ عند انتهاء مدة الفحص."],
  ];
  return (
    <div data-no-localize className="reveal min-w-0 max-w-4xl">
        <p className="text-sm font-semibold text-primary"><Link to="/partner">{text("Partner API", "واجهة الربط")}</Link> · {text("Technical guide", "الدليل التقني")}</p>
        <h1 className="mt-2 text-3xl font-bold">{text("Partner API: technical guide", "واجهة الربط: الدليل التقني")}</h1>
        <p className="mt-4 max-w-2xl leading-8 text-muted-foreground">{text(
          "Add Insight's protection to your store or platform. Your server creates the deal; the buyer accepts the terms and pays on Insight; you get a signed event at every step. Payouts follow Insight's rules only: the buyer's confirmation, the end of the inspection period, or a written dispute decision approved by two staff members. A partner can never move money.",
          "أضف حماية إنسايت إلى متجرك أو منصتك. خادمك ينشئ الصفقة، والمشتري يوافق على الشروط ويدفع في إنسايت، ويصلك إشعار موقّع عند كل خطوة. التحويل يتم وفق قواعد إنسايت فقط: تأكيد المشتري، أو انتهاء مدة الفحص، أو قرار نزاع مكتوب يعتمده موظفان. لا يستطيع الشريك تحريك أي مبلغ.")}</p>
        <p className="mt-4 rounded-xl border border-warning/40 bg-warning-subtle p-4 text-sm leading-7">{text(
          "Test mode only for now: the payment provider is simulated and no real money moves. Live keys are issued after a review, once the payment provider is connected.",
          "وضع التجربة فقط حالياً: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية. تُصدر المفاتيح الحقيقية بعد مراجعة، عند ربط مزوّد الدفع.")}</p>

        <h2 className="mt-12 text-2xl font-bold">{text("How it works", "كيف يعمل")}</h2>
        <ol className="mt-5 space-y-4">
          {steps.map(([hEn, pEn, hAr, pAr], i) => (
            <li key={hEn} className="flex gap-4 rounded-xl border bg-card p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-bold text-primary">{i + 1}</span>
              <div><p className="font-semibold">{text(hEn, hAr)}</p><p className="mt-1 text-sm leading-7 text-muted-foreground">{text(pEn, pAr)}</p></div>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-2xl font-bold">{text("Authentication", "التحقق")}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{text(
          "Send your key in the Authorization header from your server: Authorization: Bearer ins_test_… Keys are shown once when created; Insight keeps only a fingerprint. Base URL: https://insightsettle.com/api/partner/v1. Up to 120 requests a minute per partner.",
          "أرسل مفتاحك من خادمك في ترويسة Authorization بالشكل: Bearer ins_test_… يظهر المفتاح مرة واحدة عند إنشائه، وتحتفظ إنسايت ببصمته فقط. العنوان الأساسي: https://insightsettle.com/api/partner/v1. حتى 120 طلباً في الدقيقة لكل شريك.")}</p>

        <h2 className="mt-12 text-2xl font-bold">{text("Create a deal", "إنشاء صفقة")}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{text(
          "Your account is the seller on the deal. Required: reference, title, amount and buyer.email. Optional: type (goods, services, freelance, contracting), currency (BHD by default), fee_payer, inspection_days, shipping, milestones, return_url, metadata. Repeat a request with the same Idempotency-Key and you get the same deal back, never a second one.",
          "حسابك هو البائع في الصفقة. المطلوب: reference و title و amount و buyer.email. اختياري: type (goods أو services أو freelance أو contracting)، و currency (الدينار البحريني افتراضياً)، و fee_payer، و inspection_days، و shipping، و milestones، و return_url، و metadata. إذا أعدت الطلب بنفس Idempotency-Key تحصل على الصفقة نفسها، ولا تُنشأ صفقة ثانية.")}</p>
        <Code>{CREATE}</Code>
        <Code>{RESPONSE}</Code>

        <h2 className="mt-12 text-2xl font-bold">{text("Endpoints", "نقاط الربط")}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {endpoints.map(([m, p, en, ar]) => (
                <tr key={m + p} className="border-t first:border-t-0">
                  <td className="w-16 p-3"><span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-primary">{m}</span></td>
                  <td className="p-3"><code dir="ltr" className="text-xs">{p}</code></td>
                  <td className="p-3 text-muted-foreground">{text(en, ar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{text(
          "Errors come as { \"error\": { \"code\", \"message\" } } with the matching HTTP status: 400 invalid request, 401 bad key, 404 not found, 409 not allowed now or duplicate reference, 429 too many requests.",
          "تصل الأخطاء بالشكل { \"error\": { \"code\", \"message\" } } مع رمز HTTP المناسب: 400 طلب غير صحيح، 401 مفتاح غير صالح، 404 غير موجود، 409 غير مسموح الآن أو رقم مكرر، 429 طلبات كثيرة.")}</p>

        <h2 className="mt-12 text-2xl font-bold">{text("Events (webhooks)", "الإشعارات")}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{text(
          "Insight sends a POST with a JSON body to your https address. Reply with any 2xx within 8 seconds. If not, Insight retries after 1 minute, 5 minutes, 30 minutes, 2 hours, 6 hours and 24 hours. Every event is also available from GET /events.",
          "ترسل إنسايت طلب POST بمحتوى JSON إلى عنوانك (https). ردّ بأي رمز 2xx خلال 8 ثوانٍ، وإلا تعيد إنسايت المحاولة بعد دقيقة، ثم 5 دقائق، ثم 30 دقيقة، ثم ساعتين، ثم 6 ساعات، ثم 24 ساعة. كل إشعار متاح أيضاً عبر GET /events.")}</p>
        <Code>{EVENT}</Code>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[520px] text-sm">
            <tbody>
              {events.map(([t, en, ar]) => (
                <tr key={t} className="border-t first:border-t-0"><td className="p-3"><code dir="ltr" className="text-xs">{t}</code></td><td className="p-3 text-muted-foreground">{text(en, ar)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-8 text-lg font-bold">{text("Check the signature", "تحقق من التوقيع")}</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{text(
          "Each event carries Insight-Signature: t=<time>,v1=<HMAC-SHA256 of \"<time>.<raw body>\" with your signing secret>. Reject events that fail the check or are older than 5 minutes.",
          "يحمل كل إشعار ترويسة Insight-Signature بالشكل t=<الوقت>,v1=<HMAC-SHA256 لـ \"<الوقت>.<المحتوى كما وصل>\" بمفتاح التوقيع>. ارفض أي إشعار لا يجتاز التحقق أو مضى عليه أكثر من 5 دقائق.")}</p>
        <Code>{VERIFY}</Code>

        <h2 className="mt-12 text-2xl font-bold">{text("Rules that protect both sides", "قواعد تحمي الطرفين")}</h2>
        <ul className="mt-4 list-disc space-y-2 ps-5 text-sm leading-7 text-muted-foreground">
          <li>{text("The buyer always accepts the terms and pays on Insight's own page; card details never reach the partner.", "المشتري يوافق على الشروط ويدفع دائماً في صفحة إنسايت، وبيانات البطاقة لا تصل إلى الشريك.")}</li>
          <li>{text("Only the invited email can join the deal as the buyer.", "لا ينضم للصفقة كمشترٍ إلا البريد المدعو.")}</li>
          <li>{text("The partner cannot release, refund or decide a dispute.", "لا يستطيع الشريك تحويل المبلغ أو استرداده أو الحكم في نزاع.")}</li>
          <li>{text("The fee is shown to the buyer before paying, with its tax invoice.", "تظهر الرسوم للمشتري قبل الدفع، مع فاتورتها الضريبية.")}</li>
        </ul>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild><Link to="/partner">{text("Back to Partner API", "العودة إلى واجهة الربط")}</Link></Button>
        </div>
    </div>
  );
}
