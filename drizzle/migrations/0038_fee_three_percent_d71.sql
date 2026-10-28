-- D-71 (founder, 28 Oct 2026): every deal pays 3% of its value, minimum BHD 15, cap BHD 1,500
-- (the cap applies to bank transfer only, D-66). Auctions pay 1% with the same minimum and cap.
-- Auction settings are stored in USD: BHD 15 = USD 39.893617 and BHD 1,500 = USD 3,989.361702 (1 BHD = 2.659574 USD).
UPDATE public.fee_rules SET percent = 3, min_fee = 15, max_fee = 1500, label = 'Flat 3% (D-71, BHD)', updated_at = now()
WHERE currency = 'BHD';
UPDATE public.fee_rules SET percent = 3, min_fee = 39.893617, max_fee = 3989.361702, label = 'Flat 3% (D-71, USD fallback)', updated_at = now()
WHERE currency = 'USD';
UPDATE public.auction_fee_settings SET mode = 'percentage', percent = 1, min_usd = 39.893617, max_usd = 3989.361702, updated_at = now()
WHERE id = true;
