DO $$ BEGIN CREATE TYPE public.deal_type AS ENUM ('goods','services','contracting','freelance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_type public.deal_type NOT NULL DEFAULT 'goods',
  ADD COLUMN IF NOT EXISTS retention_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defects_liability_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funding_mode text NOT NULL DEFAULT 'upfront',
  ADD COLUMN IF NOT EXISTS revisions_included integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revisions_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS handover_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_released_at timestamptz;

ALTER TABLE public.deal_transactions
  ADD COLUMN IF NOT EXISTS milestone_id uuid,
  ADD COLUMN IF NOT EXISTS release_part text;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS milestone_id uuid;

CREATE TABLE IF NOT EXISTS public.deal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  kind text NOT NULL DEFAULT 'work',
  title text NOT NULL,
  description text,
  amount numeric NOT NULL,
  due_date date,
  evidence_required text,
  status text NOT NULL DEFAULT 'pending',
  funded_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  released_at timestamptz,
  auto_release_at timestamptz,
  evidence_note text,
  revision_note text,
  retention_amount numeric NOT NULL DEFAULT 0,
  fee_share numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  net_released numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, seq)
);
GRANT SELECT ON public.deal_milestones TO authenticated;
GRANT ALL ON public.deal_milestones TO service_role;
ALTER TABLE public.deal_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_milestones_party_read ON public.deal_milestones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())));
CREATE POLICY deal_milestones_staff_read ON public.deal_milestones FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE OR REPLACE FUNCTION public.protect_deal_milestones()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Milestones can only be changed through an Insight deal action.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.status NOT IN ('pending','funded','submitted','revision_requested','disputed','released','refunded') THEN
    RAISE EXCEPTION 'Invalid milestone status: %', NEW.status; END IF;
  IF NEW.kind NOT IN ('advance','work') THEN RAISE EXCEPTION 'Invalid milestone kind'; END IF;
  IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Milestone amounts must be positive'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_deal_milestones BEFORE INSERT OR UPDATE OR DELETE ON public.deal_milestones
  FOR EACH ROW EXECUTE FUNCTION public.protect_deal_milestones();
CREATE TRIGGER audit_deal_milestones AFTER INSERT OR UPDATE OR DELETE ON public.deal_milestones
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE OR REPLACE FUNCTION public.validate_deal_status()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status NOT IN ('pending_funding','held','in_progress','delivered','under_review','released','completed','refunded','partially_refunded','disputed','rejected','cancelled') THEN
    RAISE EXCEPTION 'Invalid deal status: %', NEW.status;
  END IF;
  IF NEW.funding_mode NOT IN ('upfront','per_milestone') THEN RAISE EXCEPTION 'Invalid funding mode'; END IF;
  IF NEW.retention_percent < 0 OR NEW.retention_percent > 10 THEN RAISE EXCEPTION 'Retention must be between 0 and 10%%'; END IF;
  IF NEW.defects_liability_days < 0 OR NEW.defects_liability_days > 365 THEN RAISE EXCEPTION 'Defects liability period must be 0-365 days'; END IF;
  RETURN NEW;
END; $function$;

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
  NEW.revisions_used := 0; NEW.handover_at := NULL; NEW.retention_release_at := NULL; NEW.retention_released_at := NULL;
  IF NEW.shipping_status IS NULL OR NEW.shipping_status NOT IN ('not_required','preparing') THEN NEW.shipping_status := 'preparing'; END IF;
  IF NEW.inspection_days IS NULL OR NEW.inspection_days < 1 OR NEW.inspection_days > 30 THEN
    RAISE EXCEPTION 'The inspection period must be between 1 and 30 days.'; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_deal_transition()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR has_role(uid,'admin') THEN RETURN NEW; END IF;
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
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.deal_type IS DISTINCT FROM OLD.deal_type OR NEW.retention_percent IS DISTINCT FROM OLD.retention_percent
     OR NEW.defects_liability_days IS DISTINCT FROM OLD.defects_liability_days OR NEW.funding_mode IS DISTINCT FROM OLD.funding_mode
     OR NEW.revisions_included IS DISTINCT FROM OLD.revisions_included OR NEW.revisions_used IS DISTINCT FROM OLD.revisions_used
     OR NEW.handover_at IS DISTINCT FROM OLD.handover_at OR NEW.retention_release_at IS DISTINCT FROM OLD.retention_release_at
     OR NEW.retention_released_at IS DISTINCT FROM OLD.retention_released_at THEN
    RAISE EXCEPTION 'This deal field can only be changed through an Insight deal action.';
  END IF;
  RETURN NEW;
END; $function$;