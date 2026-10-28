-- The demo reset (reset_demo_data) deletes every deal, which cascades to deal_routes; the route lock refused that delete,
-- so "Reset demo data" failed with "Deal route is locked". The lock still refuses any provider change, and any delete
-- outside the reset (reset_demo_data sets insight.demo_reset = 'on' for its own transaction only).
CREATE OR REPLACE FUNCTION public.guard_deal_route() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF coalesce(current_setting('insight.demo_reset', true), 'off') = 'on' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Deal route is locked: one deal uses one provider from pay-in to payout';
  END IF;
  IF NEW.provider IS DISTINCT FROM OLD.provider OR NEW.rule_version IS DISTINCT FROM OLD.rule_version THEN
    RAISE EXCEPTION 'Deal route is locked: one deal uses one provider from pay-in to payout';
  END IF;
  RETURN NEW;
END $$;
