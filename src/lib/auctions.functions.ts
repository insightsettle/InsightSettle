import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const winnerSchema = z.object({ lotId: z.string().uuid(), bidders: z.array(z.object({ rank: z.number().int().min(1).max(3), handle: z.string().trim().min(1).max(100), email: z.string().email().max(254), price: z.number().positive().max(999999999999999) })).min(1).max(3) }).superRefine((v, ctx) => {
  v.bidders.forEach((b, i) => { if (b.rank !== i + 1) ctx.addIssue({ code: 'custom', message: 'Cannot skip bidder rank' }); });
});

export const recordAuctionWinner = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => winnerSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Authorize through the caller's RLS client before loading privileged writes.
    const { data: lot, error } = await context.supabase.from('auction_lots').select('auction_id,status').eq('id', data.lotId).maybeSingle();
    if (error) throw error;
    if (!lot || lot.status !== 'open') throw new Error('Lot must be open.');
    const { data: auction } = await context.supabase.from('auctions').select('organiser_id').eq('id', lot.auction_id).maybeSingle();
    if (auction?.organiser_id !== context.userId) throw new Error('Only the organiser can record the winner.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: event, error: writeError } = await supabaseAdmin.rpc('record_auction_winner', { _lot: data.lotId, _actor: context.userId, _bidders: data.bidders });
    if (writeError) throw writeError;
    const { deliverAuctionEvents } = await import('./auction-deadlines.server');
    const delivery = await deliverAuctionEvents([event as import('./auction-deadlines.server').AuctionOfferEvent]);
    return { ok: true, offer: event, emailFailures: delivery.failed };
  });

export const declineAuctionOffer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ dealId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: deal } = await context.supabase.from('deals').select('buyer_id,deal_type,auction_lot_id').eq('id', data.dealId).maybeSingle();
    if (deal?.buyer_id !== context.userId || deal.deal_type !== 'auction' || !deal.auction_lot_id) throw new Error('Only the offered buyer can decline.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: events, error } = await supabaseAdmin.rpc('decline_auction_deal', { _deal: data.dealId, _buyer: context.userId });
    if (error) throw error;
    if (!events) throw new Error('Offer is no longer available or funding is reserved.');
    const { deliverAuctionEvents } = await import('./auction-deadlines.server');
    const delivery = await deliverAuctionEvents(events as import('./auction-deadlines.server').AuctionOfferEvent[]);
    return { ok: true, emailFailures: delivery.failed };
  });