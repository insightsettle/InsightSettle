import { supabase } from "@/integrations/supabase/client";

export type KycDocument = {
  id: string;
  user_id: string;
  doc_type: string;
  file_path: string;
  file_name: string;
  status: string;
  review_note: string | null;
  created_at: string;
};

export const kycDocTypes = [
  { value: "national_id", label: "National ID / Iqama" },
  { value: "passport", label: "Passport" },
  { value: "commercial_register", label: "Commercial register" },
  { value: "bank_statement", label: "Bank statement" },
  { value: "other", label: "Other document" },
] as const;

export async function listMyKycDocuments() {
  const { data, error } = await supabase
    .from("kyc_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KycDocument[];
}

export async function uploadKycDocument(file: File, docType: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You need to sign in first.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Each file must be 10 MB or smaller.");

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const path = `${uid}/${Date.now()}-${safeName}`;
  const upload = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: false });
  if (upload.error) throw upload.error;

  const { error } = await supabase.from("kyc_documents").insert({
    user_id: uid,
    doc_type: docType,
    file_path: path,
    file_name: safeName,
  });
  if (error) throw error;
}

export async function deleteKycDocument(doc: KycDocument) {
  await supabase.storage.from("kyc-documents").remove([doc.file_path]);
  const { error } = await supabase.from("kyc_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

export async function kycDocumentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("kyc-documents")
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

/** Staff view: every submitted document. */
export async function listAllKycDocuments() {
  const { data, error } = await supabase
    .from("kyc_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KycDocument[];
}

export async function reviewKycDocument(input: {
  id: string;
  status: "approved" | "rejected";
  note: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("kyc_documents")
    .update({
      status: input.status,
      review_note: input.note || null,
      reviewed_by: auth.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw error;
}
