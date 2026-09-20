import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  Landmark,
  Lock,
  MessageSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
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
          "Modern escrow for high-value transactions. Funds stay protected until delivery is confirmed, with transparent fees and AI-assisted dispute resolution.",
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

const steps = [
  {
    t: "Create the agreement",
    d: "Define the scope, amount, milestones, and delivery terms in minutes.",
  },
  {
    t: "Invite the other party",
    d: "Share a secure link. Both sides verify their identity before money moves.",
  },
  {
    t: "Fund the escrow",
    d: "The buyer deposits the amount. Insight holds it safely and neutrally.",
  },
  {
    t: "Confirm and release",
    d: "Once delivery is confirmed, funds are released to the seller — fully documented.",
  },
];

const features = [
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
    d: "Organize facts, identify evidence gaps, and get a neutral mediation plan fast.",
  },
  {
    icon: FileCheck2,
    t: "Receipts and reports",
    d: "Download records for funding, releases, refunds, and account activity.",
  },
  {
    icon: ShieldCheck,
    t: "Account safeguards",
    d: "Identity verification, two-step sign-in, and session controls on every account.",
  },
];

const useCases = [
  {
    icon: Sparkles,
    t: "Freelancers & agencies",
    d: "Get paid on delivery without chasing invoices or risking non-payment.",
  },
  {
    icon: Building2,
    t: "E-commerce & marketplaces",
    d: "Protect buyers on high-value orders and custom-made goods.",
  },
  {
    icon: Landmark,
    t: "Business services",
    d: "Close B2B contracts with staged payments and a documented trail.",
  },
];

function HomePage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-accent-foreground uppercase">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Secure escrow · Demo environment
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-6xl">
              The safer way to <span className="text-primary">close every deal</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Insight holds funds until the buyer confirms delivery. Every milestone, message, and
              decision stays documented from agreement to settlement.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-foreground text-background shadow-lg hover:bg-foreground/90"
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started now <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-card">
                <Link to="/how-it-works">See how it works</Link>
              </Button>
            </div>
            <dl className="mt-12 grid max-w-2xl grid-cols-3 gap-6 border-t border-border pt-7">
              {[
                { k: "Protected volume", v: "SAR 12.4M" },
                { k: "Completion rate", v: "96%" },
                { k: "Average resolution", v: "3 days" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {s.k}
                  </dt>
                  <dd className="mt-1.5 text-2xl font-extrabold">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Floating transaction card */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-primary/10 blur-2xl" />
            <div className="glow-mint relative rounded-3xl border border-primary/20 bg-card p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                      Deal DL-10428
                    </p>
                    <p className="font-bold">Brand identity project</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    Value
                  </p>
                  <p className="font-extrabold text-primary">{formatSAR(12000)}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Buyer identity</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                    Verified
                  </span>
                </li>
                <li className="relative flex items-center justify-between rounded-xl border-2 border-primary px-4 py-3">
                  <span className="text-sm font-semibold">Funds in escrow</span>
                  <span className="text-xs font-bold text-primary">Secured</span>
                  <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-card bg-primary" />
                </li>
                <li className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 opacity-60">
                  <span className="text-sm text-muted-foreground">Delivery & release</span>
                  <span className="text-xs font-bold">Pending</span>
                </li>
              </ul>
            </div>
            <div className="absolute -bottom-5 -left-3 -rotate-3 rounded-xl bg-foreground px-4 py-3 shadow-xl sm:-left-6">
              <p className="text-[10px] font-bold tracking-widest text-primary uppercase">
                New update
              </p>
              <p className="text-xs font-medium text-background">Funds verified and locked</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Four steps between agreement and settlement
          </h2>
        </div>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.t}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-lg font-extrabold text-primary">
                {i + 1}
              </span>
              <h3 className="mt-5 font-bold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
              Built for trust
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything both parties need to move with confidence
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card
                key={f.t}
                className="shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <CardContent className="p-6">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <f.icon />
                  </span>
                  <h3 className="mt-4 font-bold">{f.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Lifecycle */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="max-w-md">
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
              Full visibility
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              One clear status at every step
            </h2>
            <p className="mt-3 text-muted-foreground">
              Both parties always see the same state of the deal — no guessing, no chasing.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap gap-3">
            {statuses.map((s) => (
              <StatusBadge key={s} status={s} className="px-4 py-2" />
            ))}
          </div>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          {statuses.map((s) => statusLabels[s]).join(" → ")}
        </p>
      </section>

      {/* Security band */}
      <section className="border-y border-border bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
              Security & compliance
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              Protection built into every layer
            </h2>
            <p className="mt-4 text-background/70">
              Identity checks, encrypted documents, and a full audit trail — designed for high-value
              transactions.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { t: "KYC identity verification", d: "Every account verified before funds move." },
              { t: "Two-step sign-in", d: "2FA on every account, enforced for payouts." },
              { t: "Encrypted documents", d: "Contracts and evidence stored securely per deal." },
              { t: "Full audit log", d: "Every action timestamped and downloadable." },
            ].map((i) => (
              <li key={i.t} className="rounded-2xl border border-background/10 bg-background/5 p-5">
                <CheckCircle2 className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-bold">{i.t}</h3>
                <p className="mt-1 text-xs leading-relaxed text-background/60">{i.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Use cases + fees teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Who it's for</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Made for deals that matter
          </h2>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {useCases.map((u) => (
            <Card
              key={u.t}
              className="shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <CardContent className="p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <u.icon />
                </span>
                <h3 className="mt-4 font-bold">{u.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{u.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold">Transparent fees, no surprises</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              One clear fee per deal — you see the exact amount before funding.
            </p>
          </div>
          <Button asChild variant="outline" className="bg-card">
            <Link to="/services">
              View fees <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-foreground p-10 text-center sm:p-16">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full opacity-10"
          >
            <path
              d="M0 50 Q25 0 50 50 T100 50"
              stroke="currentColor"
              fill="none"
              className="text-primary"
              strokeWidth="0.5"
            />
            <path
              d="M0 70 Q25 20 50 70 T100 70"
              stroke="currentColor"
              fill="none"
              className="text-primary"
              strokeWidth="0.5"
            />
          </svg>
          <div className="relative">
            <BadgeCheck className="mx-auto size-10 text-primary" />
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-background sm:text-4xl">
              Ready to secure your next deal?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-background/70">
              Create your account, set up the agreement, invite the other party, and let Insight
              protect the payment.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Sign up now <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-background/25 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
