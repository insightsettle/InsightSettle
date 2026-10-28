import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Clock, PackageCheck, ShieldCheck, Truck } from "@/components/icons";
import { useEffect, useRef } from "react";
import { z } from "zod";

import { infoHead } from "@/components/site/InfoPage";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionUser } from "@/hooks/use-session";
import { getPublicDealLink, startDealFromLink } from "@/lib/deal-links.functions";
import { LINK_STATE_TEXT } from "@/lib/deal-links";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { publicPricing } from "@/lib/public-pricing.functions";
import { setReturnTo } from "@/lib/return-to";

export const Route = createFileRoute("/d/$code")({
  validateSearch: (s: Record<string, unknown>) => z.object({ start: z.coerce.number().optional() }).parse(s),
  head: () => infoHead("Deal offer", "Pay safely with Insight: the amount stays held until you receive and check what you bought."),
  component: DealLinkPage,
});

const TYPE_TEXT: Record<string, readonly [string, string]> = {
  goods: ["Goods", "بضائع"], services: ["Services", "خدمات"], freelance: ["Freelance work", "عمل حر"],
};
const PAYER_TEXT: Record<string, readonly [string, string]> = {
  buyer: ["The buyer pays Insight's fee", "المشتري يدفع رسوم إنسايت"],
  seller: ["The seller pays Insight's fee", "البائع يدفع رسوم إنسايت"],
  split: ["Insight's fee is split between both", "رسوم إنسايت مقسّمة بين الطرفين"],
};

