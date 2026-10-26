ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS routing_mode text NOT NULL DEFAULT 'simulated_only' CHECK (routing_mode IN ('simulated_only','price_book_sandbox'));
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS cross_provider_settlement boolean NOT NULL DEFAULT false CHECK (cross_provider_settlement = false);
COMMENT ON COLUMN public.platform_settings.cross_provider_settlement IS 'Future capability, pending approval. Must stay false: one deal = one provider.';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS route_provider text, ADD COLUMN IF NOT EXISTS route_rule_version text, ADD COLUMN IF NOT EXISTS route_reasons jsonb, ADD COLUMN IF NOT EXISTS route_locked_at timestamptz;
ALTER TABLE public.fx_quotes ADD COLUMN IF NOT EXISTS route_provider text, ADD COLUMN IF NOT EXISTS route_rule_version text, ADD COLUMN IF NOT EXISTS route_reasons jsonb;

CREATE OR REPLACE FUNCTION public.guard_deal_route() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.route_provider IS NOT NULL AND (NEW.route_provider IS DISTINCT FROM OLD.route_provider OR NEW.route_rule_version IS DISTINCT FROM OLD.route_rule_version) THEN
    RAISE EXCEPTION 'Deal route is locked: one deal uses one provider from pay-in to payout';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS deals_route_lock ON public.deals;
CREATE TRIGGER deals_route_lock BEFORE UPDATE OF route_provider, route_rule_version ON public.deals FOR EACH ROW EXECUTE FUNCTION public.guard_deal_route();

CREATE OR REPLACE FUNCTION public.guard_quote_route() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE locked text;
BEGIN
  SELECT route_provider INTO locked FROM public.deals WHERE id = NEW.deal_id;
  IF locked IS NOT NULL AND NEW.route_provider IS DISTINCT FROM locked THEN
    RAISE EXCEPTION 'Quote provider must match the provider locked on the deal';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fx_quotes_route_guard ON public.fx_quotes;
CREATE TRIGGER fx_quotes_route_guard BEFORE INSERT ON public.fx_quotes FOR EACH ROW EXECUTE FUNCTION public.guard_quote_route();

CREATE OR REPLACE FUNCTION public.lock_deal_route_on_funding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.fx_quotes;
BEGIN
  IF NEW.kind = 'funding' AND NEW.fx_quote_id IS NOT NULL THEN
    SELECT * INTO q FROM public.fx_quotes WHERE id = NEW.fx_quote_id;
    IF q.route_provider IS NOT NULL THEN
      UPDATE public.deals SET route_provider = q.route_provider, route_rule_version = q.route_rule_version, route_reasons = q.route_reasons, route_locked_at = now()
        WHERE id = NEW.deal_id AND route_provider IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lock_deal_route_on_funding() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS deal_transactions_route_lock ON public.deal_transactions;
CREATE TRIGGER deal_transactions_route_lock AFTER INSERT ON public.deal_transactions FOR EACH ROW EXECUTE FUNCTION public.lock_deal_route_on_funding();

ALTER TABLE public.finance_records DROP CONSTRAINT IF EXISTS finance_records_kind_check;
ALTER TABLE public.finance_records ADD CONSTRAINT finance_records_kind_check CHECK (kind IN ('provider_proposal','routing_proposal','approval','reconciliation_import','reconciliation_resolution','routing_simulation','export','price_book_proposal','routing_table_proposal','routing_mode_proposal'));

CREATE OR REPLACE FUNCTION public.finance_append_record(_actor uuid,_kind text,_subject text,_payload jsonb,_reason text,_key uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE result uuid; proposed public.finance_records; oldrecord public.finance_records; admin_role boolean; BEGIN
admin_role := public.has_role(_actor,'admin') OR public.has_role(_actor,'super_admin');
IF NOT(admin_role OR public.has_role(_actor,'staff')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF NOT admin_role AND (public.has_role(_actor,'compliance') OR (public.has_role(_actor,'support') AND NOT public.has_role(_actor,'finance'))) THEN RAISE EXCEPTION 'Finance capability required'; END IF;
IF _kind IN ('provider_proposal','routing_proposal','approval','price_book_proposal','routing_table_proposal','routing_mode_proposal') AND NOT admin_role THEN RAISE EXCEPTION 'Admin capability required'; END IF;
IF length(trim(_reason))<3 OR length(_reason)>2000 THEN RAISE EXCEPTION 'Reason required'; END IF;
IF octet_length(_payload::text)>500000 THEN RAISE EXCEPTION 'Record too large'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(_actor::text||_key::text));
SELECT * INTO oldrecord FROM public.finance_records WHERE actor_id=_actor AND idempotency_key=_key;
IF FOUND THEN IF oldrecord.kind<>_kind OR oldrecord.subject_id<>_subject OR oldrecord.payload<>_payload OR oldrecord.reason<>_reason THEN RAISE EXCEPTION 'Idempotency conflict'; END IF; RETURN oldrecord.id; END IF;
IF _kind='approval' THEN
 SELECT * INTO proposed FROM public.finance_records WHERE id::text=_subject FOR UPDATE;
 IF NOT FOUND OR proposed.kind NOT IN ('provider_proposal','routing_proposal','price_book_proposal','routing_table_proposal','routing_mode_proposal') THEN RAISE EXCEPTION 'Proposal missing'; END IF;
 IF proposed.actor_id=_actor THEN RAISE EXCEPTION 'Independent approver required'; END IF;
END IF;
IF _kind IN ('provider_proposal','routing_proposal','price_book_proposal','routing_table_proposal','routing_mode_proposal') AND (_payload->>'environment' IS DISTINCT FROM 'sandbox' OR coalesce((_payload->>'live')::boolean,false)) THEN RAISE EXCEPTION 'Live operations disabled'; END IF;
INSERT INTO public.finance_records(actor_id,kind,subject_id,payload,reason,idempotency_key) VALUES(_actor,_kind,_subject,_payload,_reason,_key) RETURNING id INTO result;
IF _kind='approval' AND proposed.kind='routing_mode_proposal' THEN
  UPDATE public.platform_settings SET routing_mode = proposed.payload->>'mode', updated_at = now() WHERE id = true;
END IF;
PERFORM public.staff_control_audit(_actor,'FINANCE_'||upper(_kind),'finance_records',result::text,NULL,_payload||jsonb_build_object('subject',_subject),_reason);
RETURN result; END $$;
REVOKE ALL ON FUNCTION public.finance_append_record(uuid,text,text,jsonb,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finance_append_record(uuid,text,text,jsonb,text,uuid) TO service_role;