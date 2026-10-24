CREATE OR REPLACE FUNCTION public.staff_account_state(_actor uuid,_user uuid,_state text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE oldstate text; BEGIN
 IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'staff')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _state IS NULL OR _state NOT IN ('active','restricted','suspended') THEN RAISE EXCEPTION 'Invalid state'; END IF;
 SELECT account_state INTO oldstate FROM public.profiles WHERE id=_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
 UPDATE public.profiles SET account_state=_state WHERE id=_user;
 PERFORM public.staff_control_audit(_actor,'ACCOUNT_STATE','profiles',_user::text,jsonb_build_object('account_state',oldstate),jsonb_build_object('account_state',_state),_reason);
END $$;
CREATE FUNCTION public.guard_staff_unfreeze_dispute() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF OLD.frozen AND NOT NEW.frozen AND EXISTS(SELECT 1 FROM public.disputes WHERE deal_id=NEW.id AND status<>'resolved') THEN RAISE EXCEPTION 'Resolve the dispute through four-eyes review first'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_unfreeze_dispute_guard BEFORE UPDATE OF frozen ON public.deals FOR EACH ROW WHEN (NOT public.demo_reset_active()) EXECUTE FUNCTION public.guard_staff_unfreeze_dispute();