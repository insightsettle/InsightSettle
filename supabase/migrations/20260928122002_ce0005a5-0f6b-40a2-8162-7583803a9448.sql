ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'compliance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

ALTER TABLE public.deals
  ADD COLUMN quantity numeric NOT NULL DEFAULT 1,
  ADD COLUMN unit_price numeric,
  ADD COLUMN supplier_country text,
  ADD COLUMN delivery_country text,
  ADD COLUMN shipping_responsibility text NOT NULL DEFAULT 'seller',
  ADD COLUMN acceptance_criteria text,
  ADD COLUMN refund_conditions text,
  ADD COLUMN cancellation_conditions text,
  ADD COLUMN shipped_at timestamptz,
  ADD COLUMN estimated_delivery_at date,
  ADD COLUMN auto_release_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN frozen_reason text,
  ADD COLUMN terms_version integer NOT NULL DEFAULT 1,
  ADD COLUMN cancelled_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_deal_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending_funding','held','delivered','under_review','released','refunded','partially_refunded','disputed','rejected','cancelled') THEN
    RAISE EXCEPTION 'Invalid deal status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_deal_extras()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.fee_payer NOT IN ('buyer','seller','split') THEN RAISE EXCEPTION 'Invalid fee payer: %', NEW.fee_payer; END IF;
  IF NEW.terms_status NOT IN ('agreed','pending','changes_requested','rejected') THEN RAISE EXCEPTION 'Invalid terms status: %', NEW.terms_status; END IF;
  IF NEW.inspection_days < 0 OR NEW.inspection_days > 60 THEN RAISE EXCEPTION 'Inspection days must be between 0 and 60'; END IF;
  IF NEW.shipping_status IS NOT NULL AND NEW.shipping_status NOT IN ('not_required','preparing','shipped','in_transit','out_for_delivery','delivered') THEN
    RAISE EXCEPTION 'Invalid shipping status: %', NEW.shipping_status; END IF;
  IF NEW.shipping_responsibility NOT IN ('seller','buyer','none') THEN RAISE EXCEPTION 'Invalid shipping responsibility'; END IF;
  IF NEW.refunded_amount < 0 THEN RAISE EXCEPTION 'Refunded amount cannot be negative'; END IF;
  IF NEW.quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  RETURN NEW;
END; $$;

-- Server-enforced state machine for members (staff and server jobs are exempt)
CREATE OR REPLACE FUNCTION public.enforce_deal_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR has_role(uid,'admin') THEN RETURN NEW; END IF;
  IF OLD.frozen AND (NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'This deal is frozen by Insight and cannot change status.';
  END IF;
  IF NEW.frozen IS DISTINCT FROM OLD.frozen OR NEW.frozen_reason IS DISTINCT FROM OLD.frozen_reason
     OR NEW.fee_override_percent IS DISTINCT FROM OLD.fee_override_percent
     OR NEW.fee_override_flat IS DISTINCT FROM OLD.fee_override_flat
     OR NEW.refunded_amount IS DISTINCT FROM OLD.refunded_amount
     OR NEW.risk_level IS DISTINCT FROM OLD.risk_level
     OR NEW.released_at IS DISTINCT FROM OLD.released_at THEN
    RAISE EXCEPTION 'Only Insight staff can change this field.';
  END IF;
  IF OLD.status <> 'pending_funding' AND (NEW.amount IS DISTINCT FROM OLD.amount OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.fee_payer IS DISTINCT FROM OLD.fee_payer OR NEW.quantity IS DISTINCT FROM OLD.quantity) THEN
    RAISE EXCEPTION 'Core terms cannot change after the payment is secured.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status='pending_funding' AND NEW.status IN ('rejected','cancelled')) OR
      (OLD.status='held' AND NEW.status IN ('delivered','disputed')) OR
      (OLD.status='delivered' AND NEW.status IN ('under_review','disputed')) OR
      (OLD.status='under_review' AND NEW.status IN ('delivered','disputed'))
    ) THEN
      RAISE EXCEPTION 'This status change is not allowed (% → %).', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.enforce_deal_transition() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_deal_transition BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION enforce_deal_transition();

CREATE TABLE public.deal_term_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, version)
);
GRANT SELECT, INSERT ON public.deal_term_versions TO authenticated;
GRANT ALL ON public.deal_term_versions TO service_role;
ALTER TABLE public.deal_term_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY dtv_read ON public.deal_term_versions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid() IN (d.buyer_id,d.seller_id))) OR has_role(auth.uid(),'admin'));
CREATE POLICY dtv_insert ON public.deal_term_versions FOR INSERT TO authenticated WITH CHECK (auth.uid()=created_by AND EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid() IN (d.buyer_id,d.seller_id))));

