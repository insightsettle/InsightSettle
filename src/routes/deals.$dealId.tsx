import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, FileText, MessageSquare, Users } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { StatusBadge } from "@/components/site/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calcFee, formatDate, formatSAR, getDeal } from "@/lib/demo-data";

export const Route = createFileRoute("/deals/$dealId")({
  head: ({ params }) => ({
    meta: [
      { title: `Deal ${params.dealId} | Insight` },
      {
        name: "description",
        content: "Review escrow deal parties, milestones, fees, evidence, messages, and timeline.",
      },
      { property: "og:title", content: `Insight deal ${params.dealId}` },
      { property: "og:description", content: "A complete record of an Insight escrow deal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealPage,
});

function DealPage() {
  const { dealId } = Route.useParams();
  const deal = getDeal(dealId);
  if (!deal)
    return (
      <SiteShell>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Deal not found</h1>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </SiteShell>
    );
  const { fee } = calcFee(deal.amount);
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/dashboard">
            <ArrowLeft /> Back to dashboard
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">{deal.id}</p>
            <h1 className="mt-2 text-3xl font-extrabold">{deal.title}</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">{deal.description}</p>
          </div>
          <StatusBadge status={deal.status} className="px-4 py-2" />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.8fr]">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold">Milestones</h2>
                <div className="mt-4 space-y-3">
                  {deal.stages.map((stage) => (
                    <div
                      key={stage.name}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4"
                    >
                      <div>
                        <p className="font-medium">{stage.name}</p>
                        <p className="text-sm text-muted-foreground">{formatSAR(stage.amount)}</p>
                      </div>
                      <StatusBadge status={stage.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold">Timeline</h2>
                <ol className="mt-5 space-y-5 border-l border-border pl-5">
                  {deal.timeline.map((e) => (
                    <li key={e.at} className="relative">
                      <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-card bg-primary" />
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.at}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-primary" />
                  <h2 className="font-bold">Deal messages</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {deal.messages.length ? (
                    deal.messages.map((m) => (
                      <div key={m.at} className="rounded-md bg-muted p-4">
                        <div className="flex justify-between gap-3 text-xs">
                          <b>{m.from}</b>
                          <span className="text-muted-foreground">{m.at}</span>
                        </div>
                        <p className="mt-2 text-sm">{m.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <aside className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Deal value</p>
                <p className="mt-1 text-3xl font-extrabold">{formatSAR(deal.amount)}</p>
                <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
                  <Info label="Platform fee" value={formatSAR(fee)} />
                  <Info label="Seller receives" value={formatSAR(deal.amount - fee)} />
                  <Info label="Created" value={formatDate(deal.createdAt)} />
                  <Info label="Due" value={formatDate(deal.dueAt)} />
                </dl>
                <p className="mt-4 text-xs text-warning">Sample payment data</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  <h2 className="font-bold">Parties</h2>
                </div>
                <Info label="Buyer" value={deal.buyer} />
                <Info label="Seller" value={deal.seller} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  <h2 className="font-bold">Attachments</h2>
                </div>
                <div className="mt-4 space-y-2">
                  {deal.attachments.length ? (
                    deal.attachments.map((f) => (
                      <div key={f.name} className="flex justify-between gap-3 text-sm">
                        <span>{f.name}</span>
                        <span className="text-muted-foreground">{f.size}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No files attached.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            {deal.actionRequired && (
              <Card className="border-warning/40 bg-warning/5">
                <CardContent className="p-5">
                  <div className="flex gap-2">
                    <CalendarDays className="size-5 text-warning" />
                    <div>
                      <p className="font-semibold">Action required</p>
                      <p className="mt-1 text-sm text-muted-foreground">{deal.actionRequired}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-right">{value}</dd>
    </div>
  );
}
