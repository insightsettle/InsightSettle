-- Founder decision (27 Oct): customers must never see which payment provider serves their deal.
-- The route (provider, rule version, reasons) moves out of the customer-readable `deals` and `fx_quotes`
-- into service-only tables. Behaviour is unchanged: one deal = one provider, locked at the first funding.

CREATE TABLE IF NOT EXISTS public.deal_routes (
  deal_id uuid PRIMARY KEY REFERENCES public.deals(id) ON DELETE CASCADE,
  provider text NOT NULL,
  rule_version text,
  reasons jsonb,
  locked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fx_quote_routes (
  fx_quote_id uuid PRIMARY KEY REFERENCES public.fx_quotes(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL,
  provider text NOT NULL,
  rule_version text,
  reasons jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fx_quote_routes_deal_idx ON public.fx_quote_routes(deal_id);
ALTER TABLE public.deal_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_quote_routes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deal_routes, public.fx_quote_routes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.deal_routes, public.fx_quote_routes TO service_role;

-- Keep existing routes.
INSERT INTO public.deal_routes(deal_id, provider, rule_version, reasons, locked_at)
  SELECT id, route_provider, route_rule_version, route_reasons, coalesce(route_locked_at, now()) FROM public.deals WHERE route_provider IS NOT NULL
  ON CONFLICT (deal_id) DO NOTHING;
INSERT INTO public.fx_quote_routes(fx_quote_id, deal_id, provider, rule_version, reasons)
  SELECT id, deal_id, route_provider, route_rule_version, route_reasons FROM public.fx_quotes WHERE route_provider IS NOT NULL
  ON CONFLICT (fx_quote_id) DO NOTHING;

-- Remove the old customer-visible columns and their triggers.
DROP TRIGGER IF EXISTS deals_route_lock ON public.deals;
DROP TRIGGER IF EXISTS fx_quotes_route_guard ON public.fx_quotes;
DROP TRIGGER IF EXISTS deal_transactions_route_lock ON public.deal_transactions;
DROP VIEW IF EXISTS public.finance_transactions;
ALTER TABLE public.deals DROP COLUMN IF EXISTS route_provider, DROP COLUMN IF EXISTS route_rule_version, DROP COLUMN IF EXISTS route_reasons, DROP COLUMN IF EXISTS route_locked_at;
ALTER TABLE public.fx_quotes DROP COLUMN IF EXISTS route_provider, DROP COLUMN IF EXISTS route_rule_version, DROP COLUMN IF EXISTS route_reasons;

-- Provider details inside stored quote breakdowns are not needed by customers.
UPDATE public.fx_quotes SET breakdown = breakdown - 'routes' - 'routingMode' WHERE breakdown ? 'routes' OR breakdown ? 'routingMode';

-- Guards on the new tables.
CREATE OR REPLACE FUNCTION public.guard_deal_route() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Deal route is locked: one deal uses one provider from pay-in to payout'; END IF;
  IF NEW.provider IS DISTINCT FROM OLD.provider OR NEW.rule_version IS DISTINCT FROM OLD.rule_version THEN
    RAISE EXCEPTION 'Deal route is locked: one deal uses one provider from pay-in to payout';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS deal_routes_lock ON public.deal_routes;
CREATE TRIGGER deal_routes_lock BEFORE UPDATE OR DELETE ON public.deal_routes FOR EACH ROW EXECUTE FUNCTION public.guard_deal_route();

CREATE OR REPLACE FUNCTION public.guard_quote_route() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE locked text;
BEGIN
  SELECT provider INTO locked FROM public.deal_routes WHERE deal_id = NEW.deal_id;
  IF locked IS NOT NULL AND NEW.provider IS DISTINCT FROM locked THEN
    RAISE EXCEPTION 'Quote provider must match the provider locked on the deal';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fx_quote_routes_guard ON public.fx_quote_routes;
CREATE TRIGGER fx_quote_routes_guard BEFORE INSERT OR UPDATE ON public.fx_quote_routes FOR EACH ROW EXECUTE FUNCTION public.guard_quote_route();

CREATE OR REPLACE FUNCTION public.lock_deal_route_on_funding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.fx_quote_routes;
BEGIN
  IF NEW.kind = 'funding' AND NEW.fx_quote_id IS NOT NULL THEN
    SELECT * INTO r FROM public.fx_quote_routes WHERE fx_quote_id = NEW.fx_quote_id;
    IF FOUND THEN
      INSERT INTO public.deal_routes(deal_id, provider, rule_version, reasons) VALUES (NEW.deal_id, r.provider, r.rule_version, r.reasons)
        ON CONFLICT (deal_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lock_deal_route_on_funding() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER deal_transactions_route_lock AFTER INSERT ON public.deal_transactions FOR EACH ROW EXECUTE FUNCTION public.lock_deal_route_on_funding();

-- Staff-only normalized view (read by server functions with the service role).
CREATE VIEW public.finance_transactions WITH (security_invoker = true) AS
  SELECT t.id,t.deal_id,d.ref AS deal_ref,d.buyer_id,d.seller_id,t.kind,t.amount::text AS amount,t.fee::text AS fee,t.currency,t.status,t.provider,t.provider_ref,t.created_at,t.updated_at,t.original_transaction_id,t.milestone_id,t.payout_split_id,t.fx_quote_id,
    CASE WHEN t.status='succeeded' AND t.kind='funding' THEN 'captured_simulated' WHEN t.status='succeeded' AND t.kind='refund' THEN 'refund_confirmed_simulated' WHEN t.status='succeeded' AND t.kind='release' THEN 'payout_confirmed_simulated' ELSE t.status END AS operational_status,
    'sandbox'::text AS environment, r.provider AS route_provider, r.rule_version AS route_rule_version
  FROM public.deal_transactions t JOIN public.deals d ON d.id=t.deal_id LEFT JOIN public.deal_routes r ON r.deal_id=t.deal_id;
REVOKE ALL ON public.finance_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.finance_transactions TO service_role;

-- Customer-readable transaction rows keep a neutral provider code; the real provider lives only in deal_routes.
-- A future adapter that tries to write its own name here fails loudly instead of leaking it.
ALTER TABLE public.deal_transactions DROP CONSTRAINT IF EXISTS deal_transactions_provider_neutral;
ALTER TABLE public.deal_transactions ADD CONSTRAINT deal_transactions_provider_neutral CHECK (provider IN ('manual', 'insight'));
