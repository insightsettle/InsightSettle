CREATE OR REPLACE FUNCTION public.confirm_auction_bidder() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE lid uuid; BEGIN
 IF NEW.kind='funding' AND NEW.status='succeeded' THEN
 SELECT auction_lot_id INTO lid FROM public.deals WHERE id=NEW.deal_id;
 IF lid IS NOT NULL THEN UPDATE public.auction_lots SET status='funded' WHERE id=lid; UPDATE public.lot_bidders SET status='paid' WHERE deal_id=NEW.deal_id AND status='offered'; END IF;
 END IF; RETURN NEW;
END; $$;
CREATE TRIGGER z_confirm_auction_bidder AFTER INSERT OR UPDATE ON public.deal_transactions FOR EACH ROW EXECUTE FUNCTION public.confirm_auction_bidder();
CREATE OR REPLACE FUNCTION public.guard_bidder_deal_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND OLD.deal_id IS NOT NULL AND NEW.deal_id IS DISTINCT FROM OLD.deal_id THEN RAISE EXCEPTION 'Bidder deal link immutable'; END IF;
 IF NEW.deal_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.deals WHERE id=NEW.deal_id AND auction_lot_id=NEW.lot_id AND amount=NEW.price) THEN RAISE EXCEPTION 'Bidder deal must match lot and price'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER guard_bidder_deal_link BEFORE INSERT OR UPDATE ON public.lot_bidders FOR EACH ROW EXECUTE FUNCTION public.guard_bidder_deal_link();
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.reserve_auction_funding(uuid,uuid,uuid,text,text)'::regprocedure) INTO def;
 def:=replace(def,'q.breakdown->''breakdown''->>''feePayer''<>''buyer''','(q.breakdown->''breakdown''->>''feePayer'') IS DISTINCT FROM ''buyer''');
 EXECUTE def;
END $$;