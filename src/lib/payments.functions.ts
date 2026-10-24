import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DealTransaction = {
  id: string;
  deal_id: string;
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

export type PaymentResult = {
  ok: boolean;
  status: string;
  provider: string;
  providerLabel: string;
  message: string;
  transactionId?: string;
};

function mapTransaction(row: any): DealTransaction {
  return {
    id: row.id,
    deal_id: row.deal_id,
    kind: row.kind,
    amount: Number(row.amount),
    fee: Number(row.fee ?? 0),
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    provider_ref: row.provider_ref ?? null,
    error_message: row.error_message ?? null,
    note: row.note ?? null,
    created_at: row.created_at,
  };
}

/** Supplier net and supplier fee share from the locked funding quote. */
async function releaseFigures(admin: any, deal: any) {
  const { getDealPricingLocked } = await import("@/lib/deal-rules.server");
  const b = await getDealPricingLocked(admin, deal);
  return { amount: b.supplierNet, fee: b.sellerShare, currency: b.currency };
}

async function loadDealForParty(context: { supabase: any; userId: string }, dealId: string) {
  const { data, error } = await context.supabase
    .from("deals")
    .select("id, ref, amount, currency, status, buyer_id, seller_id, fee_override_percent, fee_override_flat, fee_payer, terms_version, deal_type, auction_lot_id, funding_mode")
    .eq("id", dealId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This deal is not available for your account.");
  if (data.buyer_id !== context.userId && data.seller_id !== context.userId)
    throw new Error("You are not a party to this deal.");
  return data;
}

async function serverDeps() {
  const [{ supabaseAdmin }, { getPaymentProvider }, notify] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("@/lib/payment-provider.server"),
    import("@/lib/notify.server"),
  ]);
  return { admin: supabaseAdmin as any, provider: getPaymentProvider(), notify };
}

type Deps = Awaited<ReturnType<typeof serverDeps>>;

/**
 * Per-milestone funding (D-43): the buyer funds the next milestone from a live quote for that milestone.
 * Same rules as whole-deal funding: one live funding per milestone, the quote is claimed once, a repeat click
 * returns the funding already recorded, and the simulated provider confirms (or declines on request).
 */
