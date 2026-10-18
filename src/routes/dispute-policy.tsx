import { useLocale } from "@/lib/locale";
import { Link, createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/dispute-policy")({
  head: () => ({
    meta: [
      { title: "Disputes & refunds policy | Insight" },
      {
        name: "description",
        content:
          "How Insight reviews dispute evidence and records decisions, with releases and refunds handled by the payment provider.",
      },
      { property: "og:title", content: "Insight disputes and refunds policy" },
      { property: "og:description", content: "A clear path from disagreement to decision." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisputePolicyPage,
});

const steps = [
  {
    h: "1. Raise the case",
    p: "Either party can open a dispute from the deal page while the funds are still held. The reason is recorded and both sides are notified immediately. The money stays locked until the case closes.",
  },
  {
    h: "2. Evidence window",
    p: "Both parties upload evidence — files, screenshots, delivery proof, shipping tracking — and answer Insight's questions inside the deal conversation.",
  },
  {
    h: "3. Insight review",
    p: "Insight reviews the case within the review window published in the dispute centre (3 days by default) and proposes an outcome: release, full refund, or a partial settlement split between the parties.",
  },
  {
    h: "4. Decision and payout",
    p: "The payment provider handles the release or refund under the recorded decision. Insight keeps the amount, reason and reference in the deal record, visible to both parties.",
  },
];

function DisputePolicyPage() {
  const { text } = useLocale();
  return (
    <SiteShell>
      <div data-no-localize className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-4xl font-extrabold">{text("Disputes & refunds")}</h1>
        <p className="mt-3 text-muted-foreground">{text("Held funds are never released while a dispute is open. This is the exact path a case follows.")}</p>

        <div className="mt-8 space-y-7">
          {steps.map((s) => (
            <section key={text(s.h)}>
              <h2 className="text-lg font-bold">{text(s.h)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text(s.p)}</p>
            </section>
          ))}
        </div>

        <Card className="mt-10">
          <CardContent className="p-6">
            <h2 className="font-bold">{text("Refund types")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <b className="text-foreground">{text("Full refund")}</b>{text("— the buyer receives the funded amount back when delivery did not happen or was materially different from the terms.")}</li>
              <li>
                <b className="text-foreground">{text("Partial refund")}</b>{text("— the parties agree, or Insight decides, a split of the held amount; the rest is released to the seller.")}</li>
              <li>
                <b className="text-foreground">{text("Cancellation before delivery")}</b>{text("— if both sides cancel before delivery, the funded amount is returned.")}</li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/help">{text("Visit the help centre")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/terms">{text("Read the terms")}</Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
