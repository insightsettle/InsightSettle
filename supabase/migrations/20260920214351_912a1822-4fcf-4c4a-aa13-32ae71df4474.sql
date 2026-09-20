-- 1) Deal enhancements
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS fee_payer text NOT NULL DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS inspection_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_status text NOT NULL DEFAULT 'agreed',
  ADD COLUMN IF NOT EXISTS terms_note text,
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS shipping_tracking text,
  ADD COLUMN IF NOT EXISTS shipping_status text,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.validate_deal_extras()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.fee_payer NOT IN ('buyer','seller','split') THEN
    RAISE EXCEPTION 'Invalid fee payer: %', NEW.fee_payer;
  END IF;
  IF NEW.terms_status NOT IN ('agreed','pending','changes_requested','rejected') THEN
    RAISE EXCEPTION 'Invalid terms status: %', NEW.terms_status;
  END IF;
  IF NEW.inspection_days < 0 OR NEW.inspection_days > 60 THEN
    RAISE EXCEPTION 'Inspection days must be between 0 and 60';
  END IF;
  IF NEW.shipping_status IS NOT NULL
     AND NEW.shipping_status NOT IN ('not_required','preparing','shipped','in_transit','delivered') THEN
    RAISE EXCEPTION 'Invalid shipping status: %', NEW.shipping_status;
  END IF;
  IF NEW.refunded_amount < 0 THEN
    RAISE EXCEPTION 'Refunded amount cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_deal_extras_trigger ON public.deals;
CREATE TRIGGER validate_deal_extras_trigger
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.validate_deal_extras();

-- 2) Deal ratings
CREATE TABLE IF NOT EXISTS public.deal_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, rater_id)
);

GRANT SELECT, INSERT, UPDATE ON public.deal_ratings TO authenticated;
GRANT ALL ON public.deal_ratings TO service_role;

ALTER TABLE public.deal_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY deal_ratings_select_authenticated ON public.deal_ratings
FOR SELECT TO authenticated USING (true);

CREATE POLICY deal_ratings_insert_own ON public.deal_ratings
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = rater_id
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_ratings.deal_id
      AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
  )
);

CREATE POLICY deal_ratings_update_own ON public.deal_ratings
FOR UPDATE TO authenticated
USING (auth.uid() = rater_id)
WITH CHECK (auth.uid() = rater_id);

CREATE TRIGGER update_deal_ratings_updated_at
BEFORE UPDATE ON public.deal_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_rating_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.score < 1 OR NEW.score > 5 THEN
    RAISE EXCEPTION 'Rating score must be between 1 and 5';
  END IF;
  IF NEW.rater_id = NEW.ratee_id THEN
    RAISE EXCEPTION 'You cannot rate yourself';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_deal_ratings
BEFORE INSERT OR UPDATE ON public.deal_ratings
FOR EACH ROW EXECUTE FUNCTION public.validate_rating_score();

-- 3) KYC documents
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'national_id',
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT 'document',
  status text NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_documents TO authenticated;
GRANT ALL ON public.kyc_documents TO service_role;

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY kyc_documents_select_own ON public.kyc_documents
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY kyc_documents_select_staff ON public.kyc_documents
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY kyc_documents_insert_own ON public.kyc_documents
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY kyc_documents_update_staff ON public.kyc_documents
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY kyc_documents_delete_own_pending ON public.kyc_documents
FOR DELETE TO authenticated USING (auth.uid() = user_id AND status = 'pending');

CREATE TRIGGER update_kyc_documents_updated_at
BEFORE UPDATE ON public.kyc_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_kyc_document()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid document status: %', NEW.status;
  END IF;
  IF NEW.doc_type NOT IN ('national_id','passport','commercial_register','bank_statement','other') THEN
    RAISE EXCEPTION 'Invalid document type: %', NEW.doc_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_kyc_documents
BEFORE INSERT OR UPDATE ON public.kyc_documents
FOR EACH ROW EXECUTE FUNCTION public.validate_kyc_document();