DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE oid='public.create_auction_release(uuid,uuid,uuid,text,numeric,text)'::regprocedure;
 def:=replace(def,'SELECT sum(pct) FROM public.deal_payout_splits WHERE deal_id=d.id','SELECT sum(ps.pct) FROM public.deal_payout_splits ps WHERE ps.deal_id=d.id');
 def:=replace(def,'SELECT round(gross*pct/100,digits) INTO org FROM public.deal_payout_splits WHERE deal_id=d.id AND role=''organiser''','SELECT round(gross*ps.pct/100,digits) INTO org FROM public.deal_payout_splits ps WHERE ps.deal_id=d.id AND ps.role=''organiser''');
 EXECUTE def;
END $$;