CREATE TABLE public.deal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  uploaded_by uuid NOT NULL,
  category text NOT NULL DEFAULT 'other',
  file_path text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deal_attachments TO authenticated;
GRANT ALL ON public.deal_attachments TO service_role;
ALTER TABLE public.deal_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY da_read ON public.deal_attachments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid() IN (d.buyer_id,d.seller_id))) OR has_role(auth.uid(),'admin'));
CREATE POLICY da_insert ON public.deal_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid()=uploaded_by AND EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid() IN (d.buyer_id,d.seller_id))));

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  opened_by uuid NOT NULL,
  reason text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'opened',
  response_deadline timestamptz NOT NULL,
  evidence_deadline timestamptz NOT NULL,
  resolution_deadline timestamptz NOT NULL,
  review_started_at timestamptz,
  outcome text,
  buyer_percent numeric,
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY disputes_read ON public.disputes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid() IN (d.buyer_id,d.seller_id))) OR has_role(auth.uid(),'admin'));
CREATE POLICY disputes_insert ON public.disputes FOR INSERT TO authenticated WITH CHECK (auth.uid()=opened_by AND EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid() IN (d.buyer_id,d.seller_id))));
CREATE TRIGGER disputes_updated BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER audit_disputes AFTER INSERT OR UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION write_audit_log();
CREATE OR REPLACE FUNCTION public.validate_dispute()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.reason NOT IN ('not_received','wrong_item','damaged','quantity_mismatch','quality_issue','late_delivery','other') THEN RAISE EXCEPTION 'Invalid dispute reason'; END IF;
  IF NEW.status NOT IN ('opened','supplier_notified','evidence_collection','under_review','resolved') THEN RAISE EXCEPTION 'Invalid dispute status'; END IF;
  IF NEW.outcome IS NOT NULL AND NEW.outcome NOT IN ('full_release','full_refund','partial_settlement') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
  IF NEW.buyer_percent IS NOT NULL AND (NEW.buyer_percent < 0 OR NEW.buyer_percent > 100) THEN RAISE EXCEPTION 'Percent must be 0-100'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_dispute BEFORE INSERT OR UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION validate_dispute();

CREATE TABLE public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id),
  uploaded_by uuid NOT NULL,
  note text,
  file_path text,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dispute_evidence TO authenticated;
GRANT ALL ON public.dispute_evidence TO service_role;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY de_read ON public.dispute_evidence FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM disputes x JOIN deals d ON d.id=x.deal_id WHERE x.id=dispute_id AND (auth.uid() IN (d.buyer_id,d.seller_id))) OR has_role(auth.uid(),'admin'));
CREATE POLICY de_insert ON public.dispute_evidence FOR INSERT TO authenticated WITH CHECK (auth.uid()=uploaded_by AND EXISTS (SELECT 1 FROM disputes x JOIN deals d ON d.id=x.deal_id WHERE x.id=dispute_id AND x.status<>'resolved' AND (auth.uid() IN (d.buyer_id,d.seller_id))));

ALTER TABLE public.profiles
  ADD COLUMN nationality text,
  ADD COLUMN date_of_birth date,
  ADD COLUMN id_type text,
  ADD COLUMN id_number text,
  ADD COLUMN address text,
  ADD COLUMN country text,
  ADD COLUMN account_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN account_state text NOT NULL DEFAULT 'active',
  ADD COLUMN pdpl_consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status OR NEW.account_state IS DISTINCT FROM OLD.account_state THEN
    RAISE EXCEPTION 'Only Insight staff can change verification or account state.';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_fields();

CREATE TABLE public.business_profiles (
  user_id uuid PRIMARY KEY,
  legal_name text NOT NULL,
  registration_number text NOT NULL,
  country text NOT NULL,
  tax_number text,
  authorized_person text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_profiles TO authenticated;
GRANT ALL ON public.business_profiles TO service_role;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY bp_own ON public.business_profiles FOR SELECT TO authenticated USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY bp_ins ON public.business_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id AND verification_status='pending');
CREATE POLICY bp_upd ON public.business_profiles FOR UPDATE TO authenticated USING (auth.uid()=user_id OR has_role(auth.uid(),'admin')) WITH CHECK (auth.uid()=user_id OR has_role(auth.uid(),'admin'));
CREATE TRIGGER bp_updated BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.payout_accounts (
  user_id uuid PRIMARY KEY,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  iban text NOT NULL,
  country text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payout_accounts TO authenticated;
GRANT ALL ON public.payout_accounts TO service_role;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY pa_read ON public.payout_accounts FOR SELECT TO authenticated USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY pa_ins ON public.payout_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id AND verified=false);
CREATE POLICY pa_upd ON public.payout_accounts FOR UPDATE TO authenticated USING (auth.uid()=user_id OR has_role(auth.uid(),'admin')) WITH CHECK (auth.uid()=user_id OR has_role(auth.uid(),'admin'));
CREATE TRIGGER pa_updated BEFORE UPDATE ON public.payout_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER audit_payout AFTER INSERT OR UPDATE ON public.payout_accounts FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TABLE public.risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id),
  user_id uuid,
  level text NOT NULL,
  factors jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'open',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.risk_flags TO authenticated;
