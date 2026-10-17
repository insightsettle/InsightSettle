ALTER TABLE public.lot_bidders ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id);
ALTER TABLE public.auction_lots DROP CONSTRAINT IF EXISTS auction_lots_status_check;
ALTER TABLE public.auction_lots ADD CONSTRAINT auction_lots_status_check CHECK(status IN ('draft','open','offered','funded','cancelled','closed','unsold'));
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.guard_auction_deal()'::regprocedure) INTO def;
 def:=replace(def,'SELECT * INTO b FROM public.lot_bidders WHERE lot_id=l.id AND user_id=NEW.buyer_id AND status IN (''offered'',''paid'');','IF TG_OP=''UPDATE'' AND OLD.status=''cancelled'' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF; SELECT * INTO b FROM public.lot_bidders WHERE lot_id=l.id AND (deal_id=NEW.id OR (deal_id IS NULL AND (user_id=NEW.buyer_id OR (user_id IS NULL AND NEW.buyer_id IS NULL AND email=NEW.counterparty_email)))) AND status IN (''offered'',''paid'');');
 EXECUTE def;
 SELECT pg_get_functiondef('public.guard_auction_lot()'::regprocedure) INTO def;
 def:=replace(def,'OLD.status IN (''cancelled'',''closed'')','OLD.status IN (''cancelled'',''closed'',''unsold'')'); EXECUTE def;
END $$;
CREATE OR REPLACE FUNCTION public.auction_transaction_lock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE lid uuid; aid uuid; BEGIN
 SELECT d.auction_lot_id,l.auction_id INTO lid,aid FROM public.deals d JOIN public.auction_lots l ON l.id=d.auction_lot_id WHERE d.id=NEW.deal_id;
 IF lid IS NOT NULL THEN PERFORM 1 FROM public.auctions WHERE id=aid FOR UPDATE; PERFORM 1 FROM public.auction_lots WHERE id=lid FOR UPDATE; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER auction_transaction_lock BEFORE INSERT OR UPDATE ON public.deal_transactions FOR EACH ROW EXECUTE FUNCTION public.auction_transaction_lock();
