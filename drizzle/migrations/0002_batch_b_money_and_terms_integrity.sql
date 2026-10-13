-- 1. Fee bands in a currency (provisional USD bands are added as data)
ALTER TABLE public.fee_rules ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SAR';
ALTER TABLE public.fee_rules ADD COLUMN IF NOT EXISTS provisional boolean NOT NULL DEFAULT false;

-- 2. Quote / invoice breakdowns so every screen shows the same numbers
ALTER TABLE public.fx_quotes ADD COLUMN IF NOT EXISTS breakdown jsonb;
ALTER TABLE public.tax_invoices ADD COLUMN IF NOT EXISTS lines jsonb;

-- 3. VAT rates on the Insight fee, by paying party's country (provisional until legal review)
CREATE TABLE IF NOT EXISTS public.vat_rates (
  country_code text PRIMARY KEY,
  rate numeric NOT NULL,
  provisional boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vat_rates TO authenticated;
GRANT ALL ON public.vat_rates TO service_role;
ALTER TABLE public.vat_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY vat_rates_read ON public.vat_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY vat_rates_staff_write ON public.vat_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.vat_rates TO authenticated;

-- 4. Payout account currency + IBAN validation
ALTER TABLE public.payout_accounts ADD COLUMN IF NOT EXISTS currency text;
UPDATE public.payout_accounts SET currency = CASE
  WHEN country IN ('BH','Bahrain') THEN 'BHD' WHEN country IN ('AE') THEN 'AED' WHEN country IN ('OM') THEN 'OMR'
  WHEN country IN ('QA') THEN 'QAR' WHEN country IN ('KW') THEN 'KWD' ELSE 'SAR' END
WHERE currency IS NULL;

CREATE OR REPLACE FUNCTION public.iban_is_valid(_iban text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE s text := upper(regexp_replace(coalesce(_iban,''), '\s', '', 'g')); len int; moved text; rem int := 0; ch text; v text; i int; j int;
BEGIN
  len := CASE substr(s,1,2) WHEN 'SA' THEN 24 WHEN 'AE' THEN 23 WHEN 'BH' THEN 22 WHEN 'QA' THEN 29 WHEN 'KW' THEN 30 WHEN 'OM' THEN 23 ELSE NULL END;
  IF len IS NULL OR length(s) <> len OR s !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]+$' THEN RETURN false; END IF;
  moved := substr(s,5) || substr(s,1,4);
  FOR i IN 1..length(moved) LOOP
    ch := substr(moved,i,1);
    v := CASE WHEN ch ~ '[A-Z]' THEN (ascii(ch)-55)::text ELSE ch END;
    FOR j IN 1..length(v) LOOP rem := (rem*10 + substr(v,j,1)::int) % 97; END LOOP;
  END LOOP;
  RETURN rem = 1;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_payout_account()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.iban := upper(regexp_replace(NEW.iban, '\s', '', 'g'));
  IF NOT public.iban_is_valid(NEW.iban) THEN RAISE EXCEPTION 'This IBAN is not valid (country length and check digits).'; END IF;
  IF NEW.currency IS NULL OR NEW.currency NOT IN ('SAR','BHD','AED','QAR','KWD','OMR','USD') THEN
    RAISE EXCEPTION 'Choose the payout currency of this bank account.'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS validate_payout_account ON public.payout_accounts;
CREATE TRIGGER validate_payout_account BEFORE INSERT OR UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.validate_payout_account();

CREATE OR REPLACE FUNCTION public.protect_payout_verified()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(),'admin') THEN
    IF TG_OP = 'UPDATE' AND (NEW.iban IS DISTINCT FROM OLD.iban OR NEW.account_name IS DISTINCT FROM OLD.account_name
       OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.country IS DISTINCT FROM OLD.country) THEN
      NEW.verified := false;
    ELSIF TG_OP = 'UPDATE' AND NEW.verified AND NOT OLD.verified THEN
      RAISE EXCEPTION 'Only Insight staff can verify a bank account.';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- 5. Terms acceptance per version (written only by server functions)
