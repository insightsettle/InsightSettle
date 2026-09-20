import { supabase } from "@/integrations/supabase/client";

export type FeePayer = "buyer" | "seller" | "split";

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
  fee_payer: string;
  inspection_days: number;
  delivered_at: string | null;
  auto_release_at: string | null;
  terms_status: string;
  terms_note: string | null;
  shipping_carrier: string | null;
  shipping_tracking: string | null;
  shipping_status: string | null;
  refunded_amount: number;
};

export const feePayerLabels: Record<string, string> = {
  buyer: "Buyer pays the fee",
  seller: "Seller pays the fee",
  split: "Fee split 50/50",
};

export const shippingStatusLabels: Record<string, string> = {
  not_required: "No shipping needed",
  preparing: "Preparing the shipment",
  shipped: "Shipped",
  in_transit: "In transit",
  delivered: "Delivered to the buyer",
};

/** How the platform fee is charged to each side. */
export function splitFee(amount: number, fee: number, payer: string) {
  if (payer === "seller") return { buyerPays: amount, sellerReceives: amount - fee };
  if (payer === "split")
    return { buyerPays: amount + fee / 2, sellerReceives: amount - fee / 2 };
  return { buyerPays: amount + fee, sellerReceives: amount };
}

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
  feePayer: FeePayer;
  inspectionDays: number;
  shippingRequired: boolean;
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
      fee_payer: input.feePayer,
      inspection_days: input.inspectionDays,
      shipping_status: input.shippingRequired ? "preparing" : "not_required",
      terms_status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("deal_events").insert({
    deal_id: data.id,
    actor_id: uid,
    title: "Deal created and invitation link generated",
    note: `Fee: ${input.feePayer} · inspection period: ${input.inspectionDays} day(s)`,
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
