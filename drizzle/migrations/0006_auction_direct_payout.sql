ALTER TABLE public.deal_transactions ADD COLUMN IF NOT EXISTS payout_split_id uuid REFERENCES public.deal_payout_splits(id), ADD COLUMN IF NOT EXISTS auction_dispute_id uuid REFERENCES public.disputes(id);
CREATE UNIQUE INDEX IF NOT EXISTS auction_one_release_per_share ON public.deal_transactions(payout_split_id) WHERE payout_split_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.guard_auction_payout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals; s public.deal_payout_splits; l public.auction_lots; decision public.disputes; gross numeric; expected numeric; digits integer; orgpct numeric;
BEGIN
 SELECT * INTO d FROM public.deals WHERE id=NEW.deal_id;
 IF d.deal_type::text<>'auction' OR NEW.kind NOT IN ('release','refund','payout') THEN RETURN NEW; END IF;
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Direct payouts require server action'; END IF;
 SELECT * INTO l FROM public.auction_lots WHERE id=d.auction_lot_id FOR UPDATE;
 IF l.split_locked_at IS NULL OR d.fee_payer<>'buyer' THEN RAISE EXCEPTION 'Locked split and buyer-paid fee required'; END IF;
 IF TG_OP='UPDATE' AND (NEW.payout_split_id IS DISTINCT FROM OLD.payout_split_id OR NEW.auction_dispute_id IS DISTINCT FROM OLD.auction_dispute_id) THEN RAISE EXCEPTION 'Direct payout identity immutable'; END IF;
 IF NEW.kind='payout' THEN RAISE EXCEPTION 'Auction payouts must use individual release legs'; END IF;
 digits:=CASE WHEN d.currency IN ('BHD','KWD','OMR') THEN 3 ELSE 2 END; gross:=d.amount;
 IF NEW.auction_dispute_id IS NOT NULL THEN
  SELECT * INTO decision FROM public.disputes WHERE id=NEW.auction_dispute_id AND deal_id=d.id AND status='resolved' AND milestone_id IS NULL;
  IF decision.id IS NULL THEN RAISE EXCEPTION 'Resolved auction dispute missing'; END IF;
  gross:=round(d.amount*(100-CASE WHEN decision.outcome='full_refund' THEN 100 WHEN decision.outcome='full_release' THEN 0 ELSE decision.buyer_percent END)/100,digits);
 END IF;
 IF NEW.kind='refund' THEN
  IF NEW.auction_dispute_id IS NULL THEN RETURN NEW; END IF;
  expected:=d.amount-gross;
 ELSE
  SELECT * INTO s FROM public.deal_payout_splits WHERE id=NEW.payout_split_id AND deal_id=d.id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Release requires direct beneficiary split'; END IF;
  SELECT pct INTO orgpct FROM public.deal_payout_splits WHERE deal_id=d.id AND role='organiser';
  expected:=CASE WHEN s.role='organiser' THEN round(gross*orgpct/100,digits) ELSE gross-round(gross*orgpct/100,digits) END;
 END IF;
 IF NEW.amount<>expected OR NEW.currency<>d.currency OR NEW.fee<>0 THEN RAISE EXCEPTION 'Direct payout amount does not match locked share'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_auction_payout BEFORE INSERT OR UPDATE ON public.deal_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_auction_payout();
-- Preserve funding guard and ordinary paths verbatim, removing only the step-1 release wall.
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE oid='public.guard_auction_funding()'::regprocedure;
 def:=replace(def,'IF NEW.kind IN (''release'',''payout'') THEN RAISE EXCEPTION ''Direct provider split settlement not enabled in step 1''; END IF;','');
 EXECUTE def;
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE oid='public.guard_auction_split()'::regprocedure;
 def:=replace(def,'IF NEW.release_tx_id IS NOT NULL THEN RAISE EXCEPTION ''Direct provider split payout not enabled in step 1''; END IF;',
 'IF TG_OP=''UPDATE'' AND OLD.release_tx_id IS NOT NULL AND NEW.release_tx_id IS DISTINCT FROM OLD.release_tx_id THEN RAISE EXCEPTION ''Direct payout link immutable''; END IF;
 IF NEW.release_tx_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.deal_transactions t WHERE t.id=NEW.release_tx_id AND t.payout_split_id=NEW.id AND t.deal_id=NEW.deal_id AND t.kind=''release'') THEN RAISE EXCEPTION ''Invalid direct payout link''; END IF;');
 EXECUTE def;