ALTER TABLE public.deal_term_versions ADD COLUMN IF NOT EXISTS accepted_by uuid;
ALTER TABLE public.deal_term_versions ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
CREATE OR REPLACE FUNCTION public.protect_term_versions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(),'admin') THEN
    NEW.accepted_by := NULL; NEW.accepted_at := NULL;
    IF NEW.version <> 1 THEN RAISE EXCEPTION 'New terms versions are created through Insight, not directly.'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_term_versions ON public.deal_term_versions;
CREATE TRIGGER protect_term_versions BEFORE INSERT ON public.deal_term_versions
  FOR EACH ROW EXECUTE FUNCTION public.protect_term_versions();

-- 6. Parties can no longer write deals directly; party actions go through server functions
DROP POLICY IF EXISTS deals_update_party ON public.deals;

CREATE OR REPLACE FUNCTION public.protect_deal_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  NEW.created_by := auth.uid();
  NEW.status := 'pending_funding';
  NEW.terms_status := 'pending';
  NEW.terms_version := 1;
  NEW.released_at := NULL; NEW.delivered_at := NULL; NEW.auto_release_at := NULL;
  NEW.shipped_at := NULL; NEW.cancelled_at := NULL; NEW.refunded_amount := 0;
  NEW.frozen := false; NEW.frozen_reason := NULL;
  NEW.fee_override_percent := NULL; NEW.fee_override_flat := NULL; NEW.fee_override_note := NULL; NEW.fee_override_by := NULL;
  NEW.risk_level := NULL; NEW.risk_score := NULL; NEW.risk_summary := NULL; NEW.risk_checked_at := NULL;
  NEW.shipping_carrier := NULL; NEW.shipping_tracking := NULL;
  IF NEW.shipping_status IS NULL OR NEW.shipping_status NOT IN ('not_required','preparing') THEN NEW.shipping_status := 'preparing'; END IF;
  IF NEW.inspection_days IS NULL OR NEW.inspection_days < 1 OR NEW.inspection_days > 30 THEN
    RAISE EXCEPTION 'The inspection period must be between 1 and 30 days.'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_deal_insert ON public.deals;
CREATE TRIGGER protect_deal_insert BEFORE INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.protect_deal_insert();

CREATE OR REPLACE FUNCTION public.enforce_deal_transition()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR has_role(uid,'admin') THEN RETURN NEW; END IF;
  -- Signed-in parties may not write any money, timing, terms, status or shipping field directly.
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.amount IS DISTINCT FROM OLD.amount OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.unit_price IS DISTINCT FROM OLD.unit_price
     OR NEW.fee_payer IS DISTINCT FROM OLD.fee_payer OR NEW.refunded_amount IS DISTINCT FROM OLD.refunded_amount
     OR NEW.auto_release_at IS DISTINCT FROM OLD.auto_release_at OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
     OR NEW.released_at IS DISTINCT FROM OLD.released_at OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.inspection_days IS DISTINCT FROM OLD.inspection_days OR NEW.auto_release_enabled IS DISTINCT FROM OLD.auto_release_enabled
     OR NEW.terms_status IS DISTINCT FROM OLD.terms_status OR NEW.terms_version IS DISTINCT FROM OLD.terms_version
     OR NEW.shipping_status IS DISTINCT FROM OLD.shipping_status OR NEW.shipping_carrier IS DISTINCT FROM OLD.shipping_carrier
     OR NEW.shipping_tracking IS DISTINCT FROM OLD.shipping_tracking OR NEW.shipped_at IS DISTINCT FROM OLD.shipped_at
     OR NEW.estimated_delivery_at IS DISTINCT FROM OLD.estimated_delivery_at OR NEW.shipping_responsibility IS DISTINCT FROM OLD.shipping_responsibility
     OR NEW.frozen IS DISTINCT FROM OLD.frozen OR NEW.frozen_reason IS DISTINCT FROM OLD.frozen_reason
     OR NEW.fee_override_percent IS DISTINCT FROM OLD.fee_override_percent OR NEW.fee_override_flat IS DISTINCT FROM OLD.fee_override_flat
     OR NEW.risk_level IS DISTINCT FROM OLD.risk_level
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'This deal field can only be changed through an Insight deal action.';
  END IF;
  RETURN NEW;
END; $function$;
