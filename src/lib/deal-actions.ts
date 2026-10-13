import { supabase } from "@/integrations/supabase/client";
import { notifyDealActivity } from "@/lib/notifications.functions";

export type DealMessage = {
  id: string;
  body: string;
  author_name: string;
  author_kind: string;
  created_at: string;
};

export type DealEvent = {
  id: string;
  title: string;
  note: string | null;
  created_at: string;
};

export type DealTransactionRow = {
  id: string;
  kind: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  provider: string;
  provider_ref: string | null;
  error_message: string | null;
  note: string | null;
  created_at: string;
};

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You need to sign in first.");
  return data.user;
}

async function logEvent(dealId: string, title: string, note?: string | null) {
  const user = await currentUser();
  await supabase.from("deal_events").insert({
    deal_id: dealId,
    actor_id: user.id,
    title,
    note: note ?? null,
  });
}

async function announce(dealId: string, title: string, body?: string | null, alertStaff = false) {
  try {
    await notifyDealActivity({ data: { dealId, title, body: body ?? null, alertStaff } });
  } catch {
    // Notifications must never block the deal action itself.
  }
}

export async function listDealMessages(dealId: string) {
  const { data, error } = await supabase
    .from("deal_messages")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DealMessage[];
}

export async function postDealMessage(dealId: string, body: string) {
  const user = await currentUser();
  const name = (user.user_metadata?.["full_name"] as string | undefined) || user.email || "Member";
  const { error } = await supabase.from("deal_messages").insert({
    deal_id: dealId,
    author_id: user.id,
    author_name: name,
    author_kind: "party",
    body,
  });
  if (error) throw error;
  await announce(dealId, `New message from ${name}`, body.slice(0, 200));
}

export async function listTimeline(dealId: string) {
  const { data, error } = await supabase
    .from("deal_events")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DealEvent[];
}

export async function listDealTransactions(dealId: string) {
  const { data, error } = await supabase
    .from("deal_transactions")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
    fee: Number(row.fee ?? 0),
  })) as DealTransactionRow[];
}



export type TermVersion = { id: string; version: number; snapshot: Record<string, unknown>; note: string | null; created_at: string };

export async function listTermVersions(dealId: string) {
  const { data, error } = await supabase.from("deal_term_versions").select("*").eq("deal_id", dealId).order("version");
  if (error) throw error;
  return (data ?? []) as TermVersion[];
}


export type DealAttachment = { id: string; category: string; file_path: string; file_name: string; created_at: string };

export async function listAttachments(dealId: string) {
  const { data, error } = await supabase.from("deal_attachments").select("*").eq("deal_id", dealId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DealAttachment[];
}

export async function uploadDealFile(dealId: string, file: File, category: string) {
  const user = await currentUser();
  if (file.size > 10 * 1024 * 1024) throw new Error("Each file must be 10 MB or smaller.");
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const path = `${dealId}/${Date.now()}-${safe}`;
  const up = await supabase.storage.from("deal-files").upload(path, file);
  if (up.error) throw up.error;
  const { error } = await supabase.from("deal_attachments").insert({ deal_id: dealId, uploaded_by: user.id, category, file_path: path, file_name: safe });
  if (error) throw error;
  await logEvent(dealId, `File uploaded: ${safe}`, category);
  return path;
}

export async function dealFileUrl(path: string) {
  const { data, error } = await supabase.storage.from("deal-files").createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

export type DisputeRow = {
  id: string; reason: string; details: string; status: string; outcome: string | null; buyer_percent: number | null;
  resolution_note: string | null; response_deadline: string; evidence_deadline: string; resolution_deadline: string; created_at: string;
};

export async function getOpenDispute(dealId: string) {
  const { data } = await supabase.from("disputes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data ?? null) as DisputeRow | null;
}

export async function addDisputeEvidence(dealId: string, disputeId: string, note: string, file?: File | null) {
  const user = await currentUser();
  let path: string | null = null;
  let name: string | null = null;
  if (file) {
    path = await uploadDealFile(dealId, file, "dispute_evidence");
    name = file.name;
  }
  const { error } = await supabase.from("dispute_evidence").insert({ dispute_id: disputeId, uploaded_by: user.id, note: note || null, file_path: path, file_name: name });
  if (error) throw error;
  await announce(dealId, "New dispute evidence was added", note || name, true);
}

export async function getTaxInvoice(dealId: string) {
  const { data } = await supabase.from("tax_invoices").select("*").eq("deal_id", dealId).maybeSingle();
  return data as null | { invoice_number: string; fee: number; vat_rate: number; vat: number; total: number; currency: string; issued_at: string };
}





export type DealRating = {
  id: string;
  deal_id: string;
  rater_id: string;
  ratee_id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

export async function listDealRatings(dealId: string) {
  const { data, error } = await supabase.from("deal_ratings").select("*").eq("deal_id", dealId);
  if (error) throw error;
  return (data ?? []) as DealRating[];
}

export async function listRatingsForUser(userId: string) {
  const { data, error } = await supabase.from("deal_ratings").select("*").eq("ratee_id", userId);
  if (error) throw error;
  return (data ?? []) as DealRating[];
}

export async function submitRating(input: {
  dealId: string;
  rateeId: string;
  score: number;
  comment: string;
}) {
  const user = await currentUser();
  const { error } = await supabase.from("deal_ratings").upsert(
    {
      deal_id: input.dealId,
      rater_id: user.id,
      ratee_id: input.rateeId,
      score: input.score,
      comment: input.comment || null,
    },
    { onConflict: "deal_id,rater_id" },
  );
  if (error) throw error;
  await logEvent(input.dealId, `Counterparty rated ${input.score}/5`, input.comment || null);
}




export async function contactSupport(dealId: string, note: string) {
  await logEvent(dealId, "Member asked Insight support for help", note);
  await announce(dealId, "A member asked Insight support for help", note, true);
}
