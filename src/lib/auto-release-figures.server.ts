/**
 * I-45: the database job `run_auto_release()` creates the automatic release at the deal amount (gross).
 * The supplier is paid the deal amount less its fee share and VAT, from the locked funding quote.
 * This step runs in the same scheduled request, straight after the job, so the release record shows the
 * supplier's net and fee share before the provider confirms it. Settlement applies the same figures again
 * (idempotent), so the ledger is unchanged.
 */
export async function correctAutoReleaseFigures(admin: any): Promise<number> {
  const { data: txs, error } = await admin
    .from("deal_transactions")
    .select("id, deal_id, amount, fee, currency")
    .eq("kind", "release")
    .eq("status", "processing")
    .is("milestone_id", null)
    .like("idempotency_key", "%-RELEASE-AUTO");
  if (error) throw error;
  if (!txs?.length) return 0;
  const { getDealPricingLocked } = await import("@/lib/deal-rules.server");
  let corrected = 0;
  for (const tx of txs) {
    try {
      const b = await getDealPricingLocked(admin, { id: tx.deal_id });
      if (Number(tx.amount) === b.supplierNet && Number(tx.fee ?? 0) === b.sellerShare && tx.currency === b.currency) continue;
      const { error: upErr } = await admin
        .from("deal_transactions")
        .update({ amount: b.supplierNet, fee: b.sellerShare, currency: b.currency })
        .eq("id", tx.id)
        .eq("status", "processing");
      if (upErr) throw upErr;
      corrected += 1;
    } catch (e) {
      console.error("auto-release figures", tx.id, e);
    }
  }
  return corrected;
}
