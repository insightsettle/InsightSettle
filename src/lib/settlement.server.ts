import { disputeSplit, fundingLedger, releaseLedger, type FeeBreakdown, type PayInQuote } from "@/lib/fees";
import { roundMoney } from "@/lib/money";

async function lockedPricing(admin: any, dealId: string): Promise<{ breakdown: FeeBreakdown; payIn: PayInQuote } | null> {
  const { data: fund } = await admin
    .from("deal_transactions")
    .select("fx_quote_id")
    .eq("deal_id", dealId)
    .eq("kind", "funding")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!fund?.fx_quote_id) return null;
  const { data: q } = await admin.from("fx_quotes").select("breakdown").eq("id", fund.fx_quote_id).maybeSingle();
  return q?.breakdown?.breakdown ? q.breakdown : null;
}

/** Ledger rows (balanced per currency) and the tax invoice, from the same locked quote numbers. */
async function writeLedgerAndInvoice(admin: any, tx: any, ref: string) {
  const pricing = tx.kind === "refund" ? null : await lockedPricing(admin, tx.deal_id);
  let rows: { account: string; debit: number; credit: number; currency: string }[];
  if (tx.kind === "funding" && pricing) {
    rows = fundingLedger(pricing.breakdown, pricing.payIn);
    const b = pricing.breakdown;
    const lines = [
      { party: "buyer", fee: pricing.payIn.insightFee, vat_rate: b.buyerVatRate, vat: pricing.payIn.vatPayable, currency: pricing.payIn.payCurrency },
      { party: "supplier", fee: b.sellerShare, vat_rate: b.sellerVatRate, vat: b.sellerVat, currency: b.currency },
    ].filter((l) => l.fee > 0);
    const first = lines[0];
    if (first)
      await admin.from("tax_invoices").upsert(
        {
          deal_id: tx.deal_id,
          fee: first.fee,
          vat_rate: first.vat_rate,
          vat: first.vat,
          total: roundMoney(first.fee + first.vat, first.currency),
          currency: first.currency,
          lines,
        },
        { onConflict: "deal_id", ignoreDuplicates: true },
      );
  } else if (tx.kind === "release" && pricing) {
    const b = pricing.breakdown;
    // C09-D15: never infer gross from amount: newly created dispute payouts already contain net.
    const decisionKey = /-RELEASE-([0-9a-f]{8})$/.exec(String(tx.idempotency_key ?? ""));
    if (tx.release_part === "dispute" || decisionKey) {
      const { data: decisions, error } = await admin.from("disputes").select("id, buyer_percent, outcome")
        .eq("deal_id", tx.deal_id).is("milestone_id", null).eq("status", "resolved");
      if (error) throw error;
      const decisionPrefix = decisionKey?.[1];
      const decision = decisions?.find((d: any) => decisionPrefix && String(d.id).startsWith(decisionPrefix));
      if (!decision) throw new Error("The locked dispute decision is missing.");
      const pct = decision.outcome === "full_release" ? 0 : decision.outcome === "full_refund" ? 100 : Number(decision.buyer_percent);
      const p = disputeSplit(b, pct);
      await admin.from("deal_transactions").update({ amount: p.supplierNet, fee: p.sellerShare, currency: b.currency }).eq("id", tx.id);
      rows = p.ledger;
    } else {
      // The supplier receives the deal amount less its fee share and VAT; keep the record consistent.
      await admin.from("deal_transactions").update({ amount: b.supplierNet, fee: b.sellerShare, currency: b.currency }).eq("id", tx.id);
      rows = releaseLedger(b);
    }
  } else {
    const amt = Number(tx.amount);
    rows = [
      { account: "escrow_held", debit: amt, credit: 0, currency: tx.currency },
      { account: tx.kind === "release" ? "supplier_payable" : "buyer_refund_payable", debit: 0, credit: amt, currency: tx.currency },
    ];
  }
  await admin.from("ledger_entries").insert(
    rows
      .filter((r) => r.debit !== 0 || r.credit !== 0)
      .map((r) => ({ ...r, deal_id: tx.deal_id, transaction_id: tx.id, reference: ref })),
  );
}

export const SIMULATED_CONFIRMATION = "Confirmed by the payment provider (simulated)";

type SettleInput = {
  transactionId: string;
  outcome: "succeeded" | "failed";
  providerRef?: string | null | undefined;
  reason?: string | null | undefined;
  actorId: string | null;
};

