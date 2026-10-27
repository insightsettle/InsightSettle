import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Plus } from "lucide-react";
import { useState } from "react";

import { ShareLink } from "@/components/share/ShareLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDealLink, listMyDealLinks, setDealLinkActive } from "@/lib/deal-links.functions";
import { dealLinkUrl, LINK_STATE_TEXT, shareText, type DealLinkInput } from "@/lib/deal-links";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { ListSkeleton } from "@/components/motion/Motion";

export const Route = createFileRoute("/_authenticated/links")({
  head: () => ({ meta: [{ title: "Deal links | Insight" }, { name: "description", content: "Create a link for your offer and share it with buyers." }] }),
  component: LinksPage,
});

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function LinksPage() {
  const { text, locale } = useLocale();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyDealLinks);
  const createFn = useServerFn(createDealLink);
  const activeFn = useServerFn(setDealLinkActive);
  const links = useQuery({ queryKey: ["my-deal-links"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ dealType: "goods", title: "", description: "", amount: "", currency: "SAR", feePayer: "buyer", inspectionDays: "3", deliveryDays: "7", shippingRequired: true, maxUses: "", expiresInDays: "30", acceptanceCriteria: "", refundConditions: "" });
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const create = useMutation({
    meta: { successToast: text("Your deal link is ready to share.", "رابط صفقتك جاهز للمشاركة.") },
    mutationFn: () => createFn({ data: {
      dealType: f.dealType as DealLinkInput["dealType"], title: f.title, description: f.description, amount: Number(f.amount), currency: f.currency as "SAR",
      feePayer: f.feePayer as "buyer", inspectionDays: Number(f.inspectionDays) || 3, deliveryDays: Number(f.deliveryDays) || 7,
      shippingRequired: f.dealType === "goods" && f.shippingRequired, shippingResponsibility: f.dealType === "goods" && f.shippingRequired ? "seller" : "none",
      maxUses: f.maxUses ? Number(f.maxUses) : null, expiresInDays: f.expiresInDays ? Number(f.expiresInDays) : null,
      acceptanceCriteria: f.acceptanceCriteria, refundConditions: f.refundConditions,
    } }),
    onSuccess: () => { setOpen(false); setF((p) => ({ ...p, title: "", description: "", amount: "" })); void qc.invalidateQueries({ queryKey: ["my-deal-links"] }); },
  });
  const toggle = useMutation({ meta: { successToast: text("Link updated.", "حُدّث الرابط.") }, mutationFn: (v: { id: string; active: boolean }) => activeFn({ data: v }), onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-deal-links"] }) });
  const origin = typeof window === "undefined" ? "https://insightsettle.com" : window.location.origin;

  return (
    <div data-no-localize className="reveal min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{text("Deal links", "روابط الصفقات")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{text("Selling on Instagram, WhatsApp or a listing site? Create a link for your offer once and share it. Each buyer who opens it gets their own deal, and pays into the deal, not to you directly.",
            "تبيع عبر إنستغرام أو واتساب أو مواقع الإعلانات؟ أنشئ رابطاً لعرضك مرة واحدة وشاركه. كل مشترٍ يفتحه تُنشأ له صفقة خاصة، ويدفع في الصفقة لا لك مباشرة.")}</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}><Plus className="size-4" />{text("New deal link", "رابط صفقة جديد")}</Button>
      </div>

      {open && (
        <Card className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300"><CardContent className="space-y-4 p-6">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="dl-type">{text("What are you offering?", "ما الذي تعرضه؟")}</Label>
                <select id="dl-type" className={sel} value={f.dealType} onChange={(e) => set("dealType", e.target.value)}>
                  <option value="goods">{text("Goods (shipped or handed over)", "بضائع (شحن أو تسليم)")}</option>
                  <option value="services">{text("A service", "خدمة")}</option>
                  <option value="freelance">{text("Freelance or digital work", "عمل حر أو رقمي")}</option>
                </select></div>
              <div className="space-y-2"><Label htmlFor="dl-title">{text("Title", "العنوان")}</Label>
                <Input id="dl-title" required minLength={3} maxLength={200} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={text("e.g. iPhone 15 Pro, 256 GB, used", "مثال: آيفون 15 برو 256 جيجا مستعمل")} /></div>
              <div className="space-y-2"><Label htmlFor="dl-amount">{text("Price", "السعر")}</Label>
                <div className="flex gap-2"><Input id="dl-amount" required type="number" min="1" step="0.001" inputMode="decimal" dir="ltr" value={f.amount} onChange={(e) => set("amount", e.target.value)} />
                  <select aria-label={text("Currency", "العملة")} className={`${sel} w-28`} value={f.currency} onChange={(e) => set("currency", e.target.value)}>{["SAR", "BHD", "AED", "KWD", "QAR", "OMR", "USD"].map((c) => <option key={c}>{c}</option>)}</select></div></div>
              <div className="space-y-2"><Label htmlFor="dl-fee">{text("Who pays Insight's fee", "من يدفع رسوم إنسايت")}</Label>
                <select id="dl-fee" className={sel} value={f.feePayer} onChange={(e) => set("feePayer", e.target.value)}>
                  <option value="buyer">{text("The buyer", "المشتري")}</option><option value="seller">{text("Me (the seller)", "أنا (البائع)")}</option><option value="split">{text("Split", "مناصفة")}</option>
                </select></div>
              <div className="space-y-2"><Label htmlFor="dl-delivery">{text("Delivery within (days)", "التسليم خلال (أيام)")}</Label><Input id="dl-delivery" type="number" min="1" max="180" dir="ltr" value={f.deliveryDays} onChange={(e) => set("deliveryDays", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="dl-inspect">{text("Time for the buyer to check (days)", "مدة فحص المشتري (أيام)")}</Label><Input id="dl-inspect" type="number" min="1" max="30" dir="ltr" value={f.inspectionDays} onChange={(e) => set("inspectionDays", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="dl-max">{text("How many buyers (optional)", "عدد المشترين (اختياري)")}</Label><Input id="dl-max" type="number" min="1" dir="ltr" placeholder={text("No limit", "بلا حد")} value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="dl-exp">{text("Link valid for (days)", "صلاحية الرابط (أيام)")}</Label><Input id="dl-exp" type="number" min="1" max="365" dir="ltr" value={f.expiresInDays} onChange={(e) => set("expiresInDays", e.target.value)} /></div>
            </div>
            {f.dealType === "goods" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.shippingRequired} onChange={(e) => set("shippingRequired", e.target.checked)} />{text("I ship it with a tracking number", "أشحنه برقم تتبع")}</label>}
            <div className="space-y-2"><Label htmlFor="dl-desc">{text("Description", "الوصف")}</Label><Textarea id="dl-desc" rows={3} maxLength={3000} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={text("Condition, what is included, colour…", "الحالة، ما يشمله، اللون…")} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="dl-acc">{text("Accepted when (optional)", "يُقبل عندما (اختياري)")}</Label><Textarea id="dl-acc" rows={2} maxLength={3000} value={f.acceptanceCriteria} onChange={(e) => set("acceptanceCriteria", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="dl-ref">{text("Refund if (optional)", "الاسترداد إذا (اختياري)")}</Label><Textarea id="dl-ref" rows={2} maxLength={3000} value={f.refundConditions} onChange={(e) => set("refundConditions", e.target.value)} /></div>
            </div>
            {create.isError && <p role="alert" className="text-sm text-destructive">{(create.error as Error).message}</p>}
            <div className="flex gap-2"><Button type="submit" disabled={create.isPending}>{create.isPending ? text("Creating…", "جارٍ الإنشاء…") : text("Create link", "أنشئ الرابط")}</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{text("Cancel", "إلغاء")}</Button></div>
          </form>
        </CardContent></Card>
      )}

      <div className="mt-6 space-y-4">
        {links.isPending ? <ListSkeleton label={text("Loading…", "جارٍ التحميل…")} />
        : links.isError ? <p role="alert" className="text-destructive">{text("Your links could not be loaded.", "تعذّر تحميل روابطك.")}</p>
        : (links.data ?? []).length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Link2 className="size-8 text-primary" />
            <p className="font-medium">{text("No deal links yet", "لا توجد روابط بعد")}</p>
            <p className="max-w-md text-sm text-muted-foreground">{text("Create one for something you sell, then paste it in your Instagram bio or send it on WhatsApp.", "أنشئ رابطاً لشيء تبيعه، ثم ضعه في حسابك على إنستغرام أو أرسله عبر واتساب.")}</p>
          </CardContent></Card>
        ) : (links.data ?? []).map((l) => {
          const url = dealLinkUrl(origin, l.code);
          const amountText = formatMoney(l.amount, l.currency);
          return (
            <Card key={l.id} className="lift"><CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{l.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground"><bdi>{amountText}</bdi> · {text(...LINK_STATE_TEXT[l.state])} · {text(`${l.dealsStarted} deal(s) started, ${l.dealsPaid} paid`, `${l.dealsStarted} صفقة بدأت، ${l.dealsPaid} مدفوعة`)}{l.maxUses ? ` · ${l.uses}/${l.maxUses}` : ""}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground" dir="ltr">{url}</p>
                </div>
                <Button size="sm" variant="outline" disabled={toggle.isPending || l.state === "expired"} onClick={() => toggle.mutate({ id: l.id, active: l.state === "paused" })}>
                  {l.state === "paused" ? text("Resume", "استئناف") : text("Pause", "إيقاف مؤقت")}
                </Button>
              </div>
              {l.state === "open" && <div className="mt-4"><ShareLink compact url={url} message={shareText(locale === "en" ? "en" : "ar", l.title, amountText, url)} /></div>}
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}
