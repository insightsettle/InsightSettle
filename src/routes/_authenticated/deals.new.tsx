import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDeal, type DealRow } from "@/lib/deals";
import { calcFee, formatSAR } from "@/lib/demo-data";
import { fxCurrencies } from "@/lib/fx";

export const Route = createFileRoute("/_authenticated/deals/new")({
  head: () => ({
    meta: [
      { title: "Create a deal | Insight" },
      {
        name: "description",
        content: "Open a new escrow deal and invite the other party with a secure link.",
      },
      { property: "og:title", content: "Create an escrow deal" },
      { property: "og:description", content: "Set the amount, terms, and delivery date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewDeal,
});

function NewDeal() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("5000");
  const [currency, setCurrency] = useState("SAR");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [counterpartyEmail, setCounterpartyEmail] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<DealRow | null>(null);

  const numericAmount = Number(amount) || 0;
  const fee = calcFee(numericAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const deal = await createDeal({
        title,
        description,
        amount: numericAmount,
        currency,
        role,
        counterpartyEmail,
        dueAt: dueAt || null,
      });
      setCreated(deal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The deal could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const inviteUrl = `${typeof window === "undefined" ? "" : window.location.origin}/invite/${created.invite_token}`;
    return (
      <SiteShell>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <h1 className="text-3xl font-extrabold">Deal {created.ref} is ready</h1>
          <p className="mt-2 text-muted-foreground">
            Share this link with the other party. When they sign in and accept, the deal appears on
            both dashboards.
          </p>
          <Card className="mt-6">
            <CardContent className="p-6">
              <Label htmlFor="invite">Invitation link</Label>
              <Input id="invite" readOnly value={inviteUrl} className="mt-2" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>
                  Copy link
                </Button>
                <Button asChild variant="outline">
                  <Link to="/deals/$dealId" params={{ dealId: created.ref }}>
                    Open the deal
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-extrabold">Create a deal</h1>
        <p className="mt-2 text-muted-foreground">
          Describe what is being delivered, set the value, and invite the other party.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Deal title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">What is being delivered</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope, revisions, release conditions, refund conditions."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Deal value</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="SAR">SAR — Saudi riyal</option>
                {fxCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Your side of the deal</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "buyer" | "seller")}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="buyer">I am paying (buyer)</option>
                <option value="seller">I am delivering (seller)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueAt">Delivery date</Label>
              <Input
                id="dueAt"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="counterparty">Other party email</Label>
            <Input
              id="counterparty"
              type="email"
              value={counterpartyEmail}
              onChange={(e) => setCounterpartyEmail(e.target.value)}
              placeholder="them@example.com"
            />
          </div>

          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="p-5 text-sm">
              <p className="font-semibold">Escrow fee on this value</p>
              <p className="mt-1 text-muted-foreground">
                {formatSAR(fee.fee)} ({(fee.rate * 100).toFixed(1)}% — {fee.tier.label})
              </p>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Create deal and get invite link"}
          </Button>
        </form>
      </div>
    </SiteShell>
  );
}