/** The one settlement path: used by staff (connected provider) and by the simulated provider. */
export async function settleTransactionCore(admin: any, notify: any, data: SettleInput) {
  const { data: tx, error: txError } = await admin
    .from("deal_transactions")
    .select("*")
    .eq("id", data.transactionId)
    .maybeSingle();
  if (txError) throw txError;
  if (!tx) throw new Error("Transaction not found.");
  if (!["pending", "processing"].includes(tx.status))
    return { ok: true, status: tx.status, dealStatus: null as string | null };
  if (data.outcome === "failed" && !data.reason)
    throw new Error("A failure needs a reason so both parties understand what happened.");

  let auctionDeal: any = null;
  let auctionAccount: string | null = null;
  if (tx.payout_split_id || tx.auction_dispute_id) {
    const { data: auction, error: auctionError } = await admin.from('deals').select('*').eq('id', tx.deal_id).maybeSingle();
    if (auctionError) throw auctionError;
    if (!auction || auction.deal_type !== 'auction') throw new Error('Auction transaction requires an auction deal.');
    const pricing = await lockedPricing(admin, tx.deal_id);
    if (!pricing) throw new Error('Auction funding pricing is missing.');
    const { validateAuctionLeg } = await import('./auction-settlement.server');
    auctionAccount = await validateAuctionLeg(admin, tx, auction, pricing.breakdown);
    auctionDeal = auction;
  }

  const { data: updated, error } = await admin
    .from("deal_transactions")
    .update({
      status: data.outcome,
      provider_ref: data.providerRef ?? tx.provider_ref,
      error_message: data.outcome === "failed" ? data.reason : null,
      note: data.outcome === "succeeded" ? (data.reason ?? tx.note) : tx.note,
    })
    .eq("id", tx.id)
    .in("status", ["pending", "processing"])
    .select("id");
  if (error) throw error;
  if (!updated?.length) return { ok: true, status: data.outcome, dealStatus: null };

  const { data: deal } = await admin
    .from("deals")
    .select("id, ref, status")
    .eq("id", tx.deal_id)
    .maybeSingle();

  const ref = data.providerRef ?? tx.id;
  let newStatus: string | null = null;
  let milestoneHandled = false;
  if (data.outcome === "succeeded" && (tx.milestone_id || tx.release_part === "retention")) {
    const { settleMilestoneTx } = await import("@/lib/milestones.server");
    milestoneHandled = await settleMilestoneTx(admin, tx, ref);
  }
  if (data.outcome === 'succeeded' && auctionDeal && auctionAccount) {
    const { settleAuctionLeg } = await import('./auction-settlement.server');
    newStatus = await settleAuctionLeg(admin, tx, auctionDeal, auctionAccount, ref);
    milestoneHandled = true;
  }
  if (data.outcome === "succeeded" && !milestoneHandled) {
    if (tx.kind === "funding") newStatus = "held";
    if (tx.kind === "release") newStatus = "released";
    if (tx.kind === "refund") newStatus = "refunded";
  }
  // A staff decision may already have set the final outcome (e.g. a partial refund); do not overwrite it.
  const finalStatuses = ["released", "refunded", "partially_refunded"];
  if (newStatus === "held" && deal) {
    const { markMilestonesFunded } = await import("@/lib/milestones.server");
    if (await markMilestonesFunded(admin, deal.id)) {
      await writeLedgerAndInvoice(admin, tx, ref);
      newStatus = "in_progress";
    }
  }
  if (!auctionDeal && newStatus && newStatus !== "in_progress" && deal && !(tx.kind !== "funding" && finalStatuses.includes(deal.status))) {
    await admin
      .from("deals")
      .update({
        status: newStatus,
        ...(newStatus === "released" ? { released_at: new Date().toISOString() } : {}),
      })
      .eq("id", deal.id);
  }
  if (!auctionDeal && newStatus && newStatus !== "in_progress" && deal) {
    await writeLedgerAndInvoice(admin, tx, ref);
  }

  const kindLabel =
    tx.release_part === "retention" ? "Retention payout" : tx.milestone_id ? (tx.kind === "release" ? "Milestone payout" : "Milestone refund")
      : tx.kind === "funding" ? "Funding" : tx.kind === "release" ? "Payout" : "Refund";
  const simulated = data.actorId === null && data.outcome === "succeeded";
  const label = simulated
    ? SIMULATED_CONFIRMATION
    : data.outcome === "succeeded"
      ? `${kindLabel} confirmed by the payment provider`
      : `${kindLabel} failed`;

  await admin.from("deal_events").insert({
    deal_id: tx.deal_id,
    actor_id: data.actorId,
    title: label,
    note: simulated ? `${kindLabel} · ${data.providerRef ?? ""}`.trim() : (data.reason ?? data.providerRef ?? null),
  });
  await notify.notifyDealParties(admin, tx.deal_id, {
    title: `${label} — ${deal?.ref ?? ""}`.trim(),
    body: simulated ? kindLabel : (data.reason ?? null),
    kind: "payment",
  });
  return { ok: true, status: data.outcome, dealStatus: newStatus };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Simulated provider: confirms money steps automatically (no staff action). No-op when a real provider is connected. */
export async function simulateProviderConfirm(admin: any, notify: any, transactionIds: string[], delayMs = 1500) {
  const { getPaymentProvider } = await import("@/lib/payment-provider.server");
  if (getPaymentProvider().connected || transactionIds.length === 0) return 0;
  if (delayMs > 0) await sleep(delayMs);
  let n = 0;
  // Funding first, then refunds/releases, in creation order.
  const { data: txs } = await admin
    .from("deal_transactions")
    .select("id, kind, created_at")
    .in("id", transactionIds)
    .in("status", ["pending", "processing"])
    .order("created_at");
  for (const t of txs ?? []) {
    await settleTransactionCore(admin, notify, {
      transactionId: t.id,
      outcome: "succeeded",
      providerRef: `SIM-${String(t.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      reason: SIMULATED_CONFIRMATION,
      actorId: null,
    });
    n += 1;
  }
  return n;
}

/** Sweeps simulated transactions left processing (e.g. created by the auto-release job). */
export async function sweepSimulatedTransactions(admin: any, notify: any) {
  const { data } = await admin
    .from("deal_transactions")
    .select("id")
    .eq("provider", "manual")
    .in("status", ["pending", "processing"])
    .lt("created_at", new Date(Date.now() - 10_000).toISOString())
    .limit(20);
  return simulateProviderConfirm(admin, notify, (data ?? []).map((r: any) => r.id), 0);
}
