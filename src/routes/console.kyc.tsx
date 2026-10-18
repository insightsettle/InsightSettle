import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, FileText, UserX } from "lucide-react";
import { useLocale } from "@/lib/locale";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/demo-data";
import {
  kycDocTypes,
  kycDocumentUrl,
  listAllKycDocuments,
  reviewKycDocument,
  type KycDocument,
} from "@/lib/kyc";

export const Route = createFileRoute("/console/kyc")({
  head: () => ({ meta: [
    { title: "Identity documents | Insight staff console" },
    { name: "description", content: "Review member identity documents in Insight." },
    { property: "og:title", content: "Identity documents | Insight staff console" },
    { property: "og:description", content: "Review member identity documents in Insight." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ConsoleKyc,
});

const tone: Record<string, string> = {
  approved: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
};

function ConsoleKyc() {
  const { text } = useLocale();
  const [fileError, setFileError] = useState(false);
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const docs = useQuery({ queryKey: ["kyc-documents"], queryFn: listAllKycDocuments });

  const review = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected"; note: string }) =>
      reviewKycDocument(vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kyc-documents"] }),
  });

  async function openDoc(doc: KycDocument) {
    setFileError(false);
    try { const url = await kycDocumentUrl(doc.file_path); window.open(url, "_blank", "noopener"); } catch { setFileError(true); }
  }

  const rows = docs.data ?? [];
  const pending = rows.filter((d) => d.status === "pending").length;

  return (
    <div className="mt-8" data-no-localize>
      <h2 className="text-xl font-bold">{text("Identity documents")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {text(`${pending} documents waiting for review. Approving a document does not change the member status on its own — set that on the Members tab.`, `${pending} مستند بانتظار المراجعة. الموافقة على المستند لا تغيّر حالة العضو تلقائياً؛ غيّرها من تبويب الأعضاء.`)}
      </p>

      {(review.isError || fileError) && <p role="alert" className="mt-4 text-sm text-destructive">{text("The document action failed. Please try again.", "تعذّر تنفيذ إجراء المستند. حاول مرة أخرى.")}</p>}
      {review.isSuccess && <p role="status" className="mt-4 text-sm text-primary">{text("Review saved.", "حُفظت المراجعة.")}</p>}
      {docs.isError ? <div role="alert" className="mt-4 text-sm text-destructive">{text("Documents could not be loaded.", "تعذّر تحميل المستندات.")}<Button variant="outline" onClick={() => void docs.refetch()}>{text("Try again", "حاول مرة أخرى")}</Button></div> : docs.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">{text("Loading documents…")}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((d) => (
            <Card key={d.id}>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <p className="font-semibold">
                      {text(kycDocTypes.find((t) => t.value === d.doc_type)?.label ?? d.doc_type)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[d.status] ?? "bg-muted"}`}
                    >
                      {text(d.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {d.file_name} · {formatDate(d.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {text("Member", "العضو")} {d.user_id.slice(0, 8)}
                  </p>
                  {d.review_note && (
                    <p className="mt-1 text-sm text-muted-foreground">{d.review_note}</p>
                  )}
                </div>
                <Input
                  value={notes[d.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                  placeholder={text("Review note for the member")}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void openDoc(d)}>{text("Open file")}</Button>
                  <Button
                    size="sm"
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({
                        id: d.id,
                        status: "approved",
                        note: notes[d.id] ?? "",
                      })
                    }
                  >
                    <BadgeCheck />{text("Approve")}</Button>
                  <Button
                    size="sm"
                    disabled={review.isPending}
                    variant="outline"
                    onClick={() =>
                      review.mutate({
                        id: d.id,
                        status: "rejected",
                        note: notes[d.id] ?? "",
                      })
                    }
                  >
                    <UserX />{text("Reject")}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">{text("No documents have been submitted yet.")}</p>
          )}
        </div>
      )}
    </div>
  );
}
