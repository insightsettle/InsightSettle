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

async function loadDealForParty(context: { supabase: any; userId: string }, dealId: string) {
  const { data, error } = await context.supabase
    .from("deals")
    .select("id, ref, amount, currency, status, buyer_id, seller_id")
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

/** Buyer starts funding the escrow. The money movement is always recorded. */
export const startDealFunding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string; fee?: number; quoteId?: string }) =>
    z
      .object({
        dealId: z.string().uuid(),
        fee: z.number().min(0).max(1_000_000).optional(),
        quoteId: z.string().uuid().optional(),
      })
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
        message: "Only the buyer can fund this deal.",
      };
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

    // Cross-currency deals must use a live, unexpired FX quote.
    let quote: any = null;
    if (deal.currency !== "SAR") {
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
      if (!q || new Date(q.expires_at).getTime() <= Date.now() || q.used_at)
        return {
          ok: false,
          status: "failed",
          provider: provider.id,
          providerLabel: provider.label,
          message: "Your exchange rate has expired. Please request a new quote.",
        };
      quote = q;
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
        amount: quote ? Number(quote.total) : Number(deal.amount),
        fee: quote ? Number(quote.fee) : (data.fee ?? 0),
        currency: quote ? quote.target_currency : deal.currency,
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
    const staff = await notify.staffUserIds(admin);
    await notify.notifyUsers(admin, {
      dealId: deal.id,
      title: `Funding needs confirmation — ${deal.ref}`,
      body: "A buyer started funding this deal. Confirm or reject the payment in the console.",
      kind: "payment",
      recipients: staff,
    });

    return {
      ok: true,
      status,
      provider: provider.id,
      providerLabel: provider.label,
      transactionId: tx?.id,
      message: provider.connected
        ? "Payment submitted to the provider. You will be notified when the funds are secured."
        : "Funding request recorded. The Insight team confirms the transfer, then the funds are marked as protected.",
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

    const { data: tx, error } = await admin
      .from("deal_transactions")
      .insert({
        deal_id: deal.id,
        kind: "release",
        amount: Number(deal.amount),
        fee: data.fee ?? 0,
        currency: deal.currency,
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
      body: "The payout to the seller is being processed.",
      kind: "payment",
    });
    const staff = await notify.staffUserIds(admin);
    await notify.notifyUsers(admin, {
      dealId: deal.id,
      title: `Payout to confirm — ${deal.ref}`,
      body: "The buyer approved a release. Settle the payout in the console.",
      kind: "payment",
      recipients: staff,
    });

    return {
      ok: true,
      status: "processing",
      provider: provider.id,
      providerLabel: provider.label,
      transactionId: tx?.id,
      message: provider.connected
        ? "Payout submitted to the provider."
        : "Release recorded. The Insight team completes the bank transfer and marks it settled.",
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
    const { data: isStaff } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isStaff !== true) throw new Error("Forbidden");
    const { admin, notify } = await serverDeps();

    const { data: tx, error: txError } = await admin
      .from("deal_transactions")
      .select("*")
      .eq("id", data.transactionId)
      .maybeSingle();
    if (txError) throw txError;
    if (!tx) throw new Error("Transaction not found.");
    if (data.outcome === "failed" && !data.reason)
      throw new Error("A failure needs a reason so both parties understand what happened.");

    const { error } = await admin
      .from("deal_transactions")
      .update({
        status: data.outcome,
        provider_ref: data.providerRef ?? tx.provider_ref,
        error_message: data.outcome === "failed" ? data.reason : null,
        note: data.outcome === "succeeded" ? (data.reason ?? tx.note) : tx.note,
      })
      .eq("id", tx.id);
    if (error) throw error;

    const { data: deal } = await admin
      .from("deals")
      .select("id, ref, status")
      .eq("id", tx.deal_id)
      .maybeSingle();

    let newStatus: string | null = null;
    if (data.outcome === "succeeded") {
      if (tx.kind === "funding") newStatus = "held";
      if (tx.kind === "release") newStatus = "released";
      if (tx.kind === "refund") newStatus = "refunded";
    }
    if (newStatus && deal) {
      await admin
        .from("deals")
        .update({
          status: newStatus,
          ...(newStatus === "released" ? { released_at: new Date().toISOString() } : {}),
        })
        .eq("id", deal.id);

      // Double-entry ledger: every settled movement balances debit = credit.
      const amt = Number(tx.amount);
      const fee = Number(tx.fee ?? 0);
      const ref = data.providerRef ?? tx.id;
      const rows =
        tx.kind === "funding"
          ? [
              { account: "provider_clearing", debit: amt, credit: 0 },
              { account: "escrow_held", debit: 0, credit: amt - fee },
              { account: "insight_fee_revenue", debit: 0, credit: fee },
            ]
          : tx.kind === "release"
            ? [
                { account: "escrow_held", debit: amt, credit: 0 },
                { account: "supplier_payable", debit: 0, credit: amt },
              ]
            : [
                { account: "escrow_held", debit: amt, credit: 0 },
                { account: "buyer_refund_payable", debit: 0, credit: amt },
              ];
      if (tx.kind === "release" || tx.kind === "funding") {
        const { data: full } = await admin.from("deals").select("id, supplier_country, fee_payer").eq("id", tx.deal_id).single();
        const vatRates: Record<string, number> = { SA: 0.15, AE: 0.05, BH: 0.1, OM: 0.05, QA: 0, KW: 0 };
        const vatRate = vatRates[full?.supplier_country ?? "SA"] ?? 0.15;
        const { data: fundTx } = await admin.from("deal_transactions").select("fee").eq("deal_id", tx.deal_id).eq("kind", "funding").eq("status", "succeeded").maybeSingle();
        const invFee = Number(fundTx?.fee ?? fee);
        if (tx.kind === "release" && invFee > 0)
          await admin.from("tax_invoices").upsert(
            { deal_id: tx.deal_id, fee: invFee, vat_rate: vatRate, vat: +(invFee * vatRate).toFixed(2), total: +(invFee * (1 + vatRate)).toFixed(2), currency: "SAR" },
            { onConflict: "deal_id", ignoreDuplicates: true },
          );
      }
      await admin.from("ledger_entries").insert(
        rows
          .filter((r) => r.debit !== 0 || r.credit !== 0)
          .map((r) => ({
            ...r,
            deal_id: tx.deal_id,
            transaction_id: tx.id,
            currency: tx.currency,
            reference: ref,
          })),
      );
    }

    const label =
      data.outcome === "succeeded"
        ? `${tx.kind === "funding" ? "Funding" : tx.kind === "release" ? "Payout" : "Refund"} settled successfully`
        : `${tx.kind === "funding" ? "Funding" : tx.kind === "release" ? "Payout" : "Refund"} failed`;

    await admin.from("deal_events").insert({
      deal_id: tx.deal_id,
      actor_id: context.userId,
      title: label,
      note: data.reason ?? data.providerRef ?? null,
    });
    await notify.notifyDealParties(admin, tx.deal_id, {
      title: `${label} — ${deal?.ref ?? ""}`.trim(),
      body: data.reason ?? null,
      kind: "payment",
    });
    return { ok: true, status: data.outcome, dealStatus: newStatus };
  });

/** Every recorded money movement for a deal, for the Insight console. */
export const listDealTransactionsForStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string }) =>
    z.object({ dealId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<DealTransaction[]> => {
    const { data: isStaff } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isStaff !== true) throw new Error("Forbidden");
    const { admin } = await serverDeps();
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
