import { supabase } from '@/integrations/supabase/client';
export type Auction = { id: string; organiser_id: string; title: string; platform: string; stream_url: string | null; currency: string; organiser_commission_pct: number; status: string; starts_at: string | null; created_at: string };
export type AuctionLot = { id: string; auction_id: string; title: string; description: string; images: string[]; owner_id: string; status: string; deal_id: string | null; funded_deal_id: string | null; owner_pct: number | null; organiser_pct: number | null; split_locked_at: string | null };
export type Bidder = { id: string; lot_id: string; rank: number; platform_handle: string; email: string; price: number; status: string; deadline_at: string | null; deal_id: string | null };
export async function auctionAccess() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { visible: false, eligible: false, enabled: false };
  const [{ data: p }, { data: auctions }, { data: eligible }] = await Promise.all([
    supabase.from('profiles').select('organises_auctions').eq('id', user.id).maybeSingle(),
    supabase.from('auctions').select('id').eq('organiser_id', user.id).limit(1),
    supabase.rpc('auction_is_verified_business', { uid: user.id }),
  ]);
  return { visible: !!p?.organises_auctions || !!auctions?.length, eligible: eligible === true, enabled: !!p?.organises_auctions };
}
export async function listAuctions() {
  const { data, error } = await supabase.from('auctions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Auction[];
}
export async function loadAuction(id: string) {
  const { data: auction, error } = await supabase.from('auctions').select('*').eq('id', id).single();
  if (error) throw error;
  const { data: lots, error: lotError } = await supabase.from('auction_lots').select('*').eq('auction_id', id).order('id');
  if (lotError) throw lotError;
  const lotIds = (lots ?? []).map(l => l.id);
  const dealIds = (lots ?? []).flatMap(l => [l.deal_id, l.funded_deal_id]).filter((v): v is string => !!v);
  const [{ data: bidders, error: bidderError }, { data: deals, error: dealError }, { data: profile }] = await Promise.all([
    lotIds.length ? supabase.from('lot_bidders').select('*').in('lot_id', lotIds).order('rank') : Promise.resolve({ data: [], error: null }),
    dealIds.length ? supabase.from('deals').select('*').in('id', dealIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('profiles').select('full_name,country').eq('id', auction.organiser_id).maybeSingle(),
  ]);
  if (bidderError) throw bidderError; if (dealError) throw dealError;
  return { auction: auction as Auction, lots: (lots ?? []) as AuctionLot[], bidders: (bidders ?? []) as Bidder[], deals: deals ?? [], profile };
}
export function countdown(deadline: string | null | undefined, now: number) {
  if (!deadline || !now) return '—';
  const seconds = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function lotCategory(status: string) {
  return status === 'pending_funding' ? 'awaiting' : ['delivered', 'under_review', 'disputed'].includes(status) ? 'inspection' : ['released','refunded','partially_refunded'].includes(status) ? 'completed' : 'other';
}
