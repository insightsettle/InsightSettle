CREATE OR REPLACE FUNCTION public.decline_auction_deal(_deal uuid,_buyer uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE lid uuid; aid uuid; current_deal uuid; BEGIN
 SELECT auction_lot_id INTO lid FROM public.deals WHERE id=_deal AND deal_type='auction'; SELECT auction_id INTO aid FROM public.auction_lots WHERE id=lid;
 PERFORM 1 FROM public.auctions WHERE id=aid FOR UPDATE; SELECT deal_id INTO current_deal FROM public.auction_lots WHERE id=lid FOR UPDATE;
 IF _buyer IS NULL OR current_deal IS DISTINCT FROM _deal THEN RAISE EXCEPTION 'Auction offer is no longer current'; END IF;
 RETURN public.advance_auction_bidder(lid,_buyer);
END; $$;
REVOKE ALL ON FUNCTION public.decline_auction_deal(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.decline_auction_deal(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_auction_term_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.deals WHERE id=OLD.deal_id AND deal_type='auction') AND (NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.version IS DISTINCT FROM OLD.version OR NEW.deal_id IS DISTINCT FROM OLD.deal_id OR NEW.created_by IS DISTINCT FROM OLD.created_by) THEN RAISE EXCEPTION 'Auction term snapshot immutable'; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER guard_auction_term_snapshot BEFORE UPDATE ON public.deal_term_versions FOR EACH ROW EXECUTE FUNCTION public.guard_auction_term_snapshot();
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.guard_bidder_deal_link()'::regprocedure) INTO def;
 def:=replace(def,'BEGIN','BEGIN IF auth.uid() IS NOT NULL AND ((TG_OP=''INSERT'' AND NEW.deal_id IS NOT NULL) OR (TG_OP=''UPDATE'' AND NEW.deal_id IS DISTINCT FROM OLD.deal_id)) THEN RAISE EXCEPTION ''Bidder deal links require server action''; END IF;'); EXECUTE def;
 SELECT pg_get_functiondef('public.claim_auction_invite(text,uuid)'::regprocedure) INTO def;
 def:=replace(def,'IF d.status<>''pending_funding''','IF _user IS NULL OR email_address IS NULL OR NOT EXISTS(SELECT 1 FROM public.lot_bidders WHERE deal_id=d.id AND email=d.counterparty_email AND status=''offered'') OR d.status<>''pending_funding'''); EXECUTE def;
END $$;