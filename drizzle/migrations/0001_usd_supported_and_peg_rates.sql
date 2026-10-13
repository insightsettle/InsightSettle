CREATE OR REPLACE FUNCTION public.score_deal_risk()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE f jsonb := '[]'; lvl text; creator_age interval; n_recent int; n_disputes int;
BEGIN
  SELECT now() - created_at INTO creator_age FROM auth.users WHERE id = NEW.created_by;
  IF creator_age < interval '7 days' THEN f := f || '"New account"'; END IF;
  IF NEW.amount >= 100000 THEN f := f || '"High transaction amount"'; END IF;
  -- Supported currencies: SAR, BHD, AED, QAR, KWD, OMR and USD.
  IF NEW.currency NOT IN ('SAR','AED','BHD','QAR','KWD','OMR','USD') THEN f := f || '"Non-GCC currency"'; END IF;
  SELECT count(*) INTO n_recent FROM deals WHERE created_by = NEW.created_by AND created_at > now() - interval '24 hours';
  IF n_recent >= 5 THEN f := f || '"Unusual transaction frequency"'; END IF;
  SELECT count(*) INTO n_disputes FROM disputes WHERE opened_by = NEW.created_by;
  IF n_disputes >= 3 THEN f := f || '"Multiple disputes"'; END IF;
  lvl := CASE WHEN jsonb_array_length(f) >= 3 THEN 'MANUAL_REVIEW' WHEN jsonb_array_length(f) = 2 THEN 'HIGH' WHEN jsonb_array_length(f) = 1 THEN 'MEDIUM' ELSE 'LOW' END;
  IF lvl <> 'LOW' THEN
    INSERT INTO risk_flags(deal_id, user_id, level, factors) VALUES (NEW.id, NEW.created_by, lvl, f);
  END IF;
  RETURN NEW;
END; $function$;

-- Peg-consistent indicative rates (SAR per 1 unit). KWD from 1 KWD = 3.2250 USD (24 Jul 2026); staff should replace with the Central Bank of Kuwait rate.
UPDATE public.fx_rates SET provider_rate = 3.75, updated_at = now() WHERE code = 'USD';
UPDATE public.fx_rates SET provider_rate = 9.97340, updated_at = now() WHERE code = 'BHD';
UPDATE public.fx_rates SET provider_rate = 1.021102, updated_at = now() WHERE code = 'AED';
UPDATE public.fx_rates SET provider_rate = 1.030220, updated_at = now() WHERE code = 'QAR';
UPDATE public.fx_rates SET provider_rate = 9.752926, updated_at = now() WHERE code = 'OMR';
UPDATE public.fx_rates SET provider_rate = 12.09375, updated_at = now() WHERE code = 'KWD';
UPDATE public.fx_rates SET active = false, updated_at = now() WHERE code IN ('EUR','GBP');