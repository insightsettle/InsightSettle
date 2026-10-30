-- Partner API v1 (founder, 30 Oct 2026): a verified business connects its own system to Insight.
-- The partner creates a deal from its server and sends the buyer to Insight's own pages to accept the terms and pay.
-- Money moves only by Insight's rules (buyer confirmation, inspection timer, two-staff dispute decision).
-- Every table here is service-only: the API and the partner portal read and write through the server.

CREATE TABLE IF NOT EXISTS public.partner_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  webhook_url text CHECK (webhook_url IS NULL OR webhook_url ~ '^https://'),
  webhook_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  label text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS partner_api_keys_partner_idx ON public.partner_api_keys(partner_id);

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partner_accounts(id),
  ADD COLUMN IF NOT EXISTS partner_reference text,
  ADD COLUMN IF NOT EXISTS partner_metadata jsonb,
  ADD COLUMN IF NOT EXISTS partner_return_url text,
  ADD COLUMN IF NOT EXISTS partner_mode text CHECK (partner_mode IS NULL OR partner_mode IN ('test', 'live'));
CREATE UNIQUE INDEX IF NOT EXISTS deals_partner_reference_uq ON public.deals(partner_id, partner_reference) WHERE partner_id IS NOT NULL AND partner_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.partner_idempotency (
  partner_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  idem_key text NOT NULL CHECK (length(idem_key) BETWEEN 8 AND 120),
  request_hash text NOT NULL,
  status integer NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, idem_key)
);

CREATE TABLE IF NOT EXISTS public.partner_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_status integer,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS partner_webhook_events_due_idx ON public.partner_webhook_events(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS partner_webhook_events_partner_idx ON public.partner_webhook_events(partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.partner_request_log (
  id bigserial PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  key_id uuid REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  method text NOT NULL,
  path text NOT NULL,
  status integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_request_log_recent_idx ON public.partner_request_log(partner_id, created_at DESC);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['partner_accounts','partner_api_keys','partner_idempotency','partner_webhook_events','partner_request_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.partner_request_log_id_seq TO service_role;

-- The event body a partner receives: the deal as it is at the moment of the event.
CREATE OR REPLACE FUNCTION public.partner_deal_snapshot(d public.deals)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'id', d.id, 'ref', d.ref, 'reference', d.partner_reference, 'mode', d.partner_mode,
    'type', d.deal_type, 'status', d.status, 'terms_status', d.terms_status, 'shipping_status', d.shipping_status,
    'amount', d.amount, 'currency', d.currency, 'buyer_joined', d.buyer_id IS NOT NULL,
    'delivered_at', d.delivered_at, 'auto_release_at', d.auto_release_at, 'released_at', d.released_at,
    'metadata', COALESCE(d.partner_metadata, '{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.partner_emit(_partner uuid, _deal uuid, _type text, _data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ev uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.partner_webhook_events(id, partner_id, deal_id, type, payload)
  VALUES (ev, _partner, _deal, _type, jsonb_build_object('id', ev, 'type', _type, 'created_at', clock_timestamp(), 'api_version', 'v1', 'data', _data));
END $$;

CREATE OR REPLACE FUNCTION public.partner_deal_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE snap jsonb; t text;
BEGIN
  IF NEW.partner_id IS NULL THEN RETURN NEW; END IF;
  snap := jsonb_build_object('deal', public.partner_deal_snapshot(NEW));
  IF TG_OP = 'INSERT' THEN
    PERFORM public.partner_emit(NEW.partner_id, NEW.id, 'deal.created', snap);
    RETURN NEW;
  END IF;
  IF NEW.buyer_id IS NOT NULL AND OLD.buyer_id IS NULL THEN
    PERFORM public.partner_emit(NEW.partner_id, NEW.id, 'deal.buyer_joined', snap);
  END IF;
  IF NEW.terms_status IS DISTINCT FROM OLD.terms_status AND NEW.terms_status = 'agreed' THEN
    PERFORM public.partner_emit(NEW.partner_id, NEW.id, 'deal.terms_agreed', snap);
  END IF;
  IF NEW.shipping_status IS DISTINCT FROM OLD.shipping_status AND NEW.shipping_status NOT IN ('not_required', 'delivered') THEN
    PERFORM public.partner_emit(NEW.partner_id, NEW.id, 'deal.shipping_updated', snap);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    t := CASE NEW.status
      WHEN 'held' THEN 'deal.funded'
      WHEN 'in_progress' THEN CASE WHEN OLD.status = 'pending_funding' THEN 'deal.funded' ELSE 'deal.status_changed' END
      WHEN 'delivered' THEN 'deal.delivered'
      WHEN 'under_review' THEN 'deal.revision_requested'
      WHEN 'released' THEN 'deal.released'
      WHEN 'completed' THEN 'deal.completed'
      WHEN 'disputed' THEN 'deal.disputed'
      WHEN 'refunded' THEN 'deal.refunded'
      WHEN 'partially_refunded' THEN 'deal.partially_refunded'
      WHEN 'cancelled' THEN 'deal.cancelled'
      ELSE 'deal.status_changed' END;
    PERFORM public.partner_emit(NEW.partner_id, NEW.id, t, snap || jsonb_build_object('previous_status', OLD.status));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS partner_deal_events_ins ON public.deals;
CREATE TRIGGER partner_deal_events_ins AFTER INSERT ON public.deals FOR EACH ROW WHEN (NEW.partner_id IS NOT NULL) EXECUTE FUNCTION public.partner_deal_events();
DROP TRIGGER IF EXISTS partner_deal_events_upd ON public.deals;
CREATE TRIGGER partner_deal_events_upd AFTER UPDATE ON public.deals FOR EACH ROW WHEN (NEW.partner_id IS NOT NULL) EXECUTE FUNCTION public.partner_deal_events();

CREATE OR REPLACE FUNCTION public.partner_milestone_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.deals;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT * INTO d FROM public.deals WHERE id = NEW.deal_id;
  IF d.partner_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.partner_emit(d.partner_id, d.id, 'milestone.' || NEW.status, jsonb_build_object(
    'deal', public.partner_deal_snapshot(d),
    'milestone', jsonb_build_object('id', NEW.id, 'seq', NEW.seq, 'title', NEW.title, 'amount', NEW.amount, 'status', NEW.status, 'previous_status', OLD.status)));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS partner_milestone_events_upd ON public.deal_milestones;
CREATE TRIGGER partner_milestone_events_upd AFTER UPDATE ON public.deal_milestones FOR EACH ROW EXECUTE FUNCTION public.partner_milestone_events();

REVOKE ALL ON FUNCTION public.partner_emit(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
