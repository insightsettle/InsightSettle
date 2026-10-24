import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { readPlatformSettings, savePlatformSettings } from "@/lib/platform.functions";
import { type PlatformSettings } from "@/lib/platform-switches";
import { useLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/console/platform")({
  head: () => ({ meta: [
    { title: "Platform settings | Insight staff console" },
    { name: "description", content: "Admin switches for new deals and auctions, and the site-wide notice." },
    { property: "og:title", content: "Platform settings | Insight" },
    { property: "og:description", content: "Audited platform switches and site notice." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PlatformPage,
});

function PlatformPage() {
  const { text } = useLocale();
  const load = useServerFn(readPlatformSettings);
  const q = useQuery({ queryKey: ["platform-settings-admin"], queryFn: () => load(), retry: false });
  if (q.isPending) return <p className="mt-6">{text("Loading…", "جارٍ التحميل…")}</p>;
  if (q.isError || !q.data) return <p role="alert" className="mt-6 text-destructive">{text("Admin access required", "يتطلب صلاحية مدير")}</p>;
  const { updated_at, ...initial } = q.data;
  return (
    <div data-no-localize className="mt-6 min-w-0 max-w-3xl">
      <h2 className="text-2xl font-bold">{text("Platform settings", "إعدادات المنصة")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text("Last change:", "آخر تعديل:")} <bdi dir="ltr">{new Date(updated_at).toLocaleString()}</bdi></p>
      <SettingsForm key={JSON.stringify(initial)} initial={initial} />
    </div>
  );
}

function Switch({ id, checked, onChange, en, ar, hintEn, hintAr }: { id: string; checked: boolean; onChange: (v: boolean) => void; en: string; ar: string; hintEn: string; hintAr: string }) {
  const { text } = useLocale();
  return (
    <label htmlFor={id} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-4">
      <input id={id} type="checkbox" className="mt-1 size-4 shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="min-w-0">
        <span className="block font-medium">{text(en, ar)}</span>
        <span className="mt-1 block text-xs leading-6 text-muted-foreground">{text(hintEn, hintAr)}</span>
      </span>
    </label>
  );
}

function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const { text } = useLocale();
  const qc = useQueryClient();
  const save = useServerFn(savePlatformSettings);
  const [s, setS] = useState<PlatformSettings>(initial);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => save({ data: { settings: s, reason } }),
    onSuccess: () => { setReason(""); qc.invalidateQueries({ queryKey: ["platform-settings-admin"] }); qc.invalidateQueries({ queryKey: ["platform-switches"] }); },
  });
  const noticeMissing = s.notice_active && (!s.notice_en.trim() || !s.notice_ar.trim());
  return (
    <form className="mt-6 space-y-6" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{text("Services", "الخدمات")}</h3>
        <Switch id="new-deals" checked={s.new_deals_enabled} onChange={(v) => setS({ ...s, new_deals_enabled: v })}
          en="Customers can create new deals" ar="يستطيع العملاء إنشاء صفقات جديدة"
          hintEn="Turn off to pause new deals (e.g. maintenance). Existing deals, payments and disputes continue normally."
          hintAr="أوقفه لإيقاف الصفقات الجديدة مؤقتاً (مثل الصيانة). الصفقات القائمة والمدفوعات والنزاعات تستمر كالمعتاد." />
        <Switch id="auctions" checked={s.auctions_enabled} onChange={(v) => setS({ ...s, auctions_enabled: v })}
          en="Organisers can create new auctions" ar="يستطيع المنظّمون إنشاء مزادات جديدة"
          hintEn="Turn off to pause new auctions. Open auctions and their lots continue."
          hintAr="أوقفه لإيقاف المزادات الجديدة مؤقتاً. المزادات المفتوحة وقطعها تستمر." />
      </section>
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{text("Site-wide notice", "تنبيه عام في الموقع")}</h3>
        <Switch id="notice-active" checked={s.notice_active} onChange={(v) => setS({ ...s, notice_active: v })}
          en="Show the notice on every page" ar="أظهر التنبيه في كل الصفحات"
          hintEn="Shown at the top of the public site and the customer area, in the visitor's language."
          hintAr="يظهر أعلى الموقع العام ومنطقة العميل بلغة الزائر." />
        <div className="space-y-2">
          <Label htmlFor="notice-tone">{text("Style", "النوع")}</Label>
          <select id="notice-tone" value={s.notice_tone} onChange={(e) => setS({ ...s, notice_tone: e.target.value as PlatformSettings["notice_tone"] })} className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm">
            <option value="info">{text("Information", "معلومة")}</option>
            <option value="warning">{text("Warning", "تحذير")}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notice-ar">{text("Arabic text", "النص بالعربية")}</Label>
          <Input id="notice-ar" dir="rtl" maxLength={300} value={s.notice_ar} onChange={(e) => setS({ ...s, notice_ar: e.target.value })} placeholder="مثال: صيانة مجدولة الليلة من 1 إلى 2 صباحاً" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notice-en">{text("English text", "النص بالإنجليزية")}</Label>
          <Input id="notice-en" dir="ltr" maxLength={300} value={s.notice_en} onChange={(e) => setS({ ...s, notice_en: e.target.value })} placeholder="e.g. Scheduled maintenance tonight 1–2 am" />
        </div>
        {noticeMissing && <p className="text-sm text-destructive">{text("Write the notice in both languages before showing it.", "اكتب التنبيه باللغتين قبل إظهاره.")}</p>}
      </section>
      <div className="space-y-2">
        <Label htmlFor="platform-reason">{text("Reason for the change (saved in staff history)", "سبب التعديل (يُحفظ في سجل الموظفين)")}</Label>
        <Textarea id="platform-reason" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {m.isError && <p role="alert" className="text-sm text-destructive">{(m.error as Error).message}</p>}
      {m.isSuccess && <p role="status" className="text-sm text-primary">{text("Saved.", "تم الحفظ.")}</p>}
      <Button type="submit" disabled={m.isPending || noticeMissing || reason.trim().length < 3}>{text("Save settings", "حفظ الإعدادات")}</Button>
    </form>
  );
}
