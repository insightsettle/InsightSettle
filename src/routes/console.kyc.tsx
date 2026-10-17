import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, FileText, UserX } from "lucide-react";
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
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const docs = useQuery({ queryKey: ["kyc-documents"], queryFn: listAllKycDocuments });

  const review = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected"; note: string }) =>
      reviewKycDocument(vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kyc-documents"] }),
  });

  async function openDoc(doc: KycDocument) {
    const url = await kycDocumentUrl(doc.file_path);
    window.open(url, "_blank", "noopener");
  }

  const rows = docs.data ?? [];
  const pending = rows.filter((d) => d.status === "pending").length;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold">Identity documents</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {pending} document{pending === 1 ? "" : "s"} waiting for review. Approving a document does
        not change the member status on its own — set that on the Members tab.
      </p>

      {docs.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading documents…</p>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((d) => (
            <Card key={d.id}>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <p className="font-semibold">
                      {kycDocTypes.find((t) => t.value === d.doc_type)?.label ?? d.doc_type}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[d.status] ?? "bg-muted"}`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {d.file_name} · {formatDate(d.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    member {d.user_id.slice(0, 8)}
                  </p>
                  {d.review_note && (
                    <p className="mt-1 text-sm text-muted-foreground">{d.review_note}</p>
                  )}
                </div>
                <Input
                  value={notes[d.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                  placeholder="Review note for the member"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void openDoc(d)}>
                    Open file
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      review.mutate({
                        id: d.id,
                        status: "approved",
                        note: notes[d.id] ?? "",
                      })
                    }
                  >
                    <BadgeCheck /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      review.mutate({
                        id: d.id,
                        status: "rejected",
                        note: notes[d.id] ?? "",
                      })
                    }
                  >
                    <UserX /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No documents have been submitted yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
