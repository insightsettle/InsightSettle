-- D-69 (founder, 28 Oct 2026): Insight launches from Bahrain. The live fee schedule moves to Bahraini dinars:
-- 2.5% flat (D-64), minimum BHD 6, cap BHD 1,300 (rounded from USD 15 and USD 3,500).
-- The pricing loader prefers BHD rules when present; the USD row stays as a fallback and for history.
INSERT INTO public.fee_rules (label, currency, amount_from, amount_to, percent, min_fee, max_fee, provisional)
SELECT 'Flat 2.5% (D-64, BHD per D-69)', 'BHD', 0, NULL, 2.5, 6, 1300, true
WHERE NOT EXISTS (SELECT 1 FROM public.fee_rules WHERE currency = 'BHD');
