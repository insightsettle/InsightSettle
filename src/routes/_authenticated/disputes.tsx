import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { FileUp, LoaderCircle, Scale, ShieldCheck, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyDeals } from "@/lib/use-my-deals";

export const Route = createFileRoute("/_authenticated/disputes")({
  head: () => ({
    meta: [
      { title: "AI Dispute Center | Insight" },
      {
        name: "description",
        content:
          "Describe an escrow dispute, attach evidence, and receive neutral AI-assisted next steps.",
      },
      { property: "og:title", content: "Insight AI Dispute Center" },
      {
        property: "og:description",
        content: "Structured dispute intake and neutral AI-assisted resolution guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisputesPage,
});

function DisputesPage() {
  const { deals } = useMyDeals();
  const [picked, setDealId] = useState("");
  const dealId = picked || deals.find((deal) => deal.status === "disputed")?.id || deals[0]?.id || "";
  const [issue, setIssue] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const onFiles = (next: FileList | null) => {
    if (!next) return;
    const valid = Array.from(next)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .slice(0, 8);
    setFiles(valid);
    setError(
      valid.length !== next.length ? "Some files were skipped. Use up to 8 files, 10 MB each." : "",
    );
  };
  async function analyze() {
    if (issue.trim().length < 30) {
      setError("Please describe the dispute in at least 30 characters.");
      return;
    }
    setLoading(true);
    setError("");
    setAnalysis("");
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/dispute-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}` },
        signal: controller.current.signal,
        body: JSON.stringify({
          dealId,
          issue,
          desiredOutcome,
          evidence: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
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
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold text-primary">DISPUTE CENTER</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Build a clearer case</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Describe what happened and attach supporting files. Insight AI organizes the facts and
              suggests neutral next steps for review.
            </p>
            <div className="mt-8 space-y-4">
              {[
                {
                  icon: ShieldCheck,
                  title: "Private by design",
                  text: "Files stay in your browser in this prototype; only file names, types, and sizes inform the analysis.",
                },
                {
                  icon: Scale,
                  title: "Neutral guidance",
                  text: "The analysis supports mediation and does not replace a final human decision.",
                },
                {
                  icon: Sparkles,
                  title: "Actionable output",
                  text: "Receive evidence gaps, verification points, and a practical settlement path.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <item.icon className="size-4" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div>
                <Label htmlFor="deal">Deal</Label>
                <select
                  id="deal"
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {deals.length === 0 && <option value="">No deals yet.</option>}
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.ref} — {deal.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="issue">What happened?</Label>
                <Textarea
                  id="issue"
                  rows={7}
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="Explain the agreement, what was delivered, what differs from the agreed terms, and any attempts to resolve it."
                  className="mt-2"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{issue.length}/6000</p>
              </div>
              <div>
                <Label htmlFor="outcome">Preferred outcome</Label>
                <Input
                  id="outcome"
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                  placeholder="For example: partial refund or replacement"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="evidence">Supporting evidence</Label>
                <label
                  htmlFor="evidence"
                  className="mt-2 flex cursor-pointer flex-col items-center border border-dashed border-input bg-muted/40 px-4 py-6 text-center"
                >
                  <FileUp className="size-6 text-primary" />
                  <span className="mt-2 text-sm font-semibold">Choose documents or images</span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Up to 8 files, 10 MB each
                  </span>
                </label>
                <input
                  id="evidence"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="sr-only"
                  onChange={(e) => onFiles(e.target.files)}
                />
                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((f) => (
                      <li
                        key={f.name + f.size}
                        className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs"
                      >
                        <span className="truncate">{f.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={() => setFiles((all) => all.filter((file) => file !== f))}
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <Button className="flex-1" disabled={loading} onClick={analyze}>
                  {loading ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Analyzing case…
                    </>
                  ) : (
                    <>
                      <Sparkles />
                      Analyze dispute
                    </>
                  )}
                </Button>
                {loading && (
                  <Button variant="outline" onClick={() => controller.current?.abort()}>
                    Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        {analysis && (
          <Card className="mt-8 border-primary/25">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h2 className="text-xl font-bold">AI case analysis</h2>
              </div>
              <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
              <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
                AI-generated guidance for review. It is not a binding decision or legal advice.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </SiteShell>
  );
}
