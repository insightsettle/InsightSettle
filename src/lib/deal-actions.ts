import { supabase } from "@/integrations/supabase/client";

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

export async function markFunded(dealId: string) {
  await setStatus(dealId, "held");
  await logEvent(dealId, "Buyer funded the deal — funds are protected", "Sample payment data");
}

export async function confirmDelivery(dealId: string) {
  await setStatus(dealId, "delivered");
  await logEvent(dealId, "Seller confirmed delivery");
}

export async function releaseFunds(dealId: string) {
  await setStatus(dealId, "released");
  await logEvent(dealId, "Buyer released the funds to the seller", "Sample payment data");
}

export async function requestReview(dealId: string, note: string) {
  await setStatus(dealId, "under_review");
  await logEvent(dealId, "Buyer asked for a revision before releasing funds", note);
}

export async function openDispute(dealId: string, reason: string) {
  const { error } = await supabase
    .from("deals")
    .update({ status: "disputed", disputed_reason: reason })
    .eq("id", dealId);
  if (error) throw error;
  await logEvent(dealId, "Arbitration requested", reason);
}

export async function contactSupport(dealId: string, note: string) {
  await logEvent(dealId, "Member asked Insight support for help", note);
}
