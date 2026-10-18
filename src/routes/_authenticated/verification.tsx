import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, FileUp, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import { AccountSummary } from "@/components/site/AccountProgress";
import { BusinessDetailsCard, PayoutAccountCard, PersonalDetailsCard } from "@/components/site/KycForms";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/lib/locale";
import { auctionAccess } from "@/lib/auction-client";
import { useStaffAccess } from "@/hooks/use-staff";
import { useSessionUser } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/demo-data";
import {
  deleteKycDocument,
  kycDocTypes,
  kycDocumentUrl,
  listMyKycDocuments,
  uploadKycDocument,
  type KycDocument,
} from "@/lib/kyc";

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({
    meta: [
      { title: "Identity verification | Insight" },
      {
        name: "description",
        content: "Upload your identity documents so Insight can verify your account.",
      },
      { property: "og:title", content: "Identity verification on Insight" },
      { property: "og:description", content: "Verified accounts can fund and release deals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerificationPage,
});

const tone: Record<string, string> = {
  approved: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
};

function VerificationPage() {
  const queryClient = useQueryClient();
  const { user } = useSessionUser();
  const { isStaff, loading: staffLoading } = useStaffAccess();
  const { text } = useLocale();
  const auctionPreference = useQuery({ queryKey: ['auction-access'], queryFn: auctionAccess });
  const preferenceMutation = useMutation({
    mutationFn: async (enabled: boolean) => { if (!user) return; const { error } = await supabase.from('profiles').update({ organises_auctions: enabled }).eq('id', user.id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auction-access'] }),
  });
  const [docType, setDocType] = useState<string>("national_id");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, verification_status").eq("id", user?.id ?? "")
        .maybeSingle();
      return data;
    },
  });

  const docs = useQuery({ queryKey: ["my-kyc"], queryFn: listMyKycDocuments });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file first.");
      await uploadKycDocument(file, docType);
    },
    onSuccess: () => {
      setFile(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["my-kyc"] });
      queryClient.invalidateQueries({ queryKey: ["account-steps"] });
    },
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : "The document could not be uploaded."),
  });

  const remove = useMutation({
    mutationFn: (doc: KycDocument) => deleteKycDocument(doc),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-kyc"] }); queryClient.invalidateQueries({ queryKey: ["account-steps"] }); },
  });

  async function openDoc(doc: KycDocument) {
    const url = await kycDocumentUrl(doc.file_path);
    window.open(url, "_blank", "noopener");
  }

  const status = profile.data?.verification_status ?? "pending";

  if (staffLoading || isStaff) return null;
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-0 py-4 sm:px-4 sm:py-8">
        <AccountSummary name={(user?.user_metadata?.["full_name"] as string | undefined) ?? user?.email?.split("@")[0] ?? ""} email={user?.email ?? ""} />
        <h1 id="identity" className="mt-10 scroll-mt-24 text-3xl font-extrabold" data-no-localize>{text("Identity verification", "توثيق الهوية")}</h1>
        <p className="mt-2 text-muted-foreground" data-no-localize>
          {text("Verification protects both sides of every deal. Upload a clear photo or PDF of your documents; only you and the Insight review team can open them.", "التوثيق يحمي طرفي كل صفقة. ارفع صورة واضحة أو ملف PDF لمستنداتك، ولا يطّلع عليها إلا أنت وفريق المراجعة في إنسايت.")}
        </p>

        <Card className="mt-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" />
              <div>
                <p className="font-semibold">Account status</p>
                <p className="text-sm text-muted-foreground" dir="ltr">
                  {user?.email}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[status] ?? "bg-muted text-muted-foreground"}`}
            >
              {status}
            </span>
          </CardContent>
        </Card>

        <div id="details" className="scroll-mt-24"><PersonalDetailsCard /></div>
        <BusinessDetailsCard />
        <div id="payout" className="scroll-mt-24"><PayoutAccountCard /></div>
        <Card className="mt-4" data-no-localize><CardContent className="flex items-start justify-between gap-4 p-6"><div><Label htmlFor="organises-auctions">{text('I organise auctions', 'أنا أنظّم مزادات')}</Label><p className="mt-2 text-xs leading-6 text-muted-foreground">{text('Auction organisers must be verified business accounts.', 'يجب أن يكون منظّم المزاد حساب أعمال موثّقًا.')}</p>{preferenceMutation.error && <p role="alert" className="mt-2 text-xs text-destructive">{text('Unable to update this preference.', 'تعذّر تحديث هذا الخيار.')}</p>}</div><Switch id="organises-auctions" checked={auctionPreference.data?.enabled ?? false} disabled={preferenceMutation.isPending || (!auctionPreference.data?.eligible && !auctionPreference.data?.enabled)} onCheckedChange={value => preferenceMutation.mutate(value)} /></CardContent></Card>

        <Card className="mt-4">
          <CardContent className="p-6">
            <h2 className="font-bold">Upload a document</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="docType">Document type</Label>
                <select
                  id="docType"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {kycDocTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">File (image or PDF, max 10 MB)</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <Button className="mt-4" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
              <FileUp /> {upload.isPending ? "Uploading…" : "Submit document"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="p-6">
            <h2 className="font-bold">Your documents</h2>
            <div className="mt-4 space-y-3">
              {(docs.data ?? []).map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {kycDocTypes.find((t) => t.value === d.doc_type)?.label ?? d.doc_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.file_name} · {formatDate(d.created_at)}
                    </p>
                    {d.review_note && (
                      <p className="mt-1 text-sm text-muted-foreground">{d.review_note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[d.status] ?? "bg-muted"}`}
                    >
                      {d.status}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => void openDoc(d)}>
                      View
                    </Button>
                    {d.status === "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(d)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(docs.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You have not uploaded any documents yet.
                </p>
              )}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <BadgeCheck className="size-4 text-primary" /> Reviews are usually completed within one
              business day.
            </p>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}
