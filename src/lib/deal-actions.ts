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
    .update({ terms_status: "rejected", terms_note: note })
    .eq("id", dealId);
  if (error) throw error;
  await logEvent(dealId, "Deal terms rejected", note);
  await announce(dealId, "The other party rejected the deal terms", note);
}

export async function updateShipping(
  dealId: string,
  input: { carrier: string; tracking: string; status: string },
) {
  const { error } = await supabase
    .from("deals")
    .update({
      shipping_carrier: input.carrier || null,
      shipping_tracking: input.tracking || null,
      shipping_status: input.status,
    })
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
