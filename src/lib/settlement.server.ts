import { roundMoney } from "@/lib/money";

export const SIMULATED_CONFIRMATION = "Confirmed by the payment provider (simulated)";

type SettleInput = {
  transactionId: string;
  outcome: "succeeded" | "failed";
  providerRef?: string | null;
  reason?: string | null;
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

  let newStatus: string | null = null;
  if (data.outcome === "succeeded") {
    if (tx.kind === "funding") newStatus = "held";
    if (tx.kind === "release") newStatus = "released";
    if (tx.kind === "refund") newStatus = "refunded";
  }
  // A staff decision may already have set the final outcome (e.g. a partial refund); do not overwrite it.
  const finalStatuses = ["released", "refunded", "partially_refunded"];
  if (newStatus && deal && !(tx.kind !== "funding" && finalStatuses.includes(deal.status))) {
    await admin
      .from("deals")
      .update({
        status: newStatus,
        ...(newStatus === "released" ? { released_at: new Date().toISOString() } : {}),
      })
      .eq("id", deal.id);
  }
  if (newStatus && deal) {
    // Double-entry ledger: every settled movement balances debit = credit.
    const amt = Number(tx.amount);
    const fee = Number(tx.fee ?? 0);
    const ref = data.providerRef ?? tx.id;
    const rows =
      tx.kind === "funding"
        ? [
            { account: "provider_clearing", debit: amt, credit: 0 },
            { account: "escrow_held", debit: 0, credit: roundMoney(amt - fee, tx.currency) },
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
    if (tx.kind === "release") {
      const { data: full } = await admin.from("deals").select("id, supplier_country, fee_payer").eq("id", tx.deal_id).single();
      const vatRates: Record<string, number> = { SA: 0.15, AE: 0.05, BH: 0.1, OM: 0.05, QA: 0, KW: 0 };
      const vatRate = vatRates[full?.supplier_country ?? "SA"] ?? 0.15;
      const { data: fundTx } = await admin.from("deal_transactions").select("fee").eq("deal_id", tx.deal_id).eq("kind", "funding").eq("status", "succeeded").maybeSingle();
      const invFee = Number(fundTx?.fee ?? fee);
      if (invFee > 0)
        await admin.from("tax_invoices").upsert(
          {
            deal_id: tx.deal_id,
            fee: invFee,
            vat_rate: vatRate,
            vat: roundMoney(invFee * vatRate, "SAR"),
            total: roundMoney(invFee * (1 + vatRate), "SAR"),
            currency: "SAR",
          },
          { onConflict: "deal_id", ignoreDuplicates: true },
        );
    }
    await admin.from("ledger_entries").insert(
      rows
        .filter((r) => r.debit !== 0 || r.credit !== 0)
        .map((r) => ({ ...r, deal_id: tx.deal_id, transaction_id: tx.id, currency: tx.currency, reference: ref })),
    );
  }

  const kindLabel = tx.kind === "funding" ? "Funding" : tx.kind === "release" ? "Payout" : "Refund";
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
