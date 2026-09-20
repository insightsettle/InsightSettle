import { createFileRoute } from "@tanstack/react-router";
import { Gavel, LoaderCircle, RotateCcw, Sparkles, Timer } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSAR } from "@/lib/demo-data";
import { disputeCases, disputeStageLabels, type DisputeCase } from "@/lib/dispute-cases";
import { usePlatformSettings } from "@/lib/platform-settings";

export const Route = createFileRoute("/admin/disputes")({
  component: DisputeOpsPage,
});

const payerLabels = {
  buyer: "Buyer (customer)",
  seller: "Seller",
  losing_party: "Losing party",
  split: "Split 50/50",
} as const;

function hoursLeft(openedAt: string, windowDays: number) {
  const deadline = new Date(openedAt).getTime() + windowDays * 86_400_000;
  return Math.round((deadline - Date.now()) / 3_600_000);
}

function DisputeOpsPage() {
  const { settings, update, reset } = usePlatformSettings();
  const policy = settings.dispute;
  const [cases, setCases] = useState<DisputeCase[]>(disputeCases);
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? "");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);

  const selected = useMemo(() => cases.find((c) => c.id === selectedId), [cases, selectedId]);

  const setPolicy = (patch: Partial<typeof policy>) => update({ dispute: { ...policy, ...patch } });

  const escalate = (id: string) =>
    setCases((all) =>
      all.map((c) =>
        c.id === id
          ? {
              ...c,
              stage: "escalated",
              arbitrator: c.arbitrator ?? "Gulf Commercial Arbitration Centre",
              resolution: `Escalated to an external arbitrator. Arbitration fee ${formatSAR(
                policy.arbitratorFee,
              )} charged to: ${payerLabels[policy.arbitratorFeePayer]}.`,
            }
          : c,
      ),
    );

  const resolve = (id: string) =>
    setCases((all) =>
      all.map((c) =>
        c.id === id
          ? {
              ...c,
              stage: "resolved",
              resolution: "Settled inside the AI mediation window — no arbitration fee charged.",
            }
          : c,
      ),
    );

  async function analyzeCase() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setAnalysis("");
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/dispute-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.current.signal,
        body: JSON.stringify({
          dealId: selected.dealId,
          issue: `Dispute ${selected.id} on deal ${selected.dealId} (${selected.dealTitle}), value ${selected.amount} SAR. Buyer: ${selected.buyer}. Seller: ${selected.seller}. Reason: ${selected.reason}. Current stage: ${disputeStageLabels[selected.stage]}. The AI mediation window is ${policy.aiWindowDays} days from ${selected.openedAt}; if it expires the case goes to an external arbitrator with a fee of ${policy.arbitratorFee} SAR charged to ${payerLabels[policy.arbitratorFeePayer]}. Produce a mediation plan for the remaining window and state clearly what must happen before escalation.`,
          desiredOutcome: selected.aiRecommendation,
          evidence: [],
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Analysis failed (${response.status}).`);
      }
      if (!response.body) throw new Error("The analysis stream was empty.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        setAnalysis((current) => current + decoder.decode(part.value, { stream: true }));
      }
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError"))
        setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setLoading(false);
      controller.current = null;
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Resolution policy</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AI mediation runs for a fixed window. If the parties do not settle, the case moves
                to an external arbitrator and the arbitration fee is charged to the party you
                choose.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="size-4" /> Reset
            </Button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="window">AI mediation window (days)</Label>
              <Input
                id="window"
                type="number"
                min={1}
                max={30}
                value={policy.aiWindowDays}
                onChange={(e) => setPolicy({ aiWindowDays: Number(e.target.value) })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="fee">Arbitration fee (SAR)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                value={policy.arbitratorFee}
                onChange={(e) => setPolicy({ arbitratorFee: Number(e.target.value) })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="payer">Arbitration fee charged to</Label>
              <select
                id="payer"
                value={policy.arbitratorFeePayer}
                onChange={(e) =>
                  setPolicy({
                    arbitratorFeePayer: e.target.value as typeof policy.arbitratorFeePayer,
                  })
                }
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {(Object.keys(payerLabels) as (keyof typeof payerLabels)[]).map((key) => (
                  <option key={key} value={key}>
                    {payerLabels[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="auto">Escalate automatically</Label>
              <select
                id="auto"
                value={policy.autoEscalate ? "yes" : "no"}
                onChange={(e) => setPolicy({ autoEscalate: e.target.value === "yes" })}
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="yes">Yes, when the window expires</option>
                <option value="no">No, staff decide</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Dispute queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Case</th>
                  <th className="px-5 py-3 font-semibold">Value</th>
                  <th className="px-5 py-3 font-semibold">Stage</th>
                  <th className="px-5 py-3 font-semibold">AI window</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cases.map((c) => {
                  const left = hoursLeft(c.openedAt, policy.aiWindowDays);
                  const expired = left <= 0;
                  const active = c.stage === "ai_review" || c.stage === "awaiting_response";
                  return (
                    <tr key={c.id} className={c.id === selectedId ? "bg-primary/5" : undefined}>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className="text-left font-medium hover:text-primary"
                        >
                          {c.id}
                        </button>
                        <span className="block text-xs text-muted-foreground">
                          {c.dealId} — {c.reason}
                        </span>
                      </td>
                      <td className="px-5 py-3">{formatSAR(c.amount)}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                          {disputeStageLabels[c.stage]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {c.stage === "resolved" ? (
                          <span className="text-primary">Closed</span>
                        ) : c.stage === "escalated" ? (
                          <span className="text-muted-foreground">With arbitrator</span>
                        ) : (
                          <span className={expired ? "text-destructive" : "text-muted-foreground"}>
                            {expired
                              ? "Window expired — escalate"
                              : `${Math.ceil(left / 24)} day(s), ${left} h left`}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {active ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => resolve(c.id)}>
                              Mark settled
                            </Button>
                            <Button size="sm" onClick={() => escalate(c.id)}>
                              <Gavel className="size-4" /> Escalate
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No action needed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-primary" />
                <h2 className="font-semibold">Case {selected.id}</h2>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Deal" value={`${selected.dealId} — ${selected.dealTitle}`} />
                <Row label="Buyer" value={selected.buyer} />
                <Row label="Seller" value={selected.seller} />
                <Row label="Value" value={formatSAR(selected.amount)} />
                <Row label="Opened" value={selected.openedAt} />
                <Row label="Stage" value={disputeStageLabels[selected.stage]} />
                <Row
                  label="Arbitration fee"
                  value={`${formatSAR(policy.arbitratorFee)} → ${payerLabels[policy.arbitratorFeePayer]}`}
                />
                {selected.arbitrator && <Row label="Arbitrator" value={selected.arbitrator} />}
              </dl>
              <p className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Current AI recommendation: </span>
                {selected.aiRecommendation}
              </p>
              {selected.resolution && (
                <p className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm">
                  {selected.resolution}
                </p>
              )}
              <div className="mt-5 flex gap-2">
                <Button className="flex-1" disabled={loading} onClick={analyzeCase}>
                  {loading ? (
                    <>
                      <LoaderCircle className="animate-spin" /> Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles /> Run AI mediation plan
                    </>
                  )}
                </Button>
                {loading && (
                  <Button variant="outline" onClick={() => controller.current?.abort()}>
                    Stop
                  </Button>
                )}
              </div>
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={analysis ? "border-primary/25" : undefined}>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h2 className="text-lg font-bold">AI mediation plan</h2>
              </div>
              {analysis ? (
                <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run the analysis to get verification points, evidence gaps, and a settlement path
                  for the remaining {policy.aiWindowDays}-day window before arbitration.
                </p>
              )}
              <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
                AI-generated guidance for mediation. Not a binding decision or legal advice.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
