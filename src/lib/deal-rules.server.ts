import { fundingBlockReason, type FeeBreakdown } from "@/lib/fees";

/** Latest terms version row for a deal. */
export async function latestTerms(admin: any, dealId: string) {
  const { data } = await admin
    .from("deal_term_versions")
    .select("*")
    .eq("deal_id", dealId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as null | { id: string; version: number; created_by: string | null; accepted_by: string | null; accepted_at: string | null };
}

/** D-24 / R-01: the supplier must hold a verified payout account in the deal (payout) currency. */
export async function supplierPayoutOk(admin: any, deal: { seller_id: string | null; currency: string }) {
  if (!deal.seller_id) return false;
  const { data } = await admin.from("payout_accounts").select("verified, currency").eq("user_id", deal.seller_id).maybeSingle();
  return !!data?.verified && data.currency === deal.currency;
}

export const PAYOUT_ACCOUNT_MESSAGE =
  "Add a verified payout bank account in the deal currency (Profile → Settlement bank account) before accepting these terms.";

/** Returns a reason the deal cannot be funded, or null. */
export async function fundingGuard(admin: any, dealId: string) {
  const { data: deal } = await admin.from("deals").select("*").eq("id", dealId).maybeSingle();
  if (!deal) return "Deal not found.";
  const terms = await latestTerms(admin, dealId);
  return fundingBlockReason({
    status: deal.status,
    bothJoined: !!deal.buyer_id && !!deal.seller_id,
    termsStatus: deal.terms_status,
    latestVersionAccepted: !!terms && terms.version === deal.terms_version && !!terms.accepted_at,
    supplierPayoutOk: await supplierPayoutOk(admin, deal),
  });
}

/** Fee breakdown locked by the buyer's funding quote (falls back to a live price). */
export async function getDealPricingLocked(admin: any, deal: any): Promise<FeeBreakdown> {
  const { data: fund } = await admin
    .from("deal_transactions")
    .select("fx_quote_id")
    .eq("deal_id", deal.id)
    .eq("kind", "funding")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fund?.fx_quote_id) {
    const { data: q } = await admin.from("fx_quotes").select("breakdown").eq("id", fund.fx_quote_id).maybeSingle();
    if (q?.breakdown?.breakdown) return q.breakdown.breakdown;
  }
  const { data: full } = await admin.from("deals").select("*").eq("id", deal.id).single();
  const { priceDeal } = await import("@/lib/pricing.server");
  return (await priceDeal(admin, full)).breakdown;
}
