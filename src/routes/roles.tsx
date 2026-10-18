import { useLocale } from "@/lib/locale";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, ShieldCheck, UserCheck, Users } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
export const Route = createFileRoute("/roles")({
  head: () => ({
    meta: [
      { title: "Roles and access | Insight" },
      {
        name: "description",
        content:
          "Understand visitor, verified user, and administrator access across Insight escrow workflows.",
      },
      { property: "og:title", content: "Insight roles and access" },
      { property: "og:description", content: "Clear responsibilities for every participant." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});
const roles = [
  {
    icon: Users,
    name: "Visitor",
    tag: "No account required",
    items: [
      "Learn how escrow works",
      "Review fees and services",
      "Access help and policies",
      "Understand dispute procedures",
    ],
  },
  {
    icon: UserCheck,
    name: "Verified user",
    tag: "After account and identity verification",
    items: [
      "Create and manage deals",
      "Fund, deliver, and approve work",
      "Message and attach files",
      "Open disputes and submit evidence",
      "Manage withdrawals and bank details",
      "Download receipts and reports",
    ],
  },
  {
    icon: ShieldCheck,
    name: "Platform administrator",
    tag: "Operations and mediation teams",
    items: [
      "Monitor volume, fees, and resolution rates",
      "Manage users and verification reviews",
      "Mediate disputes and record decisions",
      "Configure fees and operating limits",
      "Review complete audit logs",
    ],
  },
];
const rows = [
  { a: "View public information", v: 1, u: 1, m: 1 },
  { a: "Create and fund a deal", v: 0, u: 1, m: 0 },
  { a: "Confirm delivery or receipt", v: 0, u: 1, m: 0 },
  { a: "Open a dispute", v: 0, u: 1, m: 0 },
  { a: "Issue mediation decisions", v: 0, u: 0, m: 1 },
  { a: "Configure revenue settings", v: 0, u: 0, m: 1 },
  { a: "Access audit records", v: 0, u: 0, m: 1 },
];
function Page() {
  const { text } = useLocale();
  return (
    <SiteShell>
      <div data-no-localize className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm font-semibold text-primary">{text("ACCESS CONTROL")}</p>
        <h1 className="mt-2 text-4xl font-extrabold">{text("Clear roles. Separated responsibilities.")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{text("No participant can unilaterally control the other party's funds.")}</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {roles.map((r) => (
            <Card key={text(r.name)}>
              <CardContent className="p-6">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <r.icon />
                </span>
                <h2 className="mt-4 text-lg font-bold">{text(r.name)}</h2>
                <p className="text-xs text-muted-foreground">{text(r.tag)}</p>
                <ul className="mt-4 space-y-2">
                  {r.items.map((i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {text(i)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <h2 className="mt-16 text-2xl font-extrabold">{text("Permission matrix")}</h2>
        <div className="mt-6 overflow-x-auto border border-border">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-muted">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>{text("Action")}</th>
                <th className="text-center">{text("Visitor")}</th>
                <th className="text-center">{text("Verified user")}</th>
                <th className="text-center">{text("Administrator")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={text(r.a)} className="border-t [&>td]:px-4 [&>td]:py-3">
                  <td>{text(r.a)}</td>
                  {[r.v, r.u, r.m].map((x, i) => (
                    <td key={i} className="text-center">
                      {x ? (
                        <Check className="mx-auto size-4 text-primary" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button asChild className="mt-10">
          <Link to="/services">{text("Explore services & fees")}</Link>
        </Button>
      </div>
    </SiteShell>
  );
}
