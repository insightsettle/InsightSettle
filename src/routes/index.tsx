import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  Lock,
  MessageSquare,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import logoAsset from "@/assets/insight-logo-light.jpeg.asset.json";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatSAR, statusLabels, type DealStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Insight | Secure escrow for every deal" },
      {
        name: "description",
        content:
          "Protect payments until delivery is confirmed, with milestones, transparent fees, and AI-assisted dispute resolution.",
      },
      { property: "og:title", content: "Insight | Secure escrow" },
      {
        property: "og:description",
        content: "Protected payments, clear milestones, and fair dispute resolution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const statuses: DealStatus[] = [
  "pending_funding",
  "held",
  "delivered",
  "under_review",
  "released",
  "refunded",
  "disputed",
];

function HomePage() {
  return (
    <SiteShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" /> Secure escrow · Demo
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl leading-[1.12] font-extrabold sm:text-6xl">
              The safer way to <span className="text-primary">close every deal.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Insight holds funds until the buyer confirms delivery. Every milestone, message, and
              decision stays documented from agreement to settlement.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard">
                  Open dashboard <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/how-it-works">See how it works</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-2xl grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                { k: "Protected volume", v: "SAR 12.4M" },
                { k: "Completion rate", v: "96%" },
                { k: "Average resolution", v: "3 days" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-xs text-muted-foreground">{s.k}</dt>
                  <dd className="mt-1 text-lg font-extrabold text-primary">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <img src={logoAsset.url} alt="Insight" className="mx-auto w-full max-w-md" />
            <Card className="glow-mint mx-auto -mt-16 max-w-md border-border bg-card/95">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">Deal DL-10428</p>
                    <p className="text-xs text-muted-foreground">Brand identity project</p>
                  </div>
                  <StatusBadge status="under_review" />
                </div>
                <div className="mt-5 rounded-md bg-primary/5 p-4">
                  <p className="text-xs text-muted-foreground">Protected funds</p>
                  <p className="mt-1 text-2xl font-extrabold text-primary">{formatSAR(12000)}</p>
                </div>
                <ul className="mt-4 space-y-3">
                  {[
                    { icon: Wallet, t: "Deal funded", d: "29 Aug" },
                    { icon: FileCheck2, t: "Delivery confirmed", d: "17 Sep" },
                    { icon: BadgeCheck, t: "Buyer review", d: "Pending" },
                  ].map((row) => (
                    <li key={row.t} className="flex items-center gap-3 text-sm">
                      <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                        <row.icon />
                      </span>
                      <span className="font-medium">{row.t}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{row.d}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-extrabold">Built for trusted transactions</h2>
        <p className="mt-2 text-muted-foreground">
          Everything both parties need to move with confidence.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Lock,
              t: "Protected funds",
              d: "Funds remain in neutral escrow until the agreed release conditions are met.",
            },
            {
              icon: Wallet,
              t: "Milestone payments",
              d: "Split complex work into defined stages and release each payment independently.",
            },
            {
              icon: MessageSquare,
              t: "Documented communication",
              d: "Keep messages and validated attachments within the deal record.",
            },
            {
              icon: Scale,
              t: "AI-assisted disputes",
              d: "Organize facts, identify evidence gaps, and suggest neutral resolution steps.",
            },
            {
              icon: FileCheck2,
              t: "Receipts and reports",
              d: "Download records for funding, releases, refunds, and account activity.",
            },
            {
              icon: ShieldCheck,
              t: "Account safeguards",
              d: "Support identity checks, two-step verification, and session controls.",
            },
          ].map((f) => (
            <Card key={f.t} className="shadow-sm transition hover:border-primary/40">
              <CardContent className="p-6">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <f.icon />
                </span>
                <h3 className="mt-4 font-bold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-extrabold">One clear status at every step</h2>
          <div className="mt-7 flex flex-wrap gap-3">
            {statuses.map((s) => (
              <StatusBadge key={s} status={s} className="px-4 py-2" />
            ))}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            {statuses.map((s) => statusLabels[s]).join(" → ")}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-col gap-6 border-l-4 border-primary bg-card p-7 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">Ready for a lower-risk transaction?</h2>
            <p className="mt-2 text-muted-foreground">
              Create the agreement, invite the other party, and let Insight protect the payment.
            </p>
          </div>
          <Button asChild size="lg" className="sm:ml-auto">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
