export function auctionCompletionState(deal: { status: string; frozen?: boolean; auto_release_at?: string | null; shipping_tracking?: string | null }, buyer: boolean, organiser: boolean, now: number) {
  const inspection = deal.status === 'delivered' && !!deal.auto_release_at && now < new Date(deal.auto_release_at).getTime();
  return { ship: organiser && deal.status === 'held' && !deal.frozen, deliver: organiser && deal.status === 'held' && !!deal.shipping_tracking && !deal.frozen, accept: buyer && inspection && !deal.frozen };
}