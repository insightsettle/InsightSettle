import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Brain, Loader2, ShieldAlert, Square } from "@/components/icons";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { listDealsForRisk, setDealRisk, type RiskDeal } from "@/lib/admin.functions";
import { formatDate } from "@/lib/demo-data";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/console/risk")({
  head: () => ({ meta: [
    { title: "Risk review | Insight staff console" },
    { name: "description", content: "Review deal risk in the Insight staff console." },
    { property: "og:title", content: "Risk review | Insight staff console" },
    { property: "og:description", content: "Review deal risk in the Insight staff console." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: RiskReviewPage,
});

const levels = ["low", "medium", "high"] as const;

function RiskReviewPage() {
  const queryClient = useQueryClient();
  const loadDeals = useServerFn(listDealsForRisk);
  const saveRisk = useServerFn(setDealRisk);

  const deals = useQuery({ queryKey: ["risk-deals"], queryFn: () => loadDeals({}) });
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const rows = deals.data ?? [];
  const chosen: RiskDeal[] = selected.length
    ? rows.filter((d) => selected.includes(d.id))
    : rows.slice(0, 10);

  const flagged = rows
    .filter((d) => d.riskLevel === "high" || d.riskLevel === "medium")
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));

  const save = useMutation({
    mutationFn: async (input: { dealId: string; level: (typeof levels)[number] }) =>
      saveRisk({
        data: {
          dealId: input.dealId,
          level: input.level,
          score: input.level === "high" ? 85 : input.level === "medium" ? 55 : 15,
          summary: output.slice(0, 3500),
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["risk-deals"] }),
  });

  async function analyze() {
    setError(null);
    setOutput("");
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const response = await fetch("/api/deal-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        signal: controller.signal,
        body: JSON.stringify({
          notes,
          deals: chosen.map((d) => ({
            ref: d.ref,
            title: d.title,
            amount: d.amount,
            currency: d.currency,
            status: d.status,
            createdAt: d.createdAt,
            buyer: d.buyer,
            seller: d.seller,
            disputedReason: d.disputedReason,
            messages: d.messages.slice(-20),
          })),
        }),
      });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({ error: "Risk analysis failed." }));
        throw new Error(payload.error ?? "Risk analysis failed.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setError(e instanceof Error ? e.message : "Risk analysis failed.");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Brain className="size-5 text-primary" />
              <h2 className="font-bold">AI risk review</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the deals to screen, add anything members sent you outside the platform, and the
              model ranks which deals need a manual review.
            </p>

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-3">
              {deals.isLoading && <p className="text-sm text-muted-foreground">Loading deals…</p>}
              {rows.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-secondary"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(d.id)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id),
                      )
                    }
                  />
                  <span className="text-sm">
                    <b>{d.ref}</b> · {d.title}
                    <span className="block text-xs text-muted-foreground">
                      <bdi dir="ltr">{formatMoney(d.amount, d.currency)}</bdi> · {d.status} · {d.messages.length}{" "}
                      messages
                      {d.riskLevel ? ` · flagged ${d.riskLevel}` : ""}
                    </span>
                  </span>
                </label>
              ))}
              {!deals.isLoading && rows.length === 0 && (
                <p className="text-sm text-muted-foreground">No deals yet.</p>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {selected.length
                ? `${selected.length} deal(s) selected.`
                : "No selection — the 10 newest deals are screened."}
            </p>

            <Textarea
              rows={5}
              className="mt-4"
              placeholder="Paste deal messages, emails, or your own notes about the parties"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void analyze()} disabled={running || chosen.length === 0}>
                {running ? <Loader2 className="animate-spin" /> : <ShieldAlert />}
                {running ? "Analyzing…" : "Analyze risk"}
              </Button>
              {running && (
                <Button variant="outline" onClick={() => abortRef.current?.abort()}>
                  <Square /> Stop
                </Button>
              )}
            </div>

            {error && (
              <div className="mt-4 flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <AlertTriangle className="size-4 text-destructive" />
                <p>{error}</p>
              </div>
            )}

            {output && (
              <div className="prose prose-sm mt-5 max-w-none rounded-md border border-border bg-muted/40 p-5 dark:prose-invert">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            )}

            {output && chosen.length > 0 && (
              <div className="mt-5 rounded-md border border-border p-4">
                <p className="text-sm font-semibold">Save a risk flag from this analysis</p>
                <div className="mt-3 space-y-2">
                  {chosen.map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{d.ref}</span>
                      {levels.map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant={d.riskLevel === level ? "default" : "outline"}
                          onClick={() => save.mutate({ dealId: d.id, level })}
                          disabled={save.isPending}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold">Deals flagged for review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you marked medium or high risk, newest score first.
          </p>
          <div className="mt-4 space-y-3">
            {flagged.map((d) => (
              <div key={d.id} className="rounded-md border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to="/console/deals/$dealId"
                    params={{ dealId: d.ref }}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {d.ref}
                  </Link>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      d.riskLevel === "high"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {d.riskLevel} · {d.riskScore ?? "—"}
                  </span>
                </div>
                <p className="mt-1 text-sm">{d.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {d.riskCheckedAt ? formatDate(d.riskCheckedAt) : ""}
                </p>
                {d.riskSummary && (
                  <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{d.riskSummary}</p>
                )}
              </div>
            ))}
            {flagged.length === 0 && (
              <p className="text-sm text-muted-foreground">No deals are flagged right now.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
