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
  quantity: number;
  unit_price: number | null;
  supplier_country: string | null;
  delivery_country: string | null;
  shipping_responsibility: string;
  acceptance_criteria: string | null;
  refund_conditions: string | null;
  cancellation_conditions: string | null;
  shipped_at: string | null;
  estimated_delivery_at: string | null;
  auto_release_enabled: boolean;
  frozen: boolean;
  frozen_reason: string | null;
  terms_version: number;
  cancelled_at: string | null;
};

export const gccCountries = [
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "BH", name: "Bahrain" },
  { code: "QA", name: "Qatar" },
  { code: "KW", name: "Kuwait" },
  { code: "OM", name: "Oman" },
  { code: "OTHER", name: "Outside the Gulf" },
] as const;

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
  out_for_delivery: "Out for delivery",
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
  quantity?: number;
  unitPrice?: number | null;
  supplierCountry?: string | null;
  deliveryCountry?: string | null;
  shippingResponsibility?: "seller" | "buyer" | "none";
  acceptanceCriteria?: string;
  refundConditions?: string;
  cancellationConditions?: string;
  autoRelease?: boolean;
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
      quantity: input.quantity ?? 1,
      unit_price: input.unitPrice ?? null,
      supplier_country: input.supplierCountry || null,
      delivery_country: input.deliveryCountry || null,
      shipping_responsibility: input.shippingResponsibility ?? "seller",
      acceptance_criteria: input.acceptanceCriteria || null,
      refund_conditions: input.refundConditions || null,
      cancellation_conditions: input.cancellationConditions || null,
      auto_release_enabled: input.autoRelease ?? true,
    } as any)
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("deal_events").insert({
    deal_id: data.id,
    actor_id: uid,
    title: "Deal created and invitation link generated",
    note: `Fee: ${input.feePayer} · inspection period: ${input.inspectionDays} day(s)`,
  });

  await supabase.from("deal_term_versions").insert({
    deal_id: data.id,
    version: 1,
    snapshot: termsSnapshot(data as unknown as DealRow),
    note: "Initial terms",
    created_by: uid,
  });

  return data as unknown as DealRow;
}

export function termsSnapshot(d: DealRow) {
  return {
    title: d.title,
    amount: Number(d.amount),
    currency: d.currency,
    quantity: Number(d.quantity ?? 1),
    unit_price: d.unit_price,
    due_at: d.due_at,
    inspection_days: d.inspection_days,
    fee_payer: d.fee_payer,
    shipping_responsibility: d.shipping_responsibility,
    acceptance_criteria: d.acceptance_criteria,
    refund_conditions: d.refund_conditions,
    cancellation_conditions: d.cancellation_conditions,
  };
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