GRANT ALL ON public.risk_flags TO service_role;
ALTER TABLE public.risk_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY rf_staff ON public.risk_flags FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY rf_staff_upd ON public.risk_flags FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE SEQUENCE public.tax_invoice_seq START 1001;
CREATE TABLE public.tax_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) UNIQUE,
  invoice_number text NOT NULL UNIQUE DEFAULT ('INV-' || nextval('public.tax_invoice_seq')),
  fee numeric NOT NULL,
  vat_rate numeric NOT NULL,
  vat numeric NOT NULL,
  total numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  issued_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tax_invoices TO authenticated;
GRANT ALL ON public.tax_invoices TO service_role;
GRANT USAGE ON SEQUENCE public.tax_invoice_seq TO service_role;
ALTER TABLE public.tax_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY ti_read ON public.tax_invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid() IN (d.buyer_id,d.seller_id))) OR has_role(auth.uid(),'admin'));

-- Rule-based risk engine on new deals
CREATE OR REPLACE FUNCTION public.score_deal_risk()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f jsonb := '[]'; lvl text; creator_age interval; n_recent int; n_disputes int;
BEGIN
  SELECT now() - created_at INTO creator_age FROM auth.users WHERE id = NEW.created_by;
  IF creator_age < interval '7 days' THEN f := f || '"New account"'; END IF;
  IF NEW.amount >= 100000 THEN f := f || '"High transaction amount"'; END IF;
  IF NEW.currency NOT IN ('SAR','AED','BHD','QAR','KWD','OMR') THEN f := f || '"Non-GCC currency"'; END IF;
  SELECT count(*) INTO n_recent FROM deals WHERE created_by = NEW.created_by AND created_at > now() - interval '24 hours';
  IF n_recent >= 5 THEN f := f || '"Unusual transaction frequency"'; END IF;
  SELECT count(*) INTO n_disputes FROM disputes WHERE opened_by = NEW.created_by;
  IF n_disputes >= 3 THEN f := f || '"Multiple disputes"'; END IF;
  lvl := CASE WHEN jsonb_array_length(f) >= 3 THEN 'MANUAL_REVIEW' WHEN jsonb_array_length(f) = 2 THEN 'HIGH' WHEN jsonb_array_length(f) = 1 THEN 'MEDIUM' ELSE 'LOW' END;
  IF lvl <> 'LOW' THEN
    INSERT INTO risk_flags(deal_id, user_id, level, factors) VALUES (NEW.id, NEW.created_by, lvl, f);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.score_deal_risk() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER score_deal_risk AFTER INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION score_deal_risk();

-- Automatic release after inspection period
CREATE OR REPLACE FUNCTION public.run_auto_release()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT * FROM deals WHERE status='delivered' AND auto_release_enabled AND NOT frozen
           AND auto_release_at IS NOT NULL AND auto_release_at <= now()
           AND NOT EXISTS (SELECT 1 FROM deal_transactions t WHERE t.deal_id=deals.id AND t.kind='release' AND t.status IN ('pending','processing','succeeded'))
  LOOP
    INSERT INTO deal_transactions(deal_id, kind, amount, currency, status, provider, note, idempotency_key)
    VALUES (r.id, 'release', r.amount, r.currency, 'processing', 'manual', 'Automatic release after the inspection period', r.ref || '-RELEASE-AUTO');
    INSERT INTO deal_events(deal_id, title, note) VALUES (r.id, 'Inspection period ended — automatic release started', 'No dispute was opened in time.');
    INSERT INTO notifications(user_id, deal_id, kind, title, body)
      SELECT u, r.id, 'payment', 'Automatic release started for ' || r.ref, 'The inspection period ended without a dispute.'
      FROM unnest(ARRAY[r.buyer_id, r.seller_id]) u WHERE u IS NOT NULL;
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.run_auto_release() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('insight-auto-release', '0 * * * *', $$SELECT public.run_auto_release();$$);