END $$;
CREATE OR REPLACE FUNCTION public.create_auction_release(_deal_id uuid,_actor_id uuid DEFAULT NULL,_dispute_id uuid DEFAULT NULL,_outcome text DEFAULT NULL,_buyer_percent numeric DEFAULT NULL,_note text DEFAULT NULL)
RETURNS TABLE(id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals; l public.auction_lots; a public.auctions; s record; vtx uuid; gross numeric; refund numeric:=0; org numeric; digits integer; pct numeric; decision public.disputes; existing_dispute uuid;
BEGIN
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Server action required'; END IF;
 SELECT * INTO d FROM public.deals WHERE deals.id=_deal_id FOR UPDATE;
 IF d.deal_type::text<>'auction' OR d.auction_lot_id IS NULL OR d.fee_payer<>'buyer' THEN RAISE EXCEPTION 'Buyer-paid auction required'; END IF;
 SELECT * INTO l FROM public.auction_lots WHERE auction_lots.id=d.auction_lot_id FOR UPDATE;
 SELECT * INTO a FROM public.auctions WHERE auctions.id=l.auction_id;
 IF l.split_locked_at IS NULL OR (SELECT count(*) FROM public.deal_payout_splits WHERE deal_id=d.id)<>2 OR (SELECT sum(pct) FROM public.deal_payout_splits WHERE deal_id=d.id)<>100 THEN RAISE EXCEPTION 'Locked direct payout splits required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.deal_transactions WHERE deal_id=d.id AND kind='funding' AND status='succeeded') THEN RAISE EXCEPTION 'Confirmed funding required'; END IF;
 PERFORM public.auction_require_beneficiary(l.owner_id,d.currency); PERFORM public.auction_require_beneficiary(a.organiser_id,d.currency);
 IF EXISTS(SELECT 1 FROM public.deal_transactions WHERE deal_id=d.id AND kind IN ('release','refund') AND (payout_split_id IS NOT NULL OR auction_dispute_id IS NOT NULL)) THEN
  IF EXISTS(SELECT 1 FROM public.deal_transactions WHERE deal_id=d.id AND kind IN ('release','refund') AND (payout_split_id IS NOT NULL OR auction_dispute_id IS NOT NULL) AND auction_dispute_id IS DISTINCT FROM _dispute_id) THEN RAISE EXCEPTION 'Different payout decision already recorded'; END IF;
  RETURN QUERY SELECT t.id FROM public.deal_transactions t WHERE t.deal_id=d.id AND (t.payout_split_id IS NOT NULL OR t.auction_dispute_id IS NOT NULL); RETURN;
 END IF;
 digits:=CASE WHEN d.currency IN ('BHD','KWD','OMR') THEN 3 ELSE 2 END; gross:=d.amount;
 IF _dispute_id IS NOT NULL THEN
  SELECT * INTO decision FROM public.disputes WHERE disputes.id=_dispute_id AND deal_id=d.id AND milestone_id IS NULL FOR UPDATE;
  IF decision.id IS NULL OR decision.status='resolved' OR d.status<>'disputed' THEN RAISE EXCEPTION 'Dispute already closed or invalid'; END IF;
  IF _outcome NOT IN ('full_release','full_refund','partial_settlement') OR _outcome IS NULL OR _note IS NULL OR length(trim(_note))<5 THEN RAISE EXCEPTION 'Valid decision and reason required'; END IF;
  pct:=CASE WHEN _outcome='full_release' THEN 0 WHEN _outcome='full_refund' THEN 100 ELSE _buyer_percent END;
  IF pct IS NULL OR pct<0 OR pct>100 THEN RAISE EXCEPTION 'Invalid refund percent'; END IF;
  gross:=round(d.amount*(100-pct)/100,digits); refund:=d.amount-gross;
  UPDATE public.disputes SET status='resolved',outcome=_outcome,buyer_percent=pct,resolution_note=_note,resolved_by=_actor_id,resolved_at=now(),review_started_at=coalesce(review_started_at,now()) WHERE disputes.id=_dispute_id;
 ELSE
  IF d.status NOT IN ('held','delivered','under_review') OR d.frozen OR EXISTS(SELECT 1 FROM public.disputes WHERE deal_id=d.id AND status<>'resolved') THEN RAISE EXCEPTION 'Auction not eligible for release'; END IF;
 END IF;
 SELECT round(gross*pct/100,digits) INTO org FROM public.deal_payout_splits WHERE deal_id=d.id AND role='organiser';
 IF refund>0 THEN
  INSERT INTO public.deal_transactions(deal_id,kind,amount,fee,currency,status,provider,created_by,note,idempotency_key,auction_dispute_id)
   VALUES(d.id,'refund',refund,0,d.currency,'processing','manual',_actor_id,_note,d.ref||'-REFUND-'||left(_dispute_id::text,8),_dispute_id) RETURNING deal_transactions.id INTO vtx;
  id:=vtx; RETURN NEXT;
 END IF;
 FOR s IN SELECT * FROM public.deal_payout_splits WHERE deal_id=d.id ORDER BY role LOOP
  IF gross=0 THEN CONTINUE; END IF;
  INSERT INTO public.deal_transactions(deal_id,kind,amount,fee,currency,status,provider,created_by,note,idempotency_key,payout_split_id,auction_dispute_id)
   VALUES(d.id,'release',CASE WHEN s.role='organiser' THEN org ELSE gross-org END,0,d.currency,'processing','manual',_actor_id,_note,d.ref||CASE WHEN s.role='owner' THEN '-RELEASE-OWNER' ELSE '-RELEASE-ORG' END,s.id,_dispute_id)
   RETURNING deal_transactions.id INTO vtx;
  UPDATE public.deal_payout_splits SET release_tx_id=vtx WHERE deal_payout_splits.id=s.id;
  id:=vtx; RETURN NEXT;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.create_auction_release(uuid,uuid,uuid,text,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_auction_release(uuid,uuid,uuid,text,numeric,text) TO service_role;
-- Keep the non-auction auto-release body byte-for-byte; branch only for auction deals.
DO $$ DECLARE def text; needle text; BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE oid='public.run_auto_release()'::regprocedure;
 needle:='INSERT INTO deal_transactions(deal_id, kind, amount, currency, status, provider, note, idempotency_key)
    VALUES (r.id, ''release'', r.amount, r.currency, ''processing'', ''manual'', ''Automatic release after the inspection period'', r.ref || ''-RELEASE-AUTO'');';
 IF position(needle IN def)=0 THEN RAISE EXCEPTION 'Unexpected auto-release function; refusing to alter ordinary path'; END IF;
 def:=replace(def,needle,'IF r.deal_type::text=''auction'' THEN
      PERFORM public.create_auction_release(r.id);
    ELSE
    '||needle||'
    END IF;');
 EXECUTE def;
END $$;