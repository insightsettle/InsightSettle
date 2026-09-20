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

export async function confirmDelivery(dealId: string) {
  await setStatus(dealId, "delivered");
  await logEvent(dealId, "Seller confirmed delivery");
  await announce(
    dealId,
    "The seller confirmed delivery",
    "You can now review and release the funds.",
  );
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
