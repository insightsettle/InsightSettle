CREATE TABLE public.auction_fee_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id),mode text NOT NULL DEFAULT 'standard',percent numeric NOT NULL DEFAULT 0,min_usd numeric NOT NULL DEFAULT 0,max_usd numeric,fixed_usd numeric NOT NULL DEFAULT 0,default_commission numeric NOT NULL DEFAULT 15,max_commission numeric NOT NULL DEFAULT 100,updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.auction_fee_settings TO anon,authenticated;
GRANT ALL ON public.auction_fee_settings TO service_role;
ALTER TABLE public.auction_fee_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY auction_settings_public_read ON public.auction_fee_settings FOR SELECT TO anon,authenticated USING(true);
INSERT INTO public.auction_fee_settings(id) SELECT true FROM public.profiles LIMIT 1;
CREATE FUNCTION public.staff_control_audit(_actor uuid,_action text,_entity text,_id text,_old jsonb,_new jsonb,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'staff')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _reason IS NULL OR length(trim(_reason))<3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
 INSERT INTO public.audit_logs(user_id,action,entity,entity_id,old_value,new_value) VALUES(_actor,_action,_entity,_id,_old,_new||jsonb_build_object('reason',_reason,'staff_name',(SELECT full_name FROM public.profiles WHERE id=_actor)));
