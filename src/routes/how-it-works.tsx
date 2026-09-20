import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DealStatus } from "@/lib/demo-data";

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
    d: "The buyer funds the deal and the amount moves into protected escrow.",
  },
  { t: "Deliver the work", d: "The seller confirms delivery with notes and supporting files." },
  {
    t: "Review the delivery",
    d: "The buyer accepts, requests changes, or opens a dispute during the review window.",
  },
  {
    t: "Release or refund",
    d: "Funds are released or refunded with a receipt and complete timeline.",
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
const desc: Record<DealStatus, string> = {
  pending_funding: "The agreement is ready but has not been funded.",
  held: "Funds are protected and work can begin.",
  delivered: "The seller marked the work as delivered.",
  under_review: "The buyer is reviewing the submitted work.",
  released: "Funds were released to the seller.",
  refunded: "Funds were returned under the refund policy.",
  disputed: "The deal is paused for mediation.",
};
function Page() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm font-semibold text-primary">THE ESCROW JOURNEY</p>
        <h1 className="mt-2 text-4xl font-extrabold">From agreement to settlement</h1>
        <p className="mt-3 text-muted-foreground">
          Seven transparent steps, each recorded in the deal timeline.
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
