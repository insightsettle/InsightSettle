import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { CheckCircle2, Copy, Info, KeyRound, ShieldCheck, Trash2 } from "@/components/icons";
import { PageSkeleton } from "@/components/motion/Motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/locale";
import {
  createPartnerKey, enablePartner, getPartnerPortal, revokePartnerKey, rotateWebhookSecret, sendPartnerTestEvent, setPartnerWebhook,
} from "@/lib/partner-portal.functions";

export const Route = createFileRoute("/_authenticated/partner")({
  head: () => ({ meta: [{ title: "Partner API | Insight" }, { name: "description", content: "Connect your own system to Insight: API keys, webhooks and events." }] }),
  component: PartnerPage,
});

function Secret({ label, value, note }: { label: string; value: string; note: string }) {
  const { text } = useLocale();
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="mt-4 rounded-xl border border-warning/40 bg-warning-subtle p-4">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code dir="ltr" className="min-w-0 flex-1 break-all rounded-lg bg-card px-3 py-2 text-xs">{value}</code>
        <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(value); setCopied(true); }}>
          {copied ? <CheckCircle2 /> : <Copy />}{copied ? text("Copied", "تم النسخ") : text("Copy", "نسخ")}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function PartnerPage() {
  const { text, locale } = useLocale();
  const qc = useQueryClient();
  const getFn = useServerFn(getPartnerPortal);
  const enableFn = useServerFn(enablePartner);
  const keyFn = useServerFn(createPartnerKey);
  const revokeFn = useServerFn(revokePartnerKey);
  const hookFn = useServerFn(setPartnerWebhook);
  const rotateFn = useServerFn(rotateWebhookSecret);
  const testFn = useServerFn(sendPartnerTestEvent);
  const q = useQuery({ queryKey: ["partner-portal"], queryFn: () => getFn() });
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString(locale === "ar" ? "ar-BH" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true); setMsg(null);
    try { await fn(); if (done) setMsg({ ok: true, text: done }); await qc.invalidateQueries({ queryKey: ["partner-portal"] }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? text(e.message) : text("Something went wrong.", "حدث خطأ.") }); }
    finally { setBusy(false); }
  }
  const d = q.data;
  const activeKeys = (d?.keys ?? []).filter((k: any) => !k.revoked_at);
  const hookValue = url ?? d?.partner?.webhook_url ?? "";

  return (
    <div data-no-localize className="reveal min-w-0 max-w-4xl">
      <h1 className="text-3xl font-bold">{text("Partner API", "واجهة الربط للشركاء")}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{text(
        "Connect your store or platform to Insight. Your system creates the deal, your customer accepts the terms and pays on Insight, and you receive an event at every step. Payouts follow Insight's rules only.",
        "اربط متجرك أو منصتك بإنسايت. نظامك ينشئ الصفقة، وعميلك يوافق على الشروط ويدفع في صفحة إنسايت، وتصلك إشعارات بكل خطوة. تحويل المبالغ يتم وفق قواعد إنسايت فقط.")}{" "}
        <Link to="/developers" className="font-semibold text-primary">{text("Read the API guide", "اقرأ دليل الربط")}</Link></p>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-4 text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}

      {q.isPending ? <PageSkeleton label={text("Loading…", "جارٍ التحميل…")} />
      : q.isError || !d ? <p role="alert" className="mt-6 text-destructive">{text("This page could not be loaded.", "تعذّر تحميل الصفحة.")}</p>
      : !d.partner ? (
        <Card className="mt-6"><CardContent className="p-6">
          <h2 className="text-lg font-semibold">{text("Turn on the partner API", "فعّل واجهة الربط")}</h2>
          {d.eligible ? <>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{text("Your business name is shown to buyers on deals your system creates.", "يظهر اسم نشاطك للمشترين في الصفقات التي ينشئها نظامك.")}</p>
            <div className="mt-4 grid max-w-md gap-2"><Label htmlFor="pa-name">{text("Business name", "اسم النشاط")}</Label><Input id="pa-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <Button className="mt-4" disabled={busy || name.trim().length < 2} onClick={() => run(async () => { const r = await enableFn({ data: { name } }); setSecret(r.webhookSecret); })}>{text("Turn on", "تفعيل")}</Button>
          </> : <p className="mt-2 text-sm leading-7 text-muted-foreground">{text("The partner API is for verified business accounts. Complete your business verification, then come back here.", "واجهة الربط لحسابات الأعمال الموثّقة. أكمل توثيق نشاطك ثم عد إلى هذه الصفحة.")}{" "}
            <Link to="/verification" className="font-semibold text-primary">{text("Account & verification")}</Link></p>}
        </CardContent></Card>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-start gap-3 rounded-2xl border bg-accent/40 p-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 leading-7">{text("Test mode: the payment provider is simulated and no real money moves. Live keys are issued after a review, once the payment provider is connected.",
              "وضع التجربة: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية. تُصدر المفاتيح الحقيقية بعد مراجعة، عند ربط مزوّد الدفع.")}</p>
            <span className="rounded-full bg-card px-3 py-1 text-xs">{d.partner.name} · {d.deals} {text("deals", "صفقة")}</span>
          </div>

          <Card><CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="size-5 text-primary" />{text("API keys", "مفاتيح الربط")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text("Keep keys on your server only. Never put them in a website or an app.", "احفظ المفاتيح في خادمك فقط، ولا تضعها في موقع أو تطبيق.")}</p>
            {newKey && <Secret label={text("Your new test key", "مفتاح التجربة الجديد")} value={newKey} note={text("Copy it now. Insight keeps only a fingerprint of it and cannot show it again.", "انسخه الآن. تحتفظ إنسايت ببصمته فقط ولا تستطيع عرضه مرة أخرى.")} />}
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div className="grid gap-2"><Label htmlFor="pa-label">{text("Label (optional)", "اسم المفتاح (اختياري)")}</Label><Input id="pa-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={text("e.g. Store server", "مثلاً: خادم المتجر")} /></div>
              <Button disabled={busy || activeKeys.length >= 5} onClick={() => run(async () => { const r = await keyFn({ data: label ? { label } : {} }); setNewKey(r.key); setLabel(""); })}>{text("Create test key", "إنشاء مفتاح تجربة")}</Button>
            </div>
            <ul className="mt-5 divide-y rounded-xl border">
              {d.keys.length === 0 && <li className="p-4 text-sm text-muted-foreground">{text("No keys yet.", "لا توجد مفاتيح بعد.")}</li>}
              {d.keys.map((k: any) => (
                <li key={k.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                  <code dir="ltr" className="rounded bg-muted px-2 py-1 text-xs">{k.prefix}…</code>
                  <span className="min-w-0 flex-1">{k.label || text("Test key", "مفتاح تجربة")}<span className="block text-xs text-muted-foreground">{text("Created", "أُنشئ")} {fmt(k.created_at)} · {text("Last used", "آخر استخدام")} {fmt(k.last_used_at)}</span></span>
                  {k.revoked_at ? <span className="text-xs text-muted-foreground">{text("Revoked", "مُلغى")}</span>
                    : <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => revokeFn({ data: { id: k.id } }), text("Key revoked.", "أُلغي المفتاح."))}><Trash2 />{text("Revoke", "إلغاء")}</Button>}
                </li>
              ))}
            </ul>
          </CardContent></Card>

          <Card><CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-primary" />{text("Webhook", "عنوان الإشعارات")}</h2>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">{text("Insight sends a signed event to this address at every step of your deals: buyer joined, paid, shipped, delivered, released, disputed, refunded.",
              "ترسل إنسايت إشعاراً موقّعاً إلى هذا العنوان عند كل خطوة في صفقاتك: انضمام المشتري، الدفع، الشحن، التسليم، التحويل، النزاع، الاسترداد.")}</p>
            {secret && <Secret label={text("Your webhook signing secret", "مفتاح توقيع الإشعارات")} value={secret} note={text("Copy it now and keep it on your server. Use it to check the Insight-Signature header of every event.", "انسخه الآن واحفظه في خادمك. استخدمه للتحقق من ترويسة Insight-Signature في كل إشعار.")} />}
            <div className="mt-4 grid gap-2"><Label htmlFor="pa-hook">{text("Webhook address (https)", "عنوان الإشعارات (https)")}</Label>
              <Input id="pa-hook" dir="ltr" value={hookValue} onChange={(e) => setUrl(e.target.value)} placeholder="https://shop.example.com/insight/webhooks" /></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => run(() => hookFn({ data: { url: hookValue.trim() || null } }), text("Webhook address saved.", "حُفظ عنوان الإشعارات."))}>{text("Save", "حفظ")}</Button>
              <Button variant="outline" disabled={busy || !d.partner.webhook_url} onClick={() => run(async () => { const r = await testFn(); setMsg({ ok: r.delivered > 0, text: r.delivered > 0 ? text("Test event delivered.", "وصل الإشعار التجريبي.") : text("The test event did not reach your address. Insight will retry.", "لم يصل الإشعار التجريبي إلى عنوانك. ستعيد إنسايت المحاولة.") }); })}>{text("Send test event", "إرسال إشعار تجريبي")}</Button>
              <Button variant="ghost" disabled={busy} onClick={() => run(async () => { const r = await rotateFn(); setSecret(r.webhookSecret); })}>{text("New signing secret", "مفتاح توقيع جديد")}</Button>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-6">
            <h2 className="text-lg font-semibold">{text("Recent events", "آخر الإشعارات")}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-xs text-muted-foreground"><tr><th className="p-2 text-start">{text("Event", "الإشعار")}</th><th className="p-2 text-start">{text("Deal", "الصفقة")}</th><th className="p-2 text-start">{text("Delivery", "الإرسال")}</th><th className="p-2 text-start">{text("Time", "الوقت")}</th></tr></thead>
                <tbody>
                  {d.events.length === 0 && <tr><td colSpan={4} className="p-3 text-muted-foreground">{text("No events yet.", "لا توجد إشعارات بعد.")}</td></tr>}
                  {d.events.map((e: any) => (
                    <tr key={e.id} className="border-t">
                      <td className="p-2"><code dir="ltr" className="text-xs">{e.type}</code></td>
                      <td className="p-2"><bdi>{e.ref ?? "—"}</bdi></td>
                      <td className="p-2">{e.status === "delivered" ? text("Delivered", "وصل") : e.status === "failed" ? text("Failed", "فشل") : e.status === "skipped" ? text("No address", "بلا عنوان") : text("Pending", "قيد الإرسال")}{e.last_status ? <span className="text-xs text-muted-foreground"> · HTTP {e.last_status}</span> : null}</td>
                      <td className="p-2 text-xs text-muted-foreground">{fmt(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
