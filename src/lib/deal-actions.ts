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

async function setStatus(dealId: string, status: string) {
  const { error } = await supabase
    .from("deals")
    .update({
      status,
      ...(status === "released" ? { released_at: new Date().toISOString() } : {}),
    })
    .eq("id", dealId);
  if (error) throw error;
}

export async function confirmDelivery(dealId: string, inspectionDays = 3) {
  const now = new Date();
  const autoRelease = new Date(now.getTime() + inspectionDays * 24 * 60 * 60 * 1000);
  const { error } = await supabase
    .from("deals")
    .update({
      status: "delivered",
      shipping_status: "delivered",
      delivered_at: now.toISOString(),
      auto_release_at: autoRelease.toISOString(),
    })
    .eq("id", dealId);
  if (error) throw error;
  await logEvent(
    dealId,
    "Seller confirmed delivery",
    `Buyer inspection period ends ${autoRelease.toISOString().slice(0, 10)}`,
  );
  await announce(
    dealId,
    "The seller confirmed delivery",
    `You can review and release the funds. If you take no action the funds release automatically after ${inspectionDays} day(s).`,
  );
}

export type TermVersion = { id: string; version: number; snapshot: Record<string, unknown>; note: string | null; created_at: string };

export async function listTermVersions(dealId: string) {
  const { data, error } = await supabase.from("deal_term_versions").select("*").eq("deal_id", dealId).order("version");
  if (error) throw error;
  return (data ?? []) as TermVersion[];
}

export async function proposeNewTerms(
  dealId: string,
  changes: { amount?: number; quantity?: number; due_at?: string | null; inspection_days?: number; note: string },
) {
  const user = await currentUser();
  const { data: deal, error } = await supabase.from("deals").select("*").eq("id", dealId).single();
  if (error) throw error;
  const next = (Number((deal as any).terms_version) || 1) + 1;
  const patch: Record<string, unknown> = { terms_version: next, terms_status: "pending", terms_note: changes.note };
  if (changes.amount) patch["amount"] = changes.amount;
  if (changes.quantity) patch["quantity"] = changes.quantity;
  if (changes.due_at !== undefined) patch["due_at"] = changes.due_at;
  if (changes.inspection_days !== undefined) patch["inspection_days"] = changes.inspection_days;
  const { data: updated, error: upErr } = await supabase.from("deals").update(patch as any).eq("id", dealId).select("*").single();
  if (upErr) throw upErr;
  const { termsSnapshot } = await import("@/lib/deals");
  await supabase.from("deal_term_versions").insert({
    deal_id: dealId, version: next, snapshot: termsSnapshot(updated as any) as any, note: changes.note, created_by: user.id,
  });
  await logEvent(dealId, `Terms version ${next} proposed`, changes.note);
  await announce(dealId, `New terms (version ${next}) need your agreement`, changes.note);
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

export async function agreeToTerms(dealId: string) {
  const { error } = await supabase
    .from("deals")
    .update({ terms_status: "agreed", terms_note: null })
    .eq("id", dealId);
  if (error) throw error;
  await logEvent(dealId, "Deal terms accepted by both parties");
  await announce(dealId, "The deal terms were accepted", "The buyer can now fund the deal.");
}

export async function requestTermsChange(dealId: string, note: string) {
  const { error } = await supabase
    .from("deals")
    .update({ terms_status: "changes_requested", terms_note: note })
    .eq("id", dealId);
  if (error) throw error;
  await logEvent(dealId, "Changes requested on the deal terms", note);
  await announce(dealId, "The other party requested changes to the terms", note);
}

export async function rejectTerms(dealId: string, note: string) {
  const { error } = await supabase
    .from("deals")
    .update({ terms_status: "rejected", terms_note: note, status: "rejected" })
    .eq("id", dealId);
  if (error) throw error;
  await logEvent(dealId, "Deal terms rejected", note);
  await announce(dealId, "The other party rejected the deal terms", note);
}

export async function updateShipping(
  dealId: string,
  input: { carrier: string; tracking: string; status: string; eta?: string | null },
) {
  const { error } = await supabase
    .from("deals")
    .update({
      shipping_carrier: input.carrier || null,
      shipping_tracking: input.tracking || null,
      shipping_status: input.status,
      ...(input.eta ? { estimated_delivery_at: input.eta } : {}),
      ...(["shipped", "in_transit", "out_for_delivery"].includes(input.status) ? { shipped_at: new Date().toISOString() } : {}),
    } as any)
    .eq("id", dealId);
  if (error) throw error;
  await logEvent(
    dealId,
    "Shipping details updated",
    `${input.carrier || "Carrier"} · ${input.tracking || "no tracking number"} · ${input.status}`,
  );
  await announce(
    dealId,
    "Shipping details were updated",
    `${input.carrier || "Carrier"} · ${input.tracking || "no tracking number"}`,
  );
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


export async function requestReview(dealId: string, note: string) {
  await setStatus(dealId, "under_review");
  await logEvent(dealId, "Buyer asked for a revision before releasing funds", note);
  await announce(dealId, "The buyer asked for a revision", note);
}

export async function openDispute(dealId: string, reason: string) {
  const { error } = await supabase
    .from("deals")
    .update({ status: "disputed", disputed_reason: reason })
    .eq("id", dealId);
  if (error) throw error;
  await logEvent(dealId, "Arbitration requested", reason);
  await announce(dealId, "Arbitration was requested on this deal", reason, true);
}

export async function contactSupport(dealId: string, note: string) {
  await logEvent(dealId, "Member asked Insight support for help", note);
  await announce(dealId, "A member asked Insight support for help", note, true);
}
