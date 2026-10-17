export function nextBidderAction(rank: number, bidders: { rank: number; offered_at: string | null }[], unsold: boolean) {
  const next = bidders.find(b => b.rank === rank + 1 && b.offered_at);
  return next ? { kind: 'offered' as const, rank: next.rank } : unsold ? { kind: 'unsold' as const } : { kind: 'unrecorded' as const };
}
export function auctionDisputeOptions(type: string) {
  return type === 'auction' ? [{ value: 'quality_issue', en: 'Item not as described / not authentic', ar: 'القطعة غير مطابقة للوصف أو غير أصلية' }] : [];
}