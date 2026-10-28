-- D-71 update (founder, 28 Oct 2026 21:35): auctions also pay 3% (minimum BHD 15, cap BHD 1,500), so every
-- auction can be paid electronically with the temporary optimistic AFS provider costs.
UPDATE public.auction_fee_settings SET mode = 'percentage', percent = 3, min_usd = 39.893617, max_usd = 3989.361702, updated_at = now()
WHERE id = true;
