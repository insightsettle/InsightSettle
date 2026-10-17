import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Read adapters only: existing RLS establishes lot access before supplemental metadata is read.
export const getAuctionDealView = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ref: z.string().min(1).max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: deal } = await supabaseAdmin.from('deals').select('*').eq('ref', data.ref).eq('deal_type', 'auction').maybeSingle();
    if (!deal?.auction_lot_id) return null;
    const { data: allowed } = await context.supabase.from('auction_lots').select('id').eq('id', deal.auction_lot_id).maybeSingle();
    if (!allowed) throw new Error('This lot is not accessible.');
    const { data: lot } = await supabaseAdmin.from('auction_lots').select('*').eq('id', deal.auction_lot_id).single();
    if (!lot) return null;
    const { data: auction } = await supabaseAdmin.from('auctions').select('*').eq('id', lot.auction_id).single();
    const { data: payout } = await context.supabase.from('payout_accounts').select('verified,currency').eq('user_id', context.userId).maybeSingle();
    const { data: splits } = await context.supabase.from('deal_payout_splits').select('*').eq('deal_id', deal.id);
    return { deal, lot, auction, payout, splits: splits ?? [], owner: lot.owner_id === context.userId, organiser: auction?.organiser_id === context.userId, buyer: deal.buyer_id === context.userId };
  });

export const resolveAuctionOwner = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ email: z.string().email(), auctionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: a } = await context.supabase.from('auctions').select('organiser_id').eq('id', data.auctionId).maybeSingle();
    if (a?.organiser_id !== context.userId) throw new Error('Only the organiser can select an owner.');
    // Exact-email lookup only, no account directory or private profile projection.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: result, error } = await supabaseAdmin.rpc('auction_owner_by_email', { _email: data.email, _auction: data.auctionId, _actor: context.userId });
    if (error) throw error;
    return result;
  });
