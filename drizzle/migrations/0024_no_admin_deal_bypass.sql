-- IC-2 / K-8: protected deal fields change only through server deal actions (service role), never a direct admin session write.
CREATE OR REPLACE FUNCTION public.enforce_deal_transition()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
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
