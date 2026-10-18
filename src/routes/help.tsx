import { useLocale } from "@/lib/locale";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help centre | Insight" },
      {
        name: "description",
        content:
          "Answers about funding, inspection periods, releasing funds, refunds, disputes and verification on Insight.",
      },
      { property: "og:title", content: "Insight help centre" },
      { property: "og:description", content: "How escrow works, step by step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpPage,
});

const faqs = [
  {
    q: "How does an Insight deal work?",
    a: "One party creates the deal with the value, terms, inspection period and who pays the fee, then shares a secure invitation link. The other party reviews and accepts the terms, the buyer funds the deal, the seller delivers, and the funds are released once the buyer accepts or the inspection period ends.",
  },
  {
    q: "When is my money safe?",
    a: "Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.",
  },
  {
    q: "What is the inspection period?",
    a: "A number of days, agreed when the deal is created, that starts when the seller confirms delivery. During it the buyer can accept, ask for a revision, or open a dispute. If the buyer does nothing, the funds release automatically.",
  },
  {
    q: "How do refunds work?",
    a: "A deal can be refunded in full or in part. Both sides can agree a partial settlement, or Insight can decide the split when a case is escalated. Every refund appears in the payment records of the deal.",
  },
  {
    q: "What happens in a dispute?",
    a: "Insight reviews both sides' evidence under the dispute policy and records the decision, approved by a second staff member. The payment provider handles any release or refund.",
  },
  {
    q: "Why do I need to verify my identity?",
    a: "Verification protects both sides and meets anti-money-laundering requirements. Upload an ID or commercial register from the verification page; only you and the Insight review team can open your files.",
  },
  {
    q: "Which currencies can I use?",
    a: "Deals are settled in Saudi riyals, and cross-currency deals are converted at a rate shown to you before you confirm. The final amount you see is the amount you pay.",
  },
  {
    q: "How do I contact Insight about a specific deal?",
    a: "Every deal page has a conversation with the other party and a private note box for the Insight team. Both create a record attached to that deal.",
  },
];

function HelpPage() {
  const { text } = useLocale();
  return (
    <SiteShell>
      <div data-no-localize className="mx-auto max-w-3xl px-4 py-14">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <LifeBuoy className="size-3.5" />{text("Help centre")}</span>
        <h1 className="mt-4 text-4xl font-extrabold">{text("Questions, answered")}</h1>
        <p className="mt-3 text-muted-foreground">{text("Everything you need to know before opening your first deal.")}</p>

        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <Card key={text(f.q)}>
              <CardContent className="p-6">
                <h2 className="font-bold">{text(f.q)}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text(f.a)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-primary/25 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="font-bold">{text("Still stuck?")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{text("Open the deal and use the note box for the Insight team, or create an account to start a conversation.")}</p>
            </div>
            <Button asChild>
              <Link to="/auth">{text("Sign in")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