function DealLinkPage() {
  const { code } = Route.useParams();
  const { start } = Route.useSearch();
  const { text } = useLocale();
  const navigate = useNavigate();
  const { user, loading } = useSessionUser();
  const getFn = useServerFn(getPublicDealLink);
  const startFn = useServerFn(startDealFromLink);
  const priceFn = useServerFn(publicPricing);
  const link = useQuery({ queryKey: ["deal-link", code, user?.id ?? null], queryFn: () => getFn({ data: { code, viewerId: user?.id ?? null } }), enabled: !loading });
  const l = link.data;
  const fee = useQuery({
    queryKey: ["deal-link-fee", code, l?.amount, l?.currency, l?.feePayer],
    enabled: !!l,
    queryFn: () => priceFn({ data: { amount: l!.amount, currency: l!.currency as "SAR", payer: l!.feePayer as "buyer", buyerCountry: "SA", supplierCountry: (["SA", "BH", "AE", "KW", "QA", "OM"].includes(l!.supplierCountry ?? "") ? l!.supplierCountry : "SA") as "SA" } }),
    staleTime: 60_000,
  });
  const go = useMutation({
    mutationFn: () => startFn({ data: { code } }),
    onSuccess: (r) => navigate({ to: "/deals/$dealId", params: { dealId: r.ref } }),
  });
  // Returning from sign-in with ?start=1: continue automatically, once.
  const auto = useRef(false);
  useEffect(() => {
    if (start === 1 && user && l && l.state === "open" && !l.isOwner && !auto.current) { auto.current = true; go.mutate(); }
  }, [start, user, l, go]);

  function continueToPay() {
    if (!user) {
      setReturnTo(`/d/${code}?start=1`);
      void navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    go.mutate();
  }

  const b = fee.data && fee.data.available ? fee.data.breakdown : null;
  return (
    <SiteShell>
      <section data-no-localize className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {link.isPending || loading ? <p className="text-muted-foreground">{text("Loading the offer…", "جارٍ تحميل العرض…")}</p>
        : !l ? (
          <Card><CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold">{text("This link is not valid", "هذا الرابط غير صالح")}</h1>
            <p className="mt-3 text-muted-foreground">{text("Ask the seller to send you the link again.", "اطلب من البائع أن يرسل لك الرابط مرة أخرى.")}</p>
            <Button asChild className="mt-6"><Link to="/">{text("Go to Insight", "اذهب إلى إنسايت")}</Link></Button>
          </CardContent></Card>
        ) : (
          <>
            <p className="text-sm font-semibold text-primary">{text("Deal offer", "عرض صفقة")} · {text(...(TYPE_TEXT[l.dealType] ?? TYPE_TEXT["goods"]!))}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">{l.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {text("From", "من")} <b className="text-foreground">{l.seller.name}</b>
              {l.seller.verified && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-primary"><BadgeCheck className="size-3.5" />{text("Verified identity", "هوية موثّقة")}</span>}
            </p>
            <Card className="mt-6"><CardContent className="p-6">
              <p className="text-xs text-muted-foreground">{text("Price", "السعر")}{l.quantity !== 1 ? ` · ${text("quantity", "الكمية")} ${l.quantity}` : ""}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums"><bdi>{formatMoney(l.amount, l.currency)}</bdi></p>
              {b && <p className="mt-2 text-sm text-muted-foreground">{text("You pay about", "تدفع تقريباً")} <bdi className="font-semibold text-foreground">{formatMoney(b.buyerTotal, l.currency)}</bdi> · {text(...(PAYER_TEXT[l.feePayer] ?? PAYER_TEXT["buyer"]!))}</p>}
              {l.description && <p className="mt-4 whitespace-pre-line leading-7">{l.description}</p>}
              <dl className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2"><Clock className="size-4 text-primary" /><dt className="text-muted-foreground">{text("Delivery within", "التسليم خلال")}</dt><dd className="font-medium">{l.deliveryDays} {text("days", "يوم")}</dd></div>
                <div className="flex items-center gap-2"><PackageCheck className="size-4 text-primary" /><dt className="text-muted-foreground">{text("Time to check", "مدة الفحص")}</dt><dd className="font-medium">{l.inspectionDays} {text("days", "يوم")}</dd></div>
                {l.shippingRequired && <div className="flex items-center gap-2"><Truck className="size-4 text-primary" /><dd>{text("Shipped with tracking", "شحن مع رقم تتبع")}</dd></div>}
              </dl>
              {(l.acceptanceCriteria || l.refundConditions) && (
                <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                  {l.acceptanceCriteria && <p><b>{text("Accepted when", "يُقبل عندما")}:</b> {l.acceptanceCriteria}</p>}
                  {l.refundConditions && <p><b>{text("Refund", "الاسترداد")}:</b> {l.refundConditions}</p>}
                </div>
              )}
            </CardContent></Card>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-accent/60 p-4 text-sm leading-6">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <p>{text("Your payment stays held in the deal. The seller is paid only after you receive it and the checking time ends. If there is a problem, you open a case before the money moves.",
                "يبقى مبلغك محفوظاً في الصفقة، ولا يُحوَّل للبائع إلا بعد أن تستلم وتنتهي مدة الفحص. وإن واجهت مشكلة تفتح طلباً قبل أن يتحرك المبلغ.")}</p>
            </div>

            {l.isOwner ? (
              <p className="mt-6 rounded-xl border p-4 text-sm">{text("This is your deal link. Share it with buyers; each buyer gets their own deal.", "هذا رابط صفقتك. شاركه مع المشترين، وكل مشترٍ تُنشأ له صفقة خاصة به.")} <Link to="/links" className="font-medium text-primary underline">{text("Manage your links", "إدارة روابطك")}</Link></p>
            ) : l.state !== "open" ? (
              <p role="status" className="mt-6 rounded-xl border p-4 text-center font-medium">{text(...LINK_STATE_TEXT[l.state])}</p>
            ) : (
              <>
                <Button size="lg" className="mt-6 w-full" disabled={go.isPending} onClick={continueToPay}>
                  {go.isPending ? text("Opening your deal…", "جارٍ فتح صفقتك…") : user ? text("Continue to the deal", "تابع إلى الصفقة") : text("Create an account and continue", "أنشئ حساباً وتابع")}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">{text("Nothing is paid yet. You review the terms on the next page.", "لا يُدفع شيء الآن. تراجع الشروط في الصفحة التالية.")}</p>
                {!user && <p className="mt-1 text-center text-xs"><button type="button" className="text-primary underline" onClick={() => { setReturnTo(`/d/${code}?start=1`); void navigate({ to: "/auth" }); }}>{text("I already have an account", "لدي حساب بالفعل")}</button></p>}
              </>
            )}
            {go.isError && <p role="alert" className="mt-3 text-sm text-destructive">{(go.error as Error).message}</p>}
          </>
        )}
      </section>
    </SiteShell>
  );
}
