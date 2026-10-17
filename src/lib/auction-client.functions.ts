import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getOrganiserLotSummaries = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ auctionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: auction } = await context.supabase.from('auctions').select('organiser_id').eq('id', data.auctionId).maybeSingle();
    if (auction?.organiser_id !== context.userId) throw new Error('Only the organiser can read lot payment summaries.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: lots } = await context.supabase.from('auction_lots').select('deal_id,funded_deal_id').eq('auction_id', data.auctionId);
    const ids = (lots ?? []).flatMap(l => [l.deal_id,l.funded_deal_id]).filter((id): id is string => !!id);
    if (!ids.length) return [];
    const { data: deals, error } = await supabaseAdmin.from('deals').select('id,amount,currency,status,payment_deadline_at,invite_token').in('id', ids);
    if (error) throw error;
    return deals ?? [];
  });

export const getOrganiserLotPricing = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ lotId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: lot } = await context.supabase.from('auction_lots').select('auction_id,deal_id,funded_deal_id').eq('id',data.lotId).maybeSingle();
    const { data: a } = await context.supabase.from('auctions').select('organiser_id').eq('id',lot?.auction_id??'').maybeSingle();
    if(a?.organiser_id!==context.userId)throw new Error('Only the organiser can read payout pricing.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const id=lot?.funded_deal_id??lot?.deal_id;
    const {data:tx}=await supabaseAdmin.from('deal_transactions').select('fx_quote_id').eq('deal_id',id??'').eq('kind','funding').eq('status','succeeded').maybeSingle();
    if(!tx?.fx_quote_id)return null;
    const {data:q}=await supabaseAdmin.from('fx_quotes').select('breakdown').eq('id',tx.fx_quote_id).maybeSingle();
    const locked=q?.breakdown as {breakdown?:import('./fees').FeeBreakdown}|null;
    return locked?.breakdown??null;
  });

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

export const remindAuctionWinner = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ dealId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: d } = await supabaseAdmin.from('deals').select('id,title,ref,invite_token,counterparty_email,payment_deadline_at,auction_lot_id,status').eq('id',data.dealId).eq('deal_type','auction').maybeSingle();
    if (!d?.auction_lot_id || d.status!=='pending_funding' || !d.counterparty_email || !d.payment_deadline_at || new Date(d.payment_deadline_at).getTime()<=Date.now()) throw new Error('No current payment offer.');
    const { data:l } = await context.supabase.from('auction_lots').select('auction_id,deal_id').eq('id',d.auction_lot_id).maybeSingle();
    const { data:a } = await context.supabase.from('auctions').select('organiser_id').eq('id',l?.auction_id??'').maybeSingle();
    if(a?.organiser_id!==context.userId || l?.deal_id!==d.id)throw new Error('Only the organiser can remind the current winner.');
    const {sendTemplateEmail}=await import('./email-templates/send-email');
    const result=await sendTemplateEmail('auction-offer',d.counterparty_email,{templateData:{title:d.title,ended:false,deadline:d.payment_deadline_at,link:`https://insightsettle.com/invite/${d.invite_token}`},idempotencyKey:`auction-reminder-${d.id}-${Math.floor(Date.now()/3600000)}`});
    return {sent:result.sent};
  });
