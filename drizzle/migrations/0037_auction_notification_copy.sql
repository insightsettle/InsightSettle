-- Auction notifications: plain, translatable wording instead of raw invite links and timestamps.
-- The dashboard and the bell translate these titles and bodies through the locale dictionary.

CREATE OR REPLACE FUNCTION public.auction_offer_bidder(_bidder uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE b public.lot_bidders; l public.auction_lots; a public.auctions; d public.deals; org numeric; digits integer; BEGIN
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
 INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(a.organiser_id,d.id,'auction','Auction offer sent',CASE WHEN b.rank=1 THEN 'Offer sent to the winning bidder. They have 24 hours to pay.' ELSE 'Offer moved to the next backup bidder. They have 24 hours to pay.' END);
 IF b.user_id IS NOT NULL THEN INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(b.user_id,d.id,'auction','Your auction offer is ready','Pay within 24 hours to secure the lot. If you do not pay, the offer moves to the next bidder.'); END IF;
 RETURN jsonb_build_object('dealId',d.id,'ref',d.ref,'token',d.invite_token,'email',b.email,'deadline',b.deadline_at,'rank',b.rank,'title',l.title,'event','offered');
END; $function$;

CREATE OR REPLACE FUNCTION public.advance_auction_bidder(_lot uuid, _decliner uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE l public.auction_lots; a public.auctions; b public.lot_bidders; nxt public.lot_bidders; d public.deals; ended jsonb; BEGIN
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
 INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(a.organiser_id,d.id,'auction','Auction offer ended',CASE WHEN _decliner IS NULL THEN 'The payment time ran out. No payment was charged.' ELSE 'The bidder declined. No payment was charged.' END);
 IF b.user_id IS NOT NULL THEN INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(b.user_id,d.id,'auction','Your auction offer ended','No payment charged.'); END IF;
 ended:=jsonb_build_object('event','ended','email',b.email,'dealId',d.id,'ref',d.ref,'title',l.title);
 SELECT * INTO nxt FROM public.lot_bidders WHERE lot_id=l.id AND rank=b.rank+1 AND status='waiting';
 IF nxt.id IS NULL THEN
 UPDATE public.auction_lots SET status='unsold',deal_id=NULL WHERE id=l.id;
 INSERT INTO public.notifications(user_id,deal_id,kind,title,body) VALUES(a.organiser_id,d.id,'auction','Auction lot unsold',l.title);
 RETURN jsonb_build_array(ended);
 END IF;
 RETURN jsonb_build_array(ended,public.auction_offer_bidder(nxt.id));
END; $function$;
