import { supabase } from "@/integrations/supabase/client";

export type DealRow = {
  id: string;
  ref: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  buyer_id: string | null;
  seller_id: string | null;
  created_by: string;
  counterparty_email: string | null;
  invite_token: string;
  status: string;
  due_at: string | null;
  created_at: string;
  fee_override_percent: number | null;
  fee_override_flat: number | null;
  fee_override_note: string | null;
  disputed_reason: string | null;
  released_at: string | null;
};

export async function listMyDeals() {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DealRow[];
}

export async function getDealByRef(ref: string) {
  const { data, error } = await supabase.from("deals").select("*").eq("ref", ref).maybeSingle();
  if (error) throw error;
  return (data ?? null) as DealRow | null;
}

export async function createDeal(input: {
  title: string;
  description: string;
  amount: number;
  currency: string;
  role: "buyer" | "seller";
  counterpartyEmail: string;
  dueAt: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You need to sign in first.");

  const { data, error } = await supabase
    .from("deals")
    .insert({
      title: input.title,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      created_by: uid,
      buyer_id: input.role === "buyer" ? uid : null,
      seller_id: input.role === "seller" ? uid : null,
      counterparty_email: input.counterpartyEmail || null,
      due_at: input.dueAt,
    })
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("deal_events").insert({
    deal_id: data.id,
    actor_id: uid,
    title: "Deal created and invitation link generated",
  });

  return data as DealRow;
}

export async function listDealEvents(dealId: string) {
  const { data, error } = await supabase
    .from("deal_events")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
