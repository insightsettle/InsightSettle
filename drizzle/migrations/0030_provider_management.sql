CREATE TABLE IF NOT EXISTS public.finance_provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  field text NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  last4 text NOT NULL,
  set_by uuid NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now(),
  proposal_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','superseded','removed','rejected'))
);
GRANT SELECT, INSERT ON public.finance_provider_credentials TO service_role;
ALTER TABLE public.finance_provider_credentials ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS finance_provider_credentials_lookup ON public.finance_provider_credentials(provider, environment, field, status);
COMMENT ON TABLE public.finance_provider_credentials IS 'AES-GCM encrypted provider credentials; service role only, decrypted only in server functions. Status changes only through finance_append_record approvals.';

ALTER TABLE public.finance_records DROP CONSTRAINT IF EXISTS finance_records_kind_check;
ALTER TABLE public.finance_records ADD CONSTRAINT finance_records_kind_check CHECK (kind IN ('provider_proposal','routing_proposal','approval','reconciliation_import','reconciliation_resolution','routing_simulation','export','price_book_proposal','routing_table_proposal','routing_mode_proposal','provider_profile_proposal','provider_jobs_proposal','provider_limits_proposal','credential_proposal','rejection','connection_test'));

CREATE OR REPLACE FUNCTION public.finance_append_record(_actor uuid,_kind text,_subject text,_payload jsonb,_reason text,_key uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid; proposed public.finance_records; oldrecord public.finance_records; admin_role boolean;
  proposal_kinds text[] := ARRAY['provider_proposal','routing_proposal','price_book_proposal','routing_table_proposal','routing_mode_proposal','provider_profile_proposal','provider_jobs_proposal','provider_limits_proposal','credential_proposal'];
BEGIN
admin_role := public.has_role(_actor,'admin') OR public.has_role(_actor,'super_admin');
IF NOT(admin_role OR public.has_role(_actor,'staff')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF NOT admin_role AND (public.has_role(_actor,'compliance') OR (public.has_role(_actor,'support') AND NOT public.has_role(_actor,'finance'))) THEN RAISE EXCEPTION 'Finance capability required'; END IF;
IF (_kind = ANY(proposal_kinds) OR _kind IN ('approval','rejection','connection_test')) AND NOT admin_role THEN RAISE EXCEPTION 'Admin capability required'; END IF;
IF length(trim(_reason))<3 OR length(_reason)>2000 THEN RAISE EXCEPTION 'Reason required'; END IF;
IF octet_length(_payload::text)>500000 THEN RAISE EXCEPTION 'Record too large'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(_actor::text||_key::text));
SELECT * INTO oldrecord FROM public.finance_records WHERE actor_id=_actor AND idempotency_key=_key;
IF FOUND THEN IF oldrecord.kind<>_kind OR oldrecord.subject_id<>_subject OR oldrecord.payload<>_payload OR oldrecord.reason<>_reason THEN RAISE EXCEPTION 'Idempotency conflict'; END IF; RETURN oldrecord.id; END IF;
IF _kind IN ('approval','rejection') THEN
 SELECT * INTO proposed FROM public.finance_records WHERE id::text=_subject FOR UPDATE;
 IF NOT FOUND OR NOT (proposed.kind = ANY(proposal_kinds)) THEN RAISE EXCEPTION 'Proposal missing'; END IF;
 IF EXISTS (SELECT 1 FROM public.finance_records WHERE subject_id=_subject AND kind IN ('approval','rejection')) THEN RAISE EXCEPTION 'Proposal already decided'; END IF;
 IF _kind='approval' AND proposed.actor_id=_actor THEN RAISE EXCEPTION 'Independent approver required'; END IF;
END IF;
IF (_kind = ANY(proposal_kinds)) AND (_payload->>'environment' IS DISTINCT FROM 'sandbox' OR coalesce((_payload->>'live')::boolean,false)) THEN RAISE EXCEPTION 'Live operations disabled'; END IF;
INSERT INTO public.finance_records(actor_id,kind,subject_id,payload,reason,idempotency_key) VALUES(_actor,_kind,_subject,_payload,_reason,_key) RETURNING id INTO result;
IF _kind='approval' AND proposed.kind='routing_mode_proposal' THEN
  UPDATE public.platform_settings SET routing_mode = proposed.payload->>'mode', updated_at = now() WHERE id = true;
END IF;
IF proposed.kind='credential_proposal' AND _kind='approval' THEN
  IF proposed.payload->>'action' = 'remove' THEN
    UPDATE public.finance_provider_credentials SET status='removed' WHERE provider=proposed.payload->>'provider' AND environment=proposed.payload->>'credential_environment' AND field=proposed.payload->>'field' AND status='active';
  ELSE
    UPDATE public.finance_provider_credentials SET status='superseded' WHERE provider=proposed.payload->>'provider' AND environment=proposed.payload->>'credential_environment' AND field=proposed.payload->>'field' AND status='active';
    UPDATE public.finance_provider_credentials SET status='active' WHERE proposal_id=proposed.id AND status='pending';
  END IF;
END IF;
IF proposed.kind='credential_proposal' AND _kind='rejection' THEN
  UPDATE public.finance_provider_credentials SET status='rejected' WHERE proposal_id=proposed.id AND status='pending';
END IF;
PERFORM public.staff_control_audit(_actor,'FINANCE_'||upper(_kind),'finance_records',result::text,NULL,_payload||jsonb_build_object('subject',_subject),_reason);
RETURN result; END $$;
REVOKE ALL ON FUNCTION public.finance_append_record(uuid,text,text,jsonb,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finance_append_record(uuid,text,text,jsonb,text,uuid) TO service_role;

CREATE OR REPLACE VIEW public.finance_transactions WITH (security_invoker = true) AS SELECT t.id,t.deal_id,d.ref AS deal_ref,d.buyer_id,d.seller_id,t.kind,t.amount::text AS amount,t.fee::text AS fee,t.currency,t.status,t.provider,t.provider_ref,t.created_at,t.updated_at,t.original_transaction_id,t.milestone_id,t.payout_split_id,t.fx_quote_id, CASE WHEN t.status='succeeded' AND t.kind='funding' THEN 'captured_simulated' WHEN t.status='succeeded' AND t.kind='refund' THEN 'refund_confirmed_simulated' WHEN t.status='succeeded' AND t.kind='release' THEN 'payout_confirmed_simulated' ELSE t.status END AS operational_status, 'sandbox'::text AS environment, d.route_provider, d.route_rule_version FROM public.deal_transactions t JOIN public.deals d ON d.id=t.deal_id;
GRANT SELECT ON public.finance_transactions TO authenticated,service_role;