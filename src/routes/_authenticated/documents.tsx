import { Link } from "@tanstack/react-router";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { supabase } from "@/integrations/supabase/client";
import { cap, rolesFor } from "@/lib/roles";
import { createFileRoute } from "@tanstack/react-router";
import { FileSearch, FileUp, LoaderCircle, ScrollText, ShieldAlert, X } from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyDeals } from "@/lib/use-my-deals";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Document Review | Insight" },
      {
        name: "description",
        content:
          "Upload deal contracts and let Insight AI extract obligations, risks, and mismatches against the escrow record.",
      },
      { property: "og:title", content: "Insight AI document review" },
      {
        property: "og:description",
        content: "Extract obligations and risks from deal documents and compare them to deal data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

const MAX_FILES = 4;
const MAX_SIZE = 8 * 1024 * 1024;
const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv"];

async function toPayload(file: File) {
  const mediaType = file.type || "application/octet-stream";
  if (TEXT_TYPES.includes(mediaType) || /\.(txt|md|csv)$/i.test(file.name)) {
    return { name: file.name, mediaType: "text/plain", text: await file.text() };
  }
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return { name: file.name, mediaType, data: btoa(binary) };
}

function DocumentsPage() {
  const { text } = useLocale();
  const { deals, error: dealsError, retry } = useMyDeals();
  const [picked, setDealId] = useState("");
  const dealId = picked || deals[0]?.id || "";
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const deal = deals.find((d) => d.id === dealId);

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted = Array.from(list)
      .filter((f) => f.size <= MAX_SIZE)
      .slice(0, MAX_FILES);
    setFiles(accepted);
    setError(
      accepted.length !== list.length
        ? `Some files were skipped. Use up to ${MAX_FILES} files, 8 MB each.`
        : "",
    );
  };

  async function runReview() {
    if (!deal) return;
    if (files.length === 0) {
      setError("Attach at least one deal document.");
      return;
    }
    setLoading(true);
    setError("");
    setReview("");
    controller.current = new AbortController();
    try {
      const documents = await Promise.all(files.map(toPayload));
      const response = await fetch("/api/document-review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}` },
        signal: controller.current.signal,
        body: JSON.stringify({
          deal: {
            id: deal.id,
            title: deal.title,
            description: deal.description,
            amount: deal.amount,
            currency: deal.currency,
            buyer: cap(rolesFor(deal.deal_type).payer)[0],
            seller: cap(rolesFor(deal.deal_type).payee)[0],
            dueAt: deal.due_at ?? "Not set",
            status: deal.status,
            stages: [],
          },
          notes,
          documents,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Review failed (${response.status}).`);
      }
      if (!response.body) throw new Error("The review stream was empty.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        setReview((current) => current + decoder.decode(part.value, { stream: true }));
      }
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError"))
        setError(text("Document review is unavailable. Your documents have not been saved; use the deal page to attach them.", "مراجعة المستندات غير متاحة. لم تُحفظ ملفاتك؛ أرفقها من صفحة الصفقة."));
    } finally {
      setLoading(false);
      controller.current = null;
    }
  }

  return (
    <SiteShell>
      <div data-no-localize className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm font-semibold text-primary">{text("DEAL MANAGER TOOLS")}</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{text("Deal documents", "مستندات الصفقة")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{text("Upload the deal's documents: contracts, scopes of work, or the seller's invoices. Insight AI extracts the obligations and risks, then compares them with the deal record so mismatches surface before payment.", "ارفع مستندات الصفقة: العقود أو نطاقات العمل أو فواتير البائع. يستخرج ذكاء إنسايت الاصطناعي الالتزامات والمخاطر، ثم يقارنها بسجل الصفقة لإظهار أوجه الاختلاف قبل الدفع.")}</p>

        {dealsError && <div role="alert" className="mt-4 text-sm text-destructive">{text("Deals could not be loaded.", "تعذّر تحميل الصفقات.")}<Button variant="outline" onClick={retry}>{text("Try again", "حاول مرة أخرى")}</Button></div>}
        <p className="mt-4 text-sm text-muted-foreground">{text("Looking for Insight's tax invoices for fees you paid?", "تبحث عن فواتير إنسايت الضريبية للرسوم التي دفعتها؟")} <Link to="/invoices" className="font-medium text-primary underline-offset-4 hover:underline">{text("Open tax invoices", "افتح الفواتير الضريبية")}</Link></p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div>
                <Label htmlFor="doc-deal">{text("Deal")}</Label>
                <select
                  id="doc-deal"
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {deals.length === 0 && <option value="">{text("No deals yet.")}</option>}
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.ref} — {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="doc-notes">{text("Manager notes (optional)")}</Label>
                <Textarea
                  id="doc-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={text("Anything the reviewer should check first, such as late-delivery penalties or scope changes.")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="doc-files">{text("Deal documents")}</Label>
                <label
                  htmlFor="doc-files"
                  className="mt-2 flex cursor-pointer flex-col items-center rounded-md border border-dashed border-input bg-muted/40 px-4 py-6 text-center"
                >
                  <FileUp className="size-6 text-primary" />
                  <span className="mt-2 text-sm font-semibold">{text("Choose deal documents (contracts, scopes, seller invoices)", "اختر مستندات الصفقة (عقود، نطاقات عمل، فواتير البائع)")}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{text("PDF, images, or text — up to")}{MAX_FILES}{text("files, 8 MB each")}</span>
                </label>
                <input
                  id="doc-files"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.csv,image/*"
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
                        <Button size="icon" variant="ghost"
                          type="button"
                          aria-label={text(`Remove ${f.name}`, `إزالة ${f.name}`)}
                          onClick={() => setFiles((all) => all.filter((file) => file !== f))}
                        >
                          <X className="size-4" />
                        </Button>
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
                <Button className="flex-1" disabled={loading || !dealId} onClick={runReview}>
                  {loading ? (
                    <>
                      <LoaderCircle className="animate-spin" />{text("Reviewing documents…")}</>
                  ) : (
                    <>
                      <FileSearch />{text("Review documents")}</>
                  )}
                </Button>
                {loading && (
                  <Button variant="outline" onClick={() => controller.current?.abort()}>{text("Stop")}</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <ScrollText className="size-5 text-primary" />
                <h2 className="font-semibold">{text("Escrow record used for comparison")}</h2>
              </div>
              {!deal && <p className="mt-4 text-sm text-muted-foreground">{text("No deals yet.")}</p>}
              {deal && (
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label={text("Deal")} value={`${deal.ref} — ${deal.title}`} />
                  <Row label={text("Value")} value={formatMoney(deal.amount, deal.currency)} />
                  <Row label={text("Delivery due")} value={deal.due_at ?? "—"} />
                </dl>
              )}
              <div className="mt-5 flex gap-3 rounded-md border border-warning/30 bg-warning/5 p-4">
                <ShieldAlert className="size-5 shrink-0 text-warning" />
                <p className="text-xs text-muted-foreground">{text("Documents are sent for analysis only and are not stored in this prototype. The output is operational guidance, not legal advice.")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {review && (
          <Card className="mt-8 border-primary/25">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <FileSearch className="size-5 text-primary" />
                <h2 className="text-xl font-bold">{text("Obligations, risks, and mismatches")}</h2>
              </div>
              <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-table:text-sm">
                <ReactMarkdown>{review}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SiteShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