async function fundNextMilestone(
  userId: string,
  deal: any,
  data: { quoteId?: string | undefined; simulateDecline?: boolean | undefined },
  { admin, provider, notify }: Deps,
): Promise<PaymentResult> {
  const fail = (message: string): PaymentResult => ({ ok: false, status: "failed", provider: provider.id, providerLabel: provider.label, message });
  const { data: full } = await admin.from("deals").select("*").eq("id", deal.id).single();
  const { milestoneFundingGuard } = await import("@/lib/deal-rules.server");
  const blocked = await milestoneFundingGuard(admin, full);
  if (blocked) return fail(blocked);
  if (!data.quoteId) return fail("Please request an exchange-rate quote before paying.");
  const { data: q } = await admin.from("fx_quotes").select("*").eq("id", data.quoteId).eq("deal_id", deal.id).maybeSingle();
  if (!q || new Date(q.expires_at).getTime() <= Date.now() || q.used_at || !q.breakdown?.milestone || Number(q.breakdown.terms_version) !== Number(full.terms_version))
    return fail("Your exchange rate has expired. Please request a new quote.");
  const { nextUnfundedMilestone } = await import("@/lib/milestones.server");
  const next = await nextUnfundedMilestone(admin, deal.id);
  const m = next?.milestone;
  if (!m || m.id !== q.breakdown.milestone.id || Number(m.amount) !== Number(q.breakdown.milestone.amount))
    return fail("This quote is for a milestone that is no longer waiting for funding. Please request a new quote.");

  // A second click returns the funding already in progress for this milestone.
  const { data: existing } = await admin.from("deal_transactions").select("id, status").eq("milestone_id", m.id)
    .eq("kind", "funding").in("status", ["pending", "processing", "succeeded"]).limit(1).maybeSingle();
  if (existing)
    return { ok: true, status: existing.status, provider: provider.id, providerLabel: provider.label, transactionId: existing.id,
      message: "This funding is already recorded — no second payment was created." };

  const { data: claimed } = await admin.from("fx_quotes").update({ used_at: new Date().toISOString() }).eq("id", q.id).is("used_at", null).select("id");
  if (!claimed?.length) return fail("This exchange-rate quote was already used. Please request a new quote.");
  const { count: failedAttempts } = await admin.from("deal_transactions").select("id", { count: "exact", head: true })
    .eq("milestone_id", m.id).eq("kind", "funding").in("status", ["failed", "cancelled"]);
  const attempt = String((failedAttempts ?? 0) + 1).padStart(3, "0");
  const { data: tx, error } = await admin.from("deal_transactions").insert({
    deal_id: deal.id, kind: "funding", milestone_id: m.id, amount: Number(q.total), fee: Number(q.fee), currency: q.target_currency,
    status: "processing", provider: provider.id, note: provider.notice, created_by: userId,
    idempotency_key: `${deal.ref}-M${m.seq}-PAYMENT-${attempt}`, fx_quote_id: q.id,
  }).select().maybeSingle();
  if (error) {
    if (String(error.code) === "23505")
      return { ok: true, status: "processing", provider: provider.id, providerLabel: provider.label, message: "This funding is already recorded — no second payment was created." };
    throw error;
  }
  await admin.from("deal_events").insert({ deal_id: deal.id, actor_id: userId, title: `Buyer started funding milestone ${m.seq}`, note: `${m.title} · ${provider.notice}` });
  await notify.notifyDealParties(admin, deal.id, { title: `Milestone ${m.seq} funding started for ${deal.ref}`, body: provider.notice, kind: "payment" });
  if (provider.connected) {
    const staff = await notify.staffUserIds(admin);
    await notify.notifyUsers(admin, { dealId: deal.id, title: `Milestone funding started — ${deal.ref}`, body: `The buyer started funding milestone ${m.seq}. The payment provider will confirm it.`, kind: "payment", recipients: staff });
    return { ok: true, status: "processing", provider: provider.id, providerLabel: provider.label, transactionId: tx?.id,
      message: "Payment submitted to the licensed payment provider, which holds the funds. Insight records the confirmation." };
  }
  const { settleTransactionCore, simulateProviderConfirm } = await import("@/lib/settlement.server");
  if (data.simulateDecline && tx?.id) {
    await settleTransactionCore(admin, notify, {
      transactionId: tx.id, outcome: "failed", providerRef: `SIM-DECLINE-${String(tx.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      reason: "The payment provider declined the payment (simulated decline). No money moved; request a new quote to try again.", actorId: null,
    });
    return { ok: false, status: "failed", provider: provider.id, providerLabel: provider.label, transactionId: tx.id,
      message: "Payment declined by the payment provider (simulated). No money moved. Request a new quote to try again." };
  }
  if (tx?.id) await simulateProviderConfirm(admin, notify, [tx.id]);
  return { ok: true, status: "succeeded", provider: provider.id, providerLabel: provider.label, transactionId: tx?.id,
    message: `Milestone ${m.seq} funding confirmed by the payment provider (simulated). In this demo no real money moves.` };
}

/** Buyer starts funding the escrow. The money movement is always recorded. */
export const startDealFunding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string; fee?: number; quoteId?: string; simulateDecline?: boolean }) =>
    z
      .object({
        dealId: z.string().uuid(),
        fee: z.number().min(0).max(1_000_000).optional(),
        quoteId: z.string().uuid().optional(),
        simulateDecline: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PaymentResult> => {
    const deal = await loadDealForParty(context, data.dealId);
    const { admin, provider, notify } = await serverDeps();
    // Account support restrictions must reject before consuming a funding quote.
    const { data: profile, error: profileError } = await admin.from('profiles').select('account_state').eq('id', context.userId).maybeSingle();
    if (profileError || !profile || profile.account_state !== 'active')
      return { ok: false, status: 'failed', provider: provider.id, providerLabel: provider.label, message: 'Your account cannot fund deals while suspended or restricted. Contact Insight support.' };
    // T2: the demo provider can decline a payment on request; never available with a live provider.
    if (data.simulateDecline && (provider.connected || deal.deal_type === "auction"))
      return { ok: false, status: "failed", provider: provider.id, providerLabel: provider.label, message: "A simulated decline is only available in the demo." };

    if (deal.buyer_id !== context.userId)
      return {
        ok: false,
        status: "failed",
        provider: provider.id,
        providerLabel: provider.label,
        message: "Only the buyer can fund this deal.",
      };
    if (deal.funding_mode === "per_milestone" && deal.deal_type !== "auction")
      return fundNextMilestone(context.userId, deal, data, { admin, provider, notify });
    if (deal.status !== "pending_funding")
      return {
        ok: false,
        status: "failed",
        provider: provider.id,
        providerLabel: provider.label,
        message: `This deal is already at the “${String(deal.status).replace("_", " ")}” stage, so it cannot be funded again.`,
      };

    // Idempotency: a second click returns the funding already in progress.
    const { data: existing } = await admin
      .from("deal_transactions")
      .select("id, status")
      .eq("deal_id", deal.id)
      .eq("kind", "funding")
      .in("status", ["pending", "processing", "succeeded"])
      .limit(1)
      .maybeSingle();
    if (existing)
      return {
        ok: true,
        status: existing.status,
        provider: provider.id,
        providerLabel: provider.label,
        transactionId: existing.id,
        message: "This funding is already recorded — no second payment was created.",
      };

    // Terms and payout-account rules are enforced here, not only in the screen.
    const { fundingGuard } = await import("@/lib/deal-rules.server");
    const blocked = await fundingGuard(admin, deal.id);
    if (blocked)
      return { ok: false, status: "failed", provider: provider.id, providerLabel: provider.label, message: blocked };

    // Every funding uses a live, unexpired quote (SAR deals at rate 1) so all numbers match.
    let quote: any = null;
    {
      if (!data.quoteId)
        return {
          ok: false,
          status: "failed",
          provider: provider.id,
          providerLabel: provider.label,
          message: "Please request an exchange-rate quote before paying.",
        };
      const { data: q } = await admin
        .from("fx_quotes")
        .select("*")
        .eq("id", data.quoteId)
        .eq("deal_id", deal.id)
        .maybeSingle();
      if (!q || new Date(q.expires_at).getTime() <= Date.now() || q.used_at || !q.breakdown || Number(q.breakdown.terms_version) !== Number(deal.terms_version))
        return {
          ok: false,
          status: "failed",
          provider: provider.id,
          providerLabel: provider.label,
          message: "Your exchange rate has expired. Please request a new quote.",
        };
      quote = q;
    }

    if (deal.deal_type === 'auction') {
      const { data: transactionId, error: reserveError } = await admin.rpc('reserve_auction_funding', {
        _deal: deal.id, _buyer: context.userId, _quote: quote.id, _provider: provider.id, _note: provider.notice,
      });
      if (reserveError) throw reserveError;
      if (!transactionId) throw new Error('Auction payment was not reserved.');
      await notify.notifyDealParties(admin, deal.id, { title: `Funding started for ${deal.ref}`, body: provider.notice, kind: 'payment' });
      if (!provider.connected) {
        const { simulateProviderConfirm } = await import('@/lib/settlement.server');
        await simulateProviderConfirm(admin, notify, [transactionId]);
      }
      return { ok: true, status: provider.connected ? 'processing' : 'succeeded', provider: provider.id, providerLabel: provider.label, transactionId,
        message: provider.connected ? 'Payment submitted. Paying accepts the lot terms.' : 'Payment confirmed (simulated). Paying accepts the lot terms; no real money moves.' };
    }

    // Claim the quote atomically so one quote can never fund two payments.
    if (quote) {
      const { data: claimed } = await admin
        .from("fx_quotes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", quote.id)
        .is("used_at", null)
        .select("id");
      if (!claimed?.length)
        return {
          ok: false,
          status: "failed",
          provider: provider.id,
          providerLabel: provider.label,
          message: "This exchange-rate quote was already used. Please request a new quote.",
        };
    }
    // A new attempt number after failed/cancelled attempts; repeat clicks reuse the same key.
    const { count: failedAttempts } = await admin
      .from("deal_transactions")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", deal.id)
      .eq("kind", "funding")
      .in("status", ["failed", "cancelled"]);
    const attempt = String((failedAttempts ?? 0) + 1).padStart(3, "0");

    const status = "processing";
    const { data: tx, error } = await admin
      .from("deal_transactions")
      .insert({
        deal_id: deal.id,
        kind: "funding",
        amount: Number(quote.total),
        fee: Number(quote.fee),
        currency: quote.target_currency,
        status,
        provider: provider.id,
        note: provider.notice,
        created_by: context.userId,
        idempotency_key: `${deal.ref}-PAYMENT-${attempt}`,
        fx_quote_id: quote?.id ?? null,
      })
      .select()
      .maybeSingle();
    if (error) {
      if (String(error.code) === "23505")
        return {
          ok: true,
          status,
          provider: provider.id,
          providerLabel: provider.label,
          message: "This funding is already recorded — no second payment was created.",
        };
      throw error;
    }

    await admin.from("deal_events").insert({
      deal_id: deal.id,
      actor_id: context.userId,
      title: "Buyer started funding the escrow",
      note: provider.notice,
    });
    await notify.notifyDealParties(admin, deal.id, {
      title: `Funding started for ${deal.ref}`,
      body: provider.notice,
      kind: "payment",
    });
    if (provider.connected) {
      const staff = await notify.staffUserIds(admin);
      await notify.notifyUsers(admin, {
        dealId: deal.id,
        title: `Funding started — ${deal.ref}`,
        body: "A buyer started funding this deal. The payment provider will confirm it.",
        kind: "payment",
        recipients: staff,
      });
    } else if (tx?.id && data.simulateDecline) {
      const { settleTransactionCore } = await import("@/lib/settlement.server");
      await settleTransactionCore(admin, notify, {
        transactionId: tx.id,
        outcome: "failed",
        providerRef: `SIM-DECLINE-${String(tx.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`,
        reason: "The payment provider declined the payment (simulated decline). No money moved; request a new quote to try again.",
        actorId: null,
      });
      return {
        ok: false,
        status: "failed",
        provider: provider.id,
        providerLabel: provider.label,
        transactionId: tx.id,
        message: "Payment declined by the payment provider (simulated). No money moved. Request a new quote to try again.",
      };
    } else if (tx?.id) {
      const { simulateProviderConfirm } = await import("@/lib/settlement.server");
      await simulateProviderConfirm(admin, notify, [tx.id]);
    }

    return {
      ok: true,
      status: provider.connected ? status : "succeeded",
      provider: provider.id,
      providerLabel: provider.label,
      transactionId: tx?.id,
      message: provider.connected
        ? "Payment submitted to the licensed payment provider, which holds the funds. Insight records the confirmation."
        : "Payment confirmed by the payment provider (simulated). In this demo no real money moves.",
    };
  });

/** Buyer releases the protected funds to the seller. */
export const requestFundsRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string; fee?: number }) =>
    z
      .object({ dealId: z.string().uuid(), fee: z.number().min(0).max(1_000_000).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PaymentResult> => {
    const deal = await loadDealForParty(context, data.dealId);
    const { admin, provider, notify } = await serverDeps();

    if (deal.buyer_id !== context.userId)
      return {
        ok: false,
        status: "failed",
        provider: provider.id,
        providerLabel: provider.label,
        message: "Only the buyer can release the funds.",
      };
    if (!["held", "delivered", "under_review"].includes(deal.status))
      return {
        ok: false,
        status: "failed",
        provider: provider.id,
        providerLabel: provider.label,
        message: "Funds can only be released while they are protected in escrow.",
      };

    if (deal.deal_type === 'auction') {
      const { createAuctionRelease } = await import('./auction-settlement.server');
      const { data: inspection } = await admin.from('deals').select('status,frozen,auto_release_at').eq('id', deal.id).single();
      const { auctionCompletionState } = await import('./auction-completion');
      if (!inspection || !auctionCompletionState(inspection, true, false, Date.now()).accept) throw new Error('Accept the auction lot during its inspection window.');
      const legs = await createAuctionRelease(admin, deal.id, context.userId);
      if (!provider.connected) {
        const { simulateProviderConfirm } = await import('./settlement.server');
        await simulateProviderConfirm(admin, notify, legs.map(l => l.id));
      }
      return { ok: true, status: provider.connected ? 'processing' : 'succeeded', provider: provider.id,
        providerLabel: provider.label, ...(legs[0] ? { transactionId: legs[0].id } : {}),
        message: 'Separate owner and organiser payouts submitted to the payment provider.' };
    }

    const { data: tx, error } = await admin
      .from("deal_transactions")
      .insert({
        deal_id: deal.id,
        kind: "release",
        ...(await releaseFigures(admin, deal)),
        status: "processing",
        provider: provider.id,
        note: provider.notice,
        created_by: context.userId,
      })
      .select()
      .maybeSingle();
    if (error) throw error;

    await admin.from("deal_events").insert({
      deal_id: deal.id,
      actor_id: context.userId,
      title: "Buyer approved the release of funds",
      note: provider.notice,
    });
    await notify.notifyDealParties(admin, deal.id, {
      title: `Release approved for ${deal.ref}`,
      body: "The payout to the seller is processed by the payment provider (simulated in this demo).",
      kind: "payment",
    });
    if (provider.connected) {
      const staff = await notify.staffUserIds(admin);
      await notify.notifyUsers(admin, {
        dealId: deal.id,
        title: `Payout started — ${deal.ref}`,
        body: "The buyer approved a release. The payment provider will confirm the payout.",
        kind: "payment",
        recipients: staff,
      });
    } else if (tx?.id) {
      const { simulateProviderConfirm } = await import("@/lib/settlement.server");
      await simulateProviderConfirm(admin, notify, [tx.id]);
    }

    return {
      ok: true,
      status: provider.connected ? "processing" : "succeeded",
      provider: provider.id,
      providerLabel: provider.label,
      transactionId: tx?.id,
      message: provider.connected
        ? "Payout submitted to the provider."
        : "Payout confirmed by the payment provider (simulated). In this demo no real money moves.",
    };
  });

/** Insight team settles a recorded payment: success or clearly explained failure. */
export const settleTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      transactionId: string;
      outcome: "succeeded" | "failed";
      providerRef?: string | null;
      reason?: string | null;
    }) =>
      z
        .object({
          transactionId: z.string().uuid(),
          outcome: z.enum(["succeeded", "failed"]),
          providerRef: z.string().max(120).nullable().optional(),
          reason: z.string().max(500).nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireStaffAccess } = await import("@/lib/staff-auth.server");
    await requireStaffAccess(context);
    const { admin, provider, notify } = await serverDeps();
    const { settleTransactionCore } = await import("@/lib/settlement.server");
    if (!provider.connected) {
      // Simulation: the simulated provider confirms money steps; staff can only simulate a decline of a pending funding.
      if (data.outcome === "succeeded")
        throw new Error("In this demo the simulated payment provider confirms payments automatically.");
      const { data: tx } = await admin.from("deal_transactions").select("kind, status").eq("id", data.transactionId).maybeSingle();
      if (!tx || tx.kind !== "funding" || !["pending", "processing"].includes(tx.status))
        throw new Error("Only a pending funding can be declined with the testing tool.");
    }
    return settleTransactionCore(admin, notify, { ...data, actorId: context.userId });
  });

/** Staff add an internal reconciliation note to a transaction (no money movement). */
export const addReconciliationNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transactionId: string; note: string }) =>
    z.object({ transactionId: z.string().uuid(), note: z.string().trim().min(2).max(400) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireStaffAccess } = await import("@/lib/staff-auth.server");
    const admin = await requireStaffAccess(context);
    const { data: tx } = await admin.from("deal_transactions").select("id, deal_id").eq("id", data.transactionId).maybeSingle();
    if (!tx) throw new Error("Transaction not found.");
    const { error } = await admin.from("deal_events").insert({
      deal_id: tx.deal_id,
      actor_id: context.userId,
      title: "Internal reconciliation note",
      note: `[internal] ${data.note}`,
    });
    if (error) throw error;
    return { ok: true };
  });

/** Every recorded money movement for a deal, for the Insight console. */
export const listDealTransactionsForStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string }) =>
    z.object({ dealId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<DealTransaction[]> => {
    const { requireStaffAccess } = await import("@/lib/staff-auth.server");
    const admin = await requireStaffAccess(context);
    const { data: rows, error } = await admin
      .from("deal_transactions")
      .select("*")
      .eq("deal_id", data.dealId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (rows ?? []).map(mapTransaction);
  });

export const getPaymentProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getPaymentProvider } = await import("@/lib/payment-provider.server");
  const provider = getPaymentProvider();
  return { id: provider.id, label: provider.label, connected: provider.connected };
});
