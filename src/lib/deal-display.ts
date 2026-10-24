import type { DealRow } from "@/lib/deals";
import { roundMoney } from "@/lib/money";
import type { FxQuote } from "@/lib/fx-quotes.functions";

/** Presentation only: allocate the provider's spread to the converted amount so displayed rows reconcile. */
export function quoteAmountLine(quote: Pick<FxQuote, "total" | "fee" | "vat" | "target_currency">) {
  return roundMoney(quote.total - quote.fee - quote.vat, quote.target_currency);
}

/** Correct legacy event wording for display only; the stored financial record stays untouched. */
export function paymentEventNote(note: string, transactions: { kind: string; provider_ref: string | null }[]): readonly [string, string] | null {
  if (!note.startsWith("Milestone refund · ")) return null;
  const reference = note.slice("Milestone refund · ".length);
  if (!transactions.some((tx) => tx.kind === "funding" && tx.provider_ref === reference)) return null;
  return [`Milestone funding · ${reference}`, `تمويل المرحلة · ${reference}`];
}

/** Mirrors the existing party controls; never authorizes or changes a deal. */
export function clientAction(deal: DealRow, uid: string | undefined, milestones: { deal_id: string; status: string }[] = []): string | null {
  if (!uid || deal.frozen || ["released", "completed", "refunded", "partially_refunded", "cancelled", "rejected", "disputed"].includes(deal.status)) return null;
  const buyer = deal.buyer_id === uid;
  const seller = deal.seller_id === uid;
  if (!buyer && !seller) return null;
  if (deal.terms_status !== "agreed") return deal.buyer_id && deal.seller_id && deal.created_by !== uid ? "Accept the terms" : null;
  if (buyer && deal.status === "in_progress" && milestones.some((m) => m.deal_id === deal.id && m.status === "submitted")) return "Approve and release";
  if (buyer && deal.status === "pending_funding") return "Fund the deal";
  if (seller && deal.status === "held") return deal.shipping_status !== "not_required" && !deal.shipping_tracking ? "Update shipping" : "Confirm delivery";
  if (buyer && ["delivered", "under_review"].includes(deal.status)) return "Release the funds";
  return null;
}