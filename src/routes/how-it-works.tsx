import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DealStatus } from "@/lib/demo-data";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Insight works | Secure escrow steps" },
      {
        name: "description",
        content:
          "Follow an Insight deal from account verification and funding through delivery, release, refund, or dispute.",
      },
      { property: "og:title", content: "How Insight works" },
      { property: "og:description", content: "Seven clear steps from agreement to settlement." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});
const steps = [
  {
    t: "Create and verify your account",
    d: "Confirm your email and phone. Identity checks apply when required.",
  },
  {
    t: "Define the deal",
    d: "Set the scope, value, currency, parties, delivery window, and release conditions.",
  },
  {
    t: "Invite the other party",
    d: "Send a secure, time-limited invitation for review and acceptance.",
  },
  {
    t: "Fund the agreement",
    d: "Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.",
  },
  { t: "Deliver the work", d: "The seller confirms delivery with notes and supporting files." },
  {
    t: "Review the delivery",
    d: "The buyer accepts, requests changes, or opens a dispute during the review window.",
  },
  {
    t: "Release or refund",
    d: "The payment provider (simulated in this demo) releases or refunds the funds; Insight keeps the receipt and the complete timeline.",
  },
];
const statuses: DealStatus[] = [
  "pending_funding",
  "held",
  "delivered",
  "under_review",
  "released",
  "refunded",
  "disputed",
];
const desc: Partial<Record<DealStatus, string>> = {
  pending_funding: "The agreement is ready but has not been funded.",
  held: "The funds are held with the payment provider (simulated in this demo) and work can begin.",
  delivered: "The seller marked the work as delivered.",
  under_review: "The buyer is reviewing the submitted work.",
  released: "The payment provider released the funds to the seller.",
  refunded: "The payment provider returned the funds under the refund policy.",
  disputed: "The deal is paused for mediation.",
};
function Page() {
  const { text } = useLocale();
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm font-semibold text-primary">THE ESCROW JOURNEY</p>
        <h1 className="mt-2 text-4xl font-extrabold">From agreement to settlement</h1>
        <p className="mt-3 text-muted-foreground">
          The platform supports SAR, BHD, AED, QAR, KWD, OMR and USD. In Bahrain and Saudi Arabia, funds are to be held by payment providers licensed by the Central Bank of Bahrain (CBB) and the Saudi Central Bank (SAMA), respectively. Insight runs the deal rules and keeps the record; Insight is not licensed, regulated or approved by either central bank.
        </p>
        <ol className="mt-10 space-y-4">
          {steps.map((s, i) => (
            <li key={s.t}>
              <Card className="shadow-sm">
                <CardContent className="flex gap-4 p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="font-bold">{s.t}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
        <h2 className="mt-16 text-2xl font-extrabold">Deal statuses</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {statuses.map((s) => (
            <Card key={s}>
              <CardContent className="p-5">
                <StatusBadge status={s} />
                <p className="mt-3 text-sm text-muted-foreground">{desc[s]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <section id="contracting" className="mt-12 scroll-mt-24 border-t border-border pt-8">
          <h2 className="text-2xl font-semibold">{text("Contracting", "المقاولات")}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{text("2–20 milestones, advance up to 20%, retention and a defects period.", "من 2 إلى 20 مرحلة، دفعة مقدّمة حتى 20%، واحتفاظ وفترة ضمان عيوب.")}</p>
        </section>
        <section id="auctions" className="mt-12 scroll-mt-24 border-t border-border pt-8">
          <h2 className="text-2xl font-semibold">{text("Auctions", "المزادات")}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{text("Live auctions: the winner gets a payment link with a 24-hour deadline. If they don't pay, the offer passes to the backup bidder automatically. After inspection, the provider pays the item owner and the organiser separately. Available in the demo; payments are simulated.", "المزادات المباشرة: يحصل الفائز على رابط دفع بمهلة 24 ساعة، وإن لم يدفع ينتقل العرض تلقائياً إلى المزايد الاحتياطي. بعد الفحص يصرف مزوّد الدفع لمالك القطعة وللمنظّم كلٌّ على حدة. متاحة في النسخة التجريبية، والدفع فيها محاكى.")}</p>
        </section>
        <div className="mt-10 flex gap-3">
          <Button asChild>
            <Link to="/services">Review fees</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Explore dashboard</Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
