import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRightLeft, Check, CircleDollarSign, Layers3, Scale } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatSAR } from "@/lib/demo-data";
import { PublicPricing, publicPricingOptions } from "@/components/site/PublicPricing";
import { useLocale } from "@/lib/locale";


export const Route = createFileRoute("/services")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicPricingOptions),
  head: () => ({
    meta: [
      { title: "Services, fees, and currency conversion | Insight" },
      {
        name: "description",
        content:
          "Explore Insight escrow services, tiered transaction fees, and transparent currency conversion spreads.",
      },
      { property: "og:title", content: "Insight services and fees" },
      {
        property: "og:description",
        content: "Tiered escrow fees and transparent currency conversion.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});
const services = [
  {
    icon: CircleDollarSign,
    t: "Single-payment escrow",
    d: "Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.",
    points: ["Full-value protection", "Defined review window", "Receipt and invoice"],
  },
  {
    icon: Scale,
    t: "Dispute mediation",
    d: "Structured evidence review and a recorded decision under platform policy.",
    points: ["AI-assisted triage", "Response period", "Documented outcome"],
  },
  {
    icon: ArrowRightLeft,
    t: "Cross-border payments",
    d: "At launch, a licensed payment provider will handle cross-border payments; Insight records the deal and the rate shown before funding.",
    points: ["One clear rate before funding", "Riyal total fixed at funding", "Settlement summary"],
  },
];
function Page() {
  const { text } = useLocale();
  return (
    <SiteShell>
      <div data-no-localize className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm font-semibold text-primary">{text("SERVICES & FEES")}</p>
        <h1 className="mt-2 text-4xl font-extrabold">{text("Transparent pricing, before you fund.")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{text("Insight charges a tiered transaction fee. Cross-border deals are converted at the rate shown before you fund, and mediation has no separate fee.")}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {services.map((s) => (
            <Card key={text(s.t)}>
              <CardContent className="p-6">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <s.icon />
                </span>
                <h2 className="mt-4 text-lg font-bold">{text(s.t)}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{text(s.d)}</p>
                <ul className="mt-4 space-y-2">
                  {s.points.map((p) => (
                    <li key={text(p)} className="flex gap-2 text-sm">
                      <Check className="size-4 text-primary" />
                      {text(p)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-16"><PublicPricing /><Button asChild className="mt-6"><Link to="/auth" search={{ mode: "signup" }}>{text("Create a deal", "أنشئ صفقة")}</Link></Button></div>
      </div>
    </SiteShell>
  );
}