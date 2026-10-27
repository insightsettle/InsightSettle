import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PublicPricing, publicPricingOptions } from "@/components/site/PublicPricing";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
export const Route = createFileRoute("/pricing")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicPricingOptions),
  head: () => ({ meta: [{title:"Insight pricing | رسوم صفقات الخليج"},{name:"description",content:"A fee calculator for Gulf deals: the exact fee, each party's share and VAT by country, before you pay. Provisional demo pricing."},{property:"og:title",content:"Insight | Clear deal fees"},{property:"og:description",content:"Calculate the exact fee, buyer and supplier fee shares and country-based VAT."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: PricingPage,
});
function PricingPage() {
  const { text } = useLocale();
  return <SiteShell><div data-no-localize className="reveal mx-auto max-w-7xl px-5 py-12 sm:py-16"><p className="text-sm font-medium text-primary">{text("Provisional demo pricing","تسعير تجريبي مؤقت")}</p><h1 className="mt-4 text-4xl leading-normal font-bold">{text("Clear fees before you pay","رسوم واضحة قبل أن تدفع")}</h1><p className="mt-4 mb-10 max-w-2xl text-base leading-8 text-muted-foreground">{text("Creating a deal is free; the fee is charged only when you pay. Choose who pays it and each party's country to see the fee shares and VAT.","إنشاء الصفقة مجاني، وتُحتسب الرسوم عند الدفع فقط. اختر من يدفعها وبلد كل طرف لترى حصص الرسوم والضريبة.")}</p><PublicPricing /><div className="mt-10 flex flex-wrap gap-3"><Button asChild><Link to="/auth" search={{mode:"signup"}}>{text("Start your first deal","ابدأ صفقتك الأولى")}</Link></Button><Button asChild variant="secondary"><Link to="/how-it-works">{text("How it works","كيف تعمل؟")}</Link></Button></div></div></SiteShell>;
}