CREATE OR REPLACE FUNCTION public.auction_offer_bidder(_bidder uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE b public.lot_bidders; l public.auction_lots; a public.auctions; d public.deals; org numeric; digits integer; BEGIN
 SELECT * INTO b FROM public.lot_bidders WHERE id=_bidder;
 SELECT * INTO l FROM public.auction_lots WHERE id=b.lot_id;
 SELECT * INTO a FROM public.auctions WHERE id=l.auction_id;
 UPDATE public.lot_bidders SET status='offered' WHERE id=b.id RETURNING * INTO b;
 digits:=CASE WHEN a.currency IN ('BHD','KWD','OMR') THEN 3 ELSE 2 END;
 IF b.price<>round(b.price,digits) THEN RAISE EXCEPTION 'Bid price must use currency minor units'; END IF;
 INSERT INTO public.deals(title,description,deal_type,amount,currency,buyer_id,seller_id,created_by,counterparty_email,fee_payer,inspection_days,shipping_responsibility,shipping_status,auction_lot_id,payment_deadline_at,terms_status)
 VALUES(l.title,l.description,'auction',b.price,a.currency,b.user_id,l.owner_id,a.organiser_id,b.email,'buyer',3,'seller','preparing',l.id,b.deadline_at,'pending') RETURNING * INTO d;
 UPDATE public.lot_bidders SET deal_id=d.id WHERE id=b.id;
 UPDATE public.auction_lots SET deal_id=d.id,status='offered' WHERE id=l.id;
 org:=round(b.price*l.organiser_pct/100,digits);
 INSERT INTO public.deal_payout_splits(deal_id,beneficiary_id,role,pct,amount,currency) VALUES(d.id,l.owner_id,'owner',l.owner_pct,b.price-org,a.currency),(d.id,a.organiser_id,'organiser',l.organiser_pct,org,a.currency);
 INSERT INTO public.deal_term_versions(deal_id,version,snapshot,created_by,note) VALUES(d.id,1,jsonb_build_object('amount',b.price,'currency',a.currency,'fee_payer','buyer','inspection_hours',a.inspection_hours,'shipping_by','organiser','owner_pct',l.owner_pct,'organiser_pct',l.organiser_pct,'lot_title',l.title,'lot_description',l.description),a.organiser_id,'Auction: payment accepts the locked lot terms');
 INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(a.organiser_id,d.id,'auction','Auction bidder offered',format('Rank %s: %s %s; deadline %s',b.rank,a.currency,b.price,b.deadline_at));
 IF b.user_id IS NOT NULL THEN INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(b.user_id,d.id,'auction','Your auction payment link',format('/invite/%s — payment accepts the lot terms; deadline %s',d.invite_token,b.deadline_at)); END IF;
 RETURN jsonb_build_object('dealId',d.id,'ref',d.ref,'token',d.invite_token,'email',b.email,'deadline',b.deadline_at,'rank',b.rank,'title',l.title,'event','offered');
END; $$;
CREATE OR REPLACE FUNCTION public.record_auction_winner(_lot uuid,_actor uuid,_bidders jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l public.auction_lots; a public.auctions; item jsonb; n integer:=0; uid uuid; first_id uuid; BEGIN
 SELECT auction_id INTO a.id FROM public.auction_lots WHERE id=_lot;
 SELECT * INTO a FROM public.auctions WHERE id=a.id FOR UPDATE;
 IF a.organiser_id IS DISTINCT FROM _actor THEN RAISE EXCEPTION 'Only the organiser can record the winner'; END IF;
 SELECT * INTO l FROM public.auction_lots WHERE id=_lot FOR UPDATE;
 IF l.status<>'open' OR a.status<>'open' THEN RAISE EXCEPTION 'Lot must be open'; END IF;
 IF EXISTS(SELECT 1 FROM public.lot_bidders WHERE lot_id=l.id) THEN RAISE EXCEPTION 'Winner already recorded'; END IF;
 IF jsonb_typeof(_bidders)<>'array' OR jsonb_array_length(_bidders) NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'One winner and at most two backups required'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_bidders) LOOP
 n:=n+1; IF (item->>'rank')::integer<>n THEN RAISE EXCEPTION 'Cannot skip bidder rank'; END IF;
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(item->>'email');
 INSERT INTO public.lot_bidders(lot_id,rank,platform_handle,email,user_id,price,status) VALUES(l.id,n,item->>'handle',lower(item->>'email'),uid,(item->>'price')::numeric,'waiting') RETURNING id INTO uid;
 IF n=1 THEN first_id:=uid; END IF;
 END LOOP;
 RETURN public.auction_offer_bidder(first_id);
END; $$;
CREATE OR REPLACE FUNCTION public.advance_auction_bidder(_lot uuid,_decliner uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l public.auction_lots; a public.auctions; b public.lot_bidders; nxt public.lot_bidders; d public.deals; ended jsonb; BEGIN
 SELECT auction_id INTO a.id FROM public.auction_lots WHERE id=_lot;
 SELECT * INTO a FROM public.auctions WHERE id=a.id FOR UPDATE;
 SELECT * INTO l FROM public.auction_lots WHERE id=_lot FOR UPDATE;
 IF l.status<>'offered' OR l.funded_deal_id IS NOT NULL THEN RETURN NULL; END IF;
 SELECT * INTO b FROM public.lot_bidders WHERE lot_id=l.id AND status='offered';
 SELECT * INTO d FROM public.deals WHERE id=l.deal_id FOR UPDATE;
 IF d.status<>'pending_funding' OR EXISTS(SELECT 1 FROM public.deal_transactions t JOIN public.deals other ON other.id=t.deal_id WHERE other.auction_lot_id=l.id AND t.kind='funding' AND t.status IN ('pending','processing','succeeded')) THEN RETURN NULL; END IF;
 IF _decliner IS NOT NULL THEN IF d.buyer_id IS DISTINCT FROM _decliner THEN RAISE EXCEPTION 'Only the offered buyer can decline'; END IF;
 ELSIF clock_timestamp()<b.deadline_at THEN RETURN NULL; END IF;
 UPDATE public.deals SET status='cancelled',cancelled_at=clock_timestamp() WHERE id=d.id;
 UPDATE public.lot_bidders SET status=CASE WHEN _decliner IS NULL THEN 'expired' ELSE 'declined' END WHERE id=b.id;
 INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(a.organiser_id,d.id,'auction','Auction offer ended',format('Rank %s: %s. No payment charged.',b.rank,CASE WHEN _decliner IS NULL THEN 'expired' ELSE 'declined' END));
 IF b.user_id IS NOT NULL THEN INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(b.user_id,d.id,'auction','Your auction offer ended','No payment charged.'); END IF;
 ended:=jsonb_build_object('event','ended','email',b.email,'dealId',d.id,'ref',d.ref,'title',l.title);
 SELECT * INTO nxt FROM public.lot_bidders WHERE lot_id=l.id AND rank=b.rank+1 AND status='waiting';
 IF nxt.id IS NULL THEN
 UPDATE public.auction_lots SET status='unsold',deal_id=NULL WHERE id=l.id;
 INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(a.organiser_id,d.id,'auction','Auction lot unsold',l.title);
 RETURN jsonb_build_array(ended);
 END IF;
 RETURN jsonb_build_array(ended,public.auction_offer_bidder(nxt.id));
END; $$;
CREATE OR REPLACE FUNCTION public.sweep_auction_deadlines() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r record; events jsonb:='[]'; moved jsonb; BEGIN
 FOR r IN SELECT l.id FROM public.auction_lots l JOIN public.deals d ON d.id=l.deal_id WHERE l.status='offered' AND d.status='pending_funding' AND d.payment_deadline_at<clock_timestamp() ORDER BY d.payment_deadline_at LIMIT 100 LOOP
 moved:=public.advance_auction_bidder(r.id); IF moved IS NOT NULL THEN events:=events||moved; END IF;
 END LOOP; RETURN events;
END; $$;
CREATE OR REPLACE FUNCTION public.claim_auction_invite(_token text,_user uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.deals; l public.auction_lots; aid uuid; email_address text; BEGIN
 SELECT * INTO d FROM public.deals WHERE invite_token=_token AND deal_type='auction'; IF d.id IS NULL THEN RAISE EXCEPTION 'Auction invitation not found'; END IF;
 SELECT auction_id INTO aid FROM public.auction_lots WHERE id=d.auction_lot_id;
 PERFORM 1 FROM public.auctions WHERE id=aid FOR UPDATE; SELECT * INTO l FROM public.auction_lots WHERE id=d.auction_lot_id FOR UPDATE;
 SELECT * INTO d FROM public.deals WHERE id=d.id FOR UPDATE;
 SELECT email INTO email_address FROM auth.users WHERE id=_user AND email_confirmed_at IS NOT NULL;
 IF d.status<>'pending_funding' OR l.deal_id<>d.id OR clock_timestamp()>=d.payment_deadline_at OR lower(email_address) IS DISTINCT FROM lower(d.counterparty_email) OR (d.buyer_id IS NOT NULL AND d.buyer_id<>_user) THEN RAISE EXCEPTION 'Invitation is not for this verified account or offer has ended'; END IF;
 UPDATE public.lot_bidders SET user_id=_user WHERE deal_id=d.id;
 UPDATE public.deals SET buyer_id=_user WHERE id=d.id;
 RETURN d.ref;
END; $$;
CREATE OR REPLACE FUNCTION public.reserve_auction_funding(_deal uuid,_buyer uuid,_quote uuid,_provider text,_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.deals; l public.auction_lots; aid uuid; q public.fx_quotes; tx uuid; BEGIN
 SELECT auction_lot_id INTO l.id FROM public.deals WHERE id=_deal AND deal_type='auction';
 SELECT auction_id INTO aid FROM public.auction_lots WHERE id=l.id;
 PERFORM 1 FROM public.auctions WHERE id=aid FOR UPDATE; SELECT * INTO l FROM public.auction_lots WHERE id=l.id FOR UPDATE;
 SELECT * INTO d FROM public.deals WHERE id=_deal FOR UPDATE;
 IF d.buyer_id IS DISTINCT FROM _buyer OR d.status<>'pending_funding' OR l.deal_id IS DISTINCT FROM d.id OR l.funded_deal_id IS NOT NULL OR clock_timestamp()>=d.payment_deadline_at THEN RAISE EXCEPTION 'Auction offer ended or already funded'; END IF;
 IF EXISTS(SELECT 1 FROM public.deal_transactions WHERE deal_id=d.id AND kind='funding' AND status IN ('pending','processing','succeeded')) THEN RAISE EXCEPTION 'Auction funding already reserved'; END IF;
 SELECT * INTO q FROM public.fx_quotes WHERE id=_quote AND deal_id=d.id FOR UPDATE;
 IF q.id IS NULL OR q.used_at IS NOT NULL OR q.expires_at<=clock_timestamp() OR (q.breakdown->>'terms_version')::integer IS DISTINCT FROM d.terms_version OR q.breakdown->'breakdown'->>'feePayer'<>'buyer' THEN RAISE EXCEPTION 'Valid buyer-paid quote required'; END IF;
 UPDATE public.fx_quotes SET used_at=clock_timestamp() WHERE id=q.id;
 UPDATE public.deal_term_versions SET accepted_by=_buyer,accepted_at=clock_timestamp() WHERE deal_id=d.id AND version=d.terms_version;
 UPDATE public.deals SET terms_status='agreed' WHERE id=d.id;
 INSERT INTO public.deal_transactions(deal_id,kind,amount,fee,currency,status,provider,note,created_by,idempotency_key,fx_quote_id) VALUES(d.id,'funding',q.total,q.fee,q.target_currency,'processing',_provider,_note,_buyer,d.ref||'-AUCTION-PAYMENT-'||q.id,q.id) RETURNING id INTO tx;
 INSERT INTO public.deal_events(deal_id,actor_id,title) VALUES(d.id,_buyer,'Auction lot terms accepted by payment');
 RETURN tx;
END; $$;
REVOKE ALL ON FUNCTION public.auction_offer_bidder(uuid),public.record_auction_winner(uuid,uuid,jsonb),public.advance_auction_bidder(uuid,uuid),public.sweep_auction_deadlines(),public.claim_auction_invite(text,uuid),public.reserve_auction_funding(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auction_offer_bidder(uuid),public.record_auction_winner(uuid,uuid,jsonb),public.advance_auction_bidder(uuid,uuid),public.sweep_auction_deadlines(),public.claim_auction_invite(text,uuid),public.reserve_auction_funding(uuid,uuid,uuid,text,text) TO service_role;