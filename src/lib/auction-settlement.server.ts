import { disputeSplit, type FeeBreakdown } from './fees';
import { roundMoney } from './money';

/** Locked gross shares: organiser rounds, owner receives the remainder. Never an Insight fee. */
export function auctionReleaseAmounts(amount: number, currency: string, ownerPct: number, organiserPct: number) {
  if (!Number.isFinite(ownerPct) || !Number.isFinite(organiserPct) || ownerPct < 0 || organiserPct < 0 || ownerPct + organiserPct !== 100)
    throw new Error('Auction split must sum to 100.');
  const organiser = roundMoney(amount * organiserPct / 100, currency);
  return { owner: roundMoney(amount - organiser, currency), organiser };
}

export async function createAuctionRelease(admin: any, dealId: string, actorId: string | null, decision?: { id: string; outcome: string; buyerPercent: number; note: string }) {
  const { data, error } = await admin.rpc('create_auction_release', {
    _deal_id: dealId, _actor_id: actorId, _dispute_id: decision?.id ?? null,
    _outcome: decision?.outcome ?? null, _buyer_percent: decision?.buyerPercent ?? null, _note: decision?.note ?? null,
  });
  if (error) throw error;
  return (data ?? []) as { id: string }[];
}

/** Reject malformed legs before the existing confirmation path claims the transaction. */
export async function validateAuctionLeg(admin: any, tx: any, deal: any, b: FeeBreakdown) {
  const { data: lot, error: lotError } = await admin.from('auction_lots').select('*').eq('id', deal.auction_lot_id).maybeSingle();
  if (lotError) throw lotError;
  const { data: splits, error } = await admin.from('deal_payout_splits').select('*').eq('deal_id', deal.id);
  if (error) throw error;
  const owner = splits?.find((s: any) => s.role === 'owner');
  const organiser = splits?.find((s: any) => s.role === 'organiser');
  if (!lot?.split_locked_at || splits?.length !== 2 || !owner || !organiser || b.feePayer !== 'buyer' || b.sellerShare !== 0 || b.sellerVat !== 0)
    throw new Error('Auction requires locked direct beneficiary shares and buyer-paid pricing.');
  let gross = b.amount;
  let refund = 0;
  if (tx.auction_dispute_id) {
    const { data: decision, error: decisionError } = await admin.from('disputes').select('*').eq('id', tx.auction_dispute_id).eq('deal_id', deal.id).maybeSingle();
    if (decisionError) throw decisionError;
    if (!decision || decision.status !== 'resolved') throw new Error('Locked auction dispute decision missing.');
    const p = disputeSplit(b, decision.outcome === 'full_refund' ? 100 : decision.outcome === 'full_release' ? 0 : Number(decision.buyer_percent));
    gross = p.releaseGross; refund = p.refund;
  }
  const amounts = auctionReleaseAmounts(gross, b.currency, Number(owner.pct), Number(organiser.pct));
  const leg = splits.find((s: any) => s.id === tx.payout_split_id);
  const expected = tx.kind === 'refund' ? refund : leg?.role === 'owner' ? amounts.owner : leg?.role === 'organiser' ? amounts.organiser : null;
  if (expected == null || Number(tx.amount) !== expected || tx.currency !== b.currency || Number(tx.fee ?? 0) !== 0 || (tx.kind === 'release' && leg.release_tx_id !== tx.id))
    throw new Error('Auction transaction does not match the locked direct share.');
  return tx.kind === 'refund' ? 'buyer_refund_payable' : leg.role === 'owner' ? 'owner_payable' : 'organiser_payable';
}

export async function settleAuctionLeg(admin: any, tx: any, deal: any, account: string, ref: string) {
  const { error } = await admin.from('ledger_entries').insert([
    { deal_id: deal.id, transaction_id: tx.id, reference: ref, account: 'escrow_held', debit: Number(tx.amount), credit: 0, currency: tx.currency },
    { deal_id: deal.id, transaction_id: tx.id, reference: ref, account, debit: 0, credit: Number(tx.amount), currency: tx.currency },
  ]);
  if (error) throw error;
  const { data: transactions, error: txError } = await admin.from('deal_transactions').select('*').eq('deal_id', deal.id).in('kind', ['release','refund']);
  if (txError) throw txError;
  const relevant = (transactions ?? []).filter((t: any) => tx.auction_dispute_id ? t.auction_dispute_id === tx.auction_dispute_id : t.payout_split_id);
  const succeededTotal = roundMoney(relevant.filter((t: any) => t.status === 'succeeded').reduce((sum: number, t: any) => sum + Number(t.amount), 0), deal.currency);
  if (!relevant.length || relevant.some((t: any) => t.status !== 'succeeded') || succeededTotal !== Number(deal.amount)) return null;
  const refund = roundMoney(relevant.filter((t: any) => t.kind === 'refund').reduce((sum: number, t: any) => sum + Number(t.amount), 0), deal.currency);
  const status = refund === Number(deal.amount) ? 'refunded' : refund > 0 ? 'partially_refunded' : 'released';
  // Preserve I-33: never overwrite a final staff decision.
  if (!['released','refunded','partially_refunded'].includes(deal.status)) {
    const { error: updateError } = await admin.from('deals').update({ status, refunded_amount: refund,
      ...(status !== 'refunded' ? { released_at: new Date().toISOString() } : {}) }).eq('id', deal.id);
    if (updateError) throw updateError;
  }
  // Polish (row 20): a lot whose deal is settled is closed, so the console no longer shows it as funded.
  if (deal.auction_lot_id) {
    const { error: lotCloseError } = await admin.from('auction_lots').update({ status: 'closed' }).eq('id', deal.auction_lot_id).eq('status', 'funded');
    if (lotCloseError) throw lotCloseError;
  }
  return status;
}