END $$;
REVOKE ALL ON FUNCTION public.staff_control_audit(uuid,text,text,text,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_control_audit(uuid,text,text,text,jsonb,jsonb,text) TO service_role;
CREATE FUNCTION public.staff_save_auction_settings(_actor uuid,_settings jsonb,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE oldrow public.auction_fee_settings; newrow public.auction_fee_settings; BEGIN
 IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
 SELECT * INTO oldrow FROM public.auction_fee_settings WHERE id FOR UPDATE;
 newrow:=jsonb_populate_record(oldrow,_settings);
 IF newrow.mode NOT IN ('standard','percentage','fixed') OR newrow.percent<0 OR newrow.percent>100 OR newrow.min_usd<0 OR newrow.fixed_usd<0 OR (newrow.max_usd IS NOT NULL AND newrow.max_usd<newrow.min_usd) OR newrow.default_commission<0 OR newrow.max_commission>100 OR newrow.default_commission>newrow.max_commission THEN RAISE EXCEPTION 'Invalid auction settings'; END IF;
 UPDATE public.auction_fee_settings SET mode=newrow.mode,percent=newrow.percent,min_usd=newrow.min_usd,max_usd=newrow.max_usd,fixed_usd=newrow.fixed_usd,default_commission=newrow.default_commission,max_commission=newrow.max_commission,updated_at=clock_timestamp() WHERE id;
 PERFORM public.staff_control_audit(_actor,'AUCTION_SETTINGS','auction_fee_settings','true',to_jsonb(oldrow),to_jsonb(newrow),_reason);
END $$;
REVOKE ALL ON FUNCTION public.staff_save_auction_settings(uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_save_auction_settings(uuid,jsonb,text) TO service_role;
CREATE FUNCTION public.guard_auction_commission_cap() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE pct numeric; cap numeric; BEGIN
 pct:=CASE WHEN TG_TABLE_NAME='auctions' THEN (to_jsonb(NEW)->>'organiser_commission_pct')::numeric ELSE (to_jsonb(NEW)->>'organiser_pct')::numeric END;
 SELECT max_commission INTO cap FROM public.auction_fee_settings WHERE id;
 IF TG_OP='INSERT' OR (TG_TABLE_NAME='auctions' AND (to_jsonb(NEW)->'organiser_commission_pct') IS DISTINCT FROM (to_jsonb(OLD)->'organiser_commission_pct')) OR (TG_TABLE_NAME='auction_lots' AND (to_jsonb(NEW)->'organiser_pct') IS DISTINCT FROM (to_jsonb(OLD)->'organiser_pct')) THEN
 IF pct<0 OR pct>cap THEN RAISE EXCEPTION 'Organiser commission exceeds configured maximum'; END IF; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER auction_commission_cap BEFORE INSERT OR UPDATE ON public.auctions FOR EACH ROW WHEN (NOT public.demo_reset_active()) EXECUTE FUNCTION public.guard_auction_commission_cap();
CREATE TRIGGER lot_commission_cap BEFORE INSERT OR UPDATE ON public.auction_lots FOR EACH ROW WHEN (NOT public.demo_reset_active()) EXECUTE FUNCTION public.guard_auction_commission_cap();
DO $$ DECLARE def text; source text; target text; BEGIN
 SELECT pg_get_functiondef('public.guard_auction_lot()'::regprocedure) INTO def;
 source:='NEW.owner_pct IS DISTINCT FROM OLD.owner_pct OR NEW.organiser_pct IS DISTINCT FROM OLD.organiser_pct';
 target:='((NEW.owner_pct IS DISTINCT FROM OLD.owner_pct OR NEW.organiser_pct IS DISTINCT FROM OLD.organiser_pct) AND NOT (auth.uid() IS NULL AND current_setting(''insight.staff_split'',true)=''on''))';
 IF position(source in def)=0 THEN RAISE EXCEPTION 'Lot guard signature changed'; END IF; EXECUTE replace(def,source,target);
 SELECT pg_get_functiondef('public.guard_auction_offer_terms()'::regprocedure) INTO def;
 source:='NEW.terms_version IS DISTINCT FROM OLD.terms_version';
 target:='(NEW.terms_version IS DISTINCT FROM OLD.terms_version AND NOT (auth.uid() IS NULL AND current_setting(''insight.staff_split'',true)=''on'' AND NEW.terms_version=OLD.terms_version+1 AND OLD.status=''pending_funding''))';
 IF position(source in def)=0 THEN RAISE EXCEPTION 'Terms guard signature changed'; END IF; def:=replace(def,source,target);
 source:='NEW.payment_deadline_at IS DISTINCT FROM OLD.payment_deadline_at';
 target:='(NEW.payment_deadline_at IS DISTINCT FROM OLD.payment_deadline_at AND NOT (auth.uid() IS NULL AND current_setting(''insight.staff_terms'',true)=''on'' AND NEW.payment_deadline_at>clock_timestamp() AND (OLD.payment_deadline_at IS NULL OR (OLD.payment_deadline_at>clock_timestamp() AND NEW.payment_deadline_at>OLD.payment_deadline_at))))';
 IF position(source in def)=0 THEN RAISE EXCEPTION 'Deadline guard signature changed'; END IF; EXECUTE replace(def,source,target);
 SELECT pg_get_functiondef('public.guard_lot_bidder()'::regprocedure) INTO def;
 source:='NEW.deadline_at IS DISTINCT FROM OLD.deadline_at';
 target:='(NEW.deadline_at IS DISTINCT FROM OLD.deadline_at AND NOT (auth.uid() IS NULL AND current_setting(''insight.staff_terms'',true)=''on'' AND OLD.status=''offered'' AND NEW.status=OLD.status AND NEW.offered_at=OLD.offered_at AND OLD.deadline_at>clock_timestamp() AND NEW.deadline_at>OLD.deadline_at))';
 IF position(source in def)=0 THEN RAISE EXCEPTION 'Bidder guard signature changed'; END IF; def:=replace(def,source,target);
 source:='owner_pct=100-a.organiser_commission_pct,organiser_pct=a.organiser_commission_pct';
 target:='owner_pct=coalesce(l.owner_pct,100-a.organiser_commission_pct),organiser_pct=coalesce(l.organiser_pct,a.organiser_commission_pct)';
 IF position(source in def)=0 THEN RAISE EXCEPTION 'Split initialization changed'; END IF; EXECUTE replace(def,source,target);
 SELECT pg_get_functiondef('public.guard_auction_deal()'::regprocedure) INTO def;
 source:='NEW.auto_release_at IS DISTINCT FROM NEW.delivered_at+interval ''72 hours''';
 target:='(NEW.auto_release_at IS DISTINCT FROM NEW.delivered_at+interval ''72 hours'' AND NOT (TG_OP=''UPDATE'' AND OLD.status=''delivered'' AND NEW.delivered_at=OLD.delivered_at AND NEW.auto_release_at>=OLD.auto_release_at AND (NEW.auto_release_at=OLD.auto_release_at OR (auth.uid() IS NULL AND current_setting(''insight.staff_inspection'',true)=''on''))))';
 IF position(source in def)=0 THEN RAISE EXCEPTION 'Inspection guard signature changed'; END IF; EXECUTE replace(def,source,target);
END $$;
CREATE FUNCTION public.staff_edit_auction_split(_actor uuid,_lot uuid,_organiser numeric,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l public.auction_lots; aid uuid; d public.deals; org numeric; digits int; snapshot jsonb; BEGIN
 IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'staff')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT auction_id INTO aid FROM public.auction_lots WHERE id=_lot;
 PERFORM 1 FROM public.auctions WHERE id=aid FOR UPDATE;
 SELECT * INTO l FROM public.auction_lots WHERE id=_lot FOR UPDATE;
 IF l.id IS NULL OR l.status NOT IN ('draft','open','offered') OR l.funded_deal_id IS NOT NULL THEN RAISE EXCEPTION 'Paid or closed lot cannot change'; END IF;
 IF _organiser<0 OR _organiser>(SELECT max_commission FROM public.auction_fee_settings WHERE id) THEN RAISE EXCEPTION 'Invalid commission'; END IF;
 PERFORM 1 FROM public.deals WHERE auction_lot_id=_lot ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.deals WHERE auction_lot_id=_lot AND status='pending_funding' AND payment_deadline_at<=clock_timestamp()) THEN RAISE EXCEPTION 'Offer expired'; END IF;
 IF EXISTS(SELECT 1 FROM public.deal_transactions t JOIN public.deals x ON x.id=t.deal_id WHERE x.auction_lot_id=_lot AND t.kind='funding' AND t.status IN ('pending','processing','succeeded')) OR EXISTS(SELECT 1 FROM public.fx_quotes q JOIN public.deals x ON x.id=q.deal_id WHERE x.auction_lot_id=_lot AND q.used_at IS NOT NULL) THEN RAISE EXCEPTION 'Payment reserved or quote used; split is immutable'; END IF;
 PERFORM set_config('insight.staff_split','on',true); PERFORM set_config('insight.staff_terms','on',true);
 UPDATE public.auction_lots SET owner_pct=100-_organiser,organiser_pct=_organiser WHERE id=_lot;
 FOR d IN SELECT * FROM public.deals WHERE auction_lot_id=_lot AND status='pending_funding' LOOP
  digits:=CASE WHEN d.currency IN ('BHD','KWD','OMR') THEN 3 ELSE 2 END; org:=round(d.amount*_organiser/100,digits);
  UPDATE public.deal_payout_splits SET pct=CASE WHEN role='owner' THEN 100-_organiser ELSE _organiser END,amount=CASE WHEN role='owner' THEN d.amount-org ELSE org END WHERE deal_id=d.id;
  SELECT v.snapshot INTO snapshot FROM public.deal_term_versions v WHERE v.deal_id=d.id AND v.version=d.terms_version;
  IF snapshot IS NULL OR jsonb_typeof(snapshot)<>'object' THEN RAISE EXCEPTION 'Current terms required'; END IF;
  IF (SELECT count(*) FROM public.deal_payout_splits WHERE deal_id=d.id)<>2 THEN RAISE EXCEPTION 'Both payout legs required'; END IF;
  UPDATE public.deals SET terms_version=terms_version+1,terms_status='pending' WHERE id=d.id;
  INSERT INTO public.deal_term_versions(deal_id,version,snapshot,created_by,note) VALUES(d.id,d.terms_version+1,snapshot||jsonb_build_object('owner_pct',100-_organiser,'organiser_pct',_organiser),_actor,_reason);
 END LOOP;
 PERFORM set_config('insight.staff_split','off',true); PERFORM set_config('insight.staff_terms','off',true);
 PERFORM public.staff_control_audit(_actor,'AUCTION_SPLIT','auction_lots',_lot::text,jsonb_build_object('owner_pct',l.owner_pct,'organiser_pct',l.organiser_pct),jsonb_build_object('owner_pct',100-_organiser,'organiser_pct',_organiser),_reason);
END $$;
REVOKE ALL ON FUNCTION public.staff_edit_auction_split(uuid,uuid,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_edit_auction_split(uuid,uuid,numeric,text) TO service_role;
CREATE FUNCTION public.staff_operational_update(_actor uuid,_deal uuid,_action text,_value text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.deals; n public.deals; deadline timestamptz; aid uuid; BEGIN
 IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'staff')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT l.auction_id INTO aid FROM public.deals x JOIN public.auction_lots l ON l.id=x.auction_lot_id WHERE x.id=_deal;
 IF aid IS NOT NULL THEN PERFORM 1 FROM public.auctions WHERE id=aid FOR UPDATE; PERFORM 1 FROM public.auction_lots l WHERE l.auction_id=aid FOR UPDATE; END IF;
 SELECT * INTO d FROM public.deals WHERE id=_deal FOR UPDATE; IF d.id IS NULL THEN RAISE EXCEPTION 'Deal not found'; END IF;
 IF _action='note' THEN PERFORM public.staff_control_audit(_actor,'INTERNAL_NOTE','deals',d.id::text,NULL,jsonb_build_object('internal_note',_value),_reason); RETURN; END IF;
 IF d.status IN ('released','completed','refunded','partially_refunded','cancelled') THEN RAISE EXCEPTION 'Closed deal cannot be changed'; END IF;
 IF _action IN ('payment','delivery','inspection') THEN
  deadline:=_value::timestamptz;
  IF deadline IS NULL OR NOT isfinite(deadline) OR deadline<=clock_timestamp() THEN RAISE EXCEPTION 'Deadline must be in the future'; END IF;
  IF _action='payment' THEN
   IF d.status<>'pending_funding' OR EXISTS(SELECT 1 FROM public.deal_transactions WHERE deal_id=d.id AND kind='funding' AND tstatus IN ('pending','processing','succeeded')) THEN RAISE EXCEPTION 'Only unfunded offers can be extended'; END IF;
   IF d.payment_deadline_at IS NOT NULL AND (d.payment_deadline_at<=clock_timestamp() OR deadline<=d.payment_deadline_at) THEN RAISE EXCEPTION 'Cannot revive an ended offer or shorten a deadline'; END IF;
   IF EXISTS(SELECT 1 FROM public.fx_quotes WHERE deal_id=d.id AND used_at IS NOT NULL) THEN RAISE EXCEPTION 'Quote already consumed'; END IF;
   IF d.deal_type::text='auction' AND (NOT EXISTS(SELECT 1 FROM public.auction_lots WHERE id=d.auction_lot_id AND deal_id=d.id AND funded_deal_id IS NULL) OR (SELECT count(*) FROM public.lot_bidders WHERE deal_id=d.id AND status='offered')<>1) THEN RAISE EXCEPTION 'Current auction offer required'; END IF;
   PERFORM set_config('insight.staff_terms','on',true);
   IF d.deal_type::text='auction' THEN UPDATE public.lot_bidders SET deadline_at=deadline WHERE deal_id=d.id AND status='offered'; END IF;
   UPDATE public.deals SET payment_deadline_at=deadline WHERE id=d.id;
  ELSIF _action='delivery' THEN
   IF deadline::date<=coalesce(d.estimated_delivery_at,d.due_at,current_date) THEN RAISE EXCEPTION 'Delivery deadline must be extended'; END IF;
   UPDATE public.deals SET estimated_delivery_at=deadline::date WHERE id=d.id;
  ELSE
   IF d.status NOT IN ('delivered','under_review') OR d.auto_release_at IS NULL OR deadline<=d.auto_release_at THEN RAISE EXCEPTION 'Extend an active inspection deadline only'; END IF;
   PERFORM set_config('insight.staff_inspection','on',true);
   UPDATE public.deals SET auto_release_at=deadline WHERE id=d.id;
  END IF;
 ELSIF _action IN ('freeze','unfreeze') THEN
  IF _action='unfreeze' AND EXISTS(SELECT 1 FROM public.disputes WHERE deal_id=d.id AND status<>'resolved') THEN RAISE EXCEPTION 'Resolve the dispute through four-eyes review first'; END IF;
  UPDATE public.deals SET frozen=(_action='freeze'),frozen_reason=CASE WHEN _action='freeze' THEN _reason ELSE NULL END WHERE id=d.id;
 ELSIF _action='email' THEN
  IF d.deal_type::text='auction' THEN RAISE EXCEPTION 'Auction bidder email cannot change; use ordered offers'; END IF;
  IF (d.buyer_id IS NOT NULL AND d.seller_id IS NOT NULL) OR d.status<>'pending_funding' THEN RAISE EXCEPTION 'Counterparty already joined'; END IF;
  UPDATE public.deals SET counterparty_email=_value,invite_token=encode(gen_random_bytes(24),'hex') WHERE id=d.id;
 ELSE RAISE EXCEPTION 'Unknown action'; END IF;
 SELECT * INTO n FROM public.deals WHERE id=d.id;
 PERFORM public.staff_control_audit(_actor,'DEAL_'||upper(_action),'deals',d.id::text,to_jsonb(d)-'invite_token',to_jsonb(n)-'invite_token',_reason);
 PERFORM set_config('insight.staff_terms','off',true); PERFORM set_config('insight.staff_inspection','off',true);
END $$;
REVOKE ALL ON FUNCTION public.staff_operational_update(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_operational_update(uuid,uuid,text,text,text) TO service_role;
CREATE FUNCTION public.staff_account_state(_actor uuid,_user uuid,_state text,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE oldstate text; BEGIN
 IF _state NOT IN ('active','suspended') THEN RAISE EXCEPTION 'Invalid state'; END IF;
 SELECT account_state INTO oldstate FROM public.profiles WHERE id=_user FOR UPDATE;
 UPDATE public.profiles SET account_state=_state WHERE id=_user;
 PERFORM public.staff_control_audit(_actor,'ACCOUNT_STATE','profiles',_user::text,jsonb_build_object('account_state',oldstate),jsonb_build_object('account_state',_state),_reason);
END $$;
REVOKE ALL ON FUNCTION public.staff_account_state(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_account_state(uuid,uuid,text,text) TO service_role;
CREATE FUNCTION public.guard_suspended_funding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.kind='funding' THEN PERFORM 1 FROM public.profiles p JOIN public.deals d ON d.buyer_id=p.id WHERE d.id=NEW.deal_id FOR UPDATE OF p; END IF;
 IF NEW.kind='funding' AND EXISTS(SELECT 1 FROM public.deals d JOIN public.profiles p ON p.id=d.buyer_id WHERE d.id=NEW.deal_id AND p.account_state<>'active') THEN RAISE EXCEPTION 'Your account cannot fund deals while suspended or restricted'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_suspended_funding BEFORE INSERT ON public.deal_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_suspended_funding();