-- 0005: data and durable rules only; no provider split settlement yet.
ALTER TYPE public.deal_type ADD VALUE IF NOT EXISTS 'auction';
CREATE TABLE IF NOT EXISTS public.auctions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organiser_id uuid NOT NULL, title text NOT NULL, platform text NOT NULL, stream_url text,
 currency text NOT NULL CHECK(currency IN ('SAR','AED','BHD','KWD','QAR','OMR','USD')),
 payment_deadline_hours integer NOT NULL DEFAULT 24 CHECK(payment_deadline_hours=24), inspection_hours integer NOT NULL DEFAULT 72 CHECK(inspection_hours=72),
 organiser_commission_pct numeric NOT NULL DEFAULT 0 CHECK(organiser_commission_pct BETWEEN 0 AND 100), status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','closed','cancelled')), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.auction_lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auction_id uuid NOT NULL REFERENCES public.auctions(id), title text NOT NULL, description text NOT NULL DEFAULT '', images text[] NOT NULL DEFAULT '{}', owner_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','offered','funded','cancelled','closed')), deal_id uuid REFERENCES public.deals(id), split_locked_at timestamptz,
 owner_pct numeric, organiser_pct numeric, funded_deal_id uuid REFERENCES public.deals(id), funding_tx_id uuid REFERENCES public.deal_transactions(id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.auction_lots TO authenticated;
GRANT ALL ON public.auction_lots TO service_role;
ALTER TABLE public.auction_lots ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.lot_bidders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lot_id uuid NOT NULL REFERENCES public.auction_lots(id), rank integer NOT NULL CHECK(rank BETWEEN 1 AND 3), platform_handle text NOT NULL, email text NOT NULL, user_id uuid, price numeric(18,3) NOT NULL CHECK(price>0),
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('offered','paid','expired','declined','waiting')), offered_at timestamptz, deadline_at timestamptz, UNIQUE(lot_id,rank));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.lot_bidders TO authenticated;
GRANT ALL ON public.lot_bidders TO service_role;
ALTER TABLE public.lot_bidders ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS lot_one_active_bidder ON public.lot_bidders(lot_id) WHERE status IN ('offered','paid');
CREATE TABLE IF NOT EXISTS public.deal_payout_splits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deal_id uuid NOT NULL REFERENCES public.deals(id), beneficiary_id uuid NOT NULL, role text NOT NULL CHECK(role IN ('owner','organiser')), pct numeric NOT NULL CHECK(pct BETWEEN 0 AND 100), amount numeric(18,3) NOT NULL CHECK(amount>=0), currency text NOT NULL, release_tx_id uuid REFERENCES public.deal_transactions(id), UNIQUE(deal_id,role), UNIQUE(release_tx_id));
GRANT SELECT ON public.deal_payout_splits TO authenticated;
GRANT ALL ON public.deal_payout_splits TO service_role;
ALTER TABLE public.deal_payout_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS payment_deadline_at timestamptz, ADD COLUMN IF NOT EXISTS auction_lot_id uuid REFERENCES public.auction_lots(id);
CREATE OR REPLACE FUNCTION public.auction_is_organiser(aid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.auctions WHERE id=aid AND organiser_id=auth.uid()); $$;
CREATE OR REPLACE FUNCTION public.auction_can_read_lot(lid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.auction_lots l JOIN public.auctions a ON a.id=l.auction_id WHERE l.id=lid AND (l.owner_id=auth.uid() OR a.organiser_id=auth.uid() OR EXISTS(SELECT 1 FROM public.deals d WHERE d.id=l.deal_id AND d.buyer_id=auth.uid()))); $$;
REVOKE ALL ON FUNCTION public.auction_is_organiser(uuid),public.auction_can_read_lot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auction_is_organiser(uuid),public.auction_can_read_lot(uuid) TO authenticated,service_role;
CREATE POLICY auctions_organiser ON public.auctions FOR ALL TO authenticated USING(organiser_id=auth.uid()) WITH CHECK(organiser_id=auth.uid());
CREATE POLICY auctions_staff_read ON public.auctions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY lots_organiser ON public.auction_lots FOR ALL TO authenticated USING(public.auction_is_organiser(auction_id)) WITH CHECK(public.auction_is_organiser(auction_id));
CREATE POLICY lots_party_read ON public.auction_lots FOR SELECT TO authenticated USING(public.auction_can_read_lot(id));
CREATE POLICY lots_staff_read ON public.auction_lots FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY bidders_organiser ON public.lot_bidders FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.auction_lots l WHERE l.id=lot_id AND public.auction_is_organiser(l.auction_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.auction_lots l WHERE l.id=lot_id AND public.auction_is_organiser(l.auction_id)));
CREATE POLICY bidders_staff_read ON public.lot_bidders FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY splits_party_read ON public.deal_payout_splits FOR SELECT TO authenticated USING(beneficiary_id=auth.uid() OR EXISTS(SELECT 1 FROM public.deals d WHERE d.id=deal_id AND d.buyer_id=auth.uid()));
CREATE POLICY splits_staff_read ON public.deal_payout_splits FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE OR REPLACE FUNCTION public.auction_require_beneficiary(uid uuid,cur text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid AND verification_status='verified') THEN RAISE EXCEPTION 'Auction beneficiary KYC must be verified'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.payout_accounts WHERE user_id=uid AND verified AND currency=cur) THEN RAISE EXCEPTION 'Auction beneficiary requires verified payout account in auction currency'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.auction_require_beneficiary(uuid,text) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.guard_auction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.organiser_id IS DISTINCT FROM OLD.organiser_id THEN RAISE EXCEPTION 'Auction organiser is immutable'; END IF;
 IF (NEW.organiser_commission_pct IS DISTINCT FROM OLD.organiser_commission_pct OR NEW.currency IS DISTINCT FROM OLD.currency) AND EXISTS(SELECT 1 FROM public.auction_lots WHERE auction_id=OLD.id AND split_locked_at IS NOT NULL) THEN RAISE EXCEPTION 'Auction split locked after first bidder'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER guard_auction BEFORE UPDATE ON public.auctions FOR EACH ROW EXECUTE FUNCTION public.guard_auction();
CREATE OR REPLACE FUNCTION public.guard_auction_lot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.auctions; BEGIN
 IF TG_OP='DELETE' THEN IF OLD.split_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Cannot delete recorded lot; cancel only'; END IF; RETURN OLD; END IF;
 SELECT * INTO a FROM public.auctions WHERE id=NEW.auction_id FOR UPDATE;
 IF TG_OP='UPDATE' THEN
  IF NEW.auction_id IS DISTINCT FROM OLD.auction_id THEN RAISE EXCEPTION 'Lot auction is immutable'; END IF;
  IF OLD.split_locked_at IS NOT NULL AND (NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.owner_pct IS DISTINCT FROM OLD.owner_pct OR NEW.organiser_pct IS DISTINCT FROM OLD.organiser_pct OR NEW.split_locked_at IS DISTINCT FROM OLD.split_locked_at) THEN RAISE EXCEPTION 'Auction split locked after first bidder'; END IF;
  IF OLD.funded_deal_id IS NOT NULL AND (NEW.funded_deal_id IS DISTINCT FROM OLD.funded_deal_id OR NEW.deal_id IS DISTINCT FROM OLD.deal_id) THEN RAISE EXCEPTION 'Lot already funded'; END IF;
  IF OLD.status IN ('cancelled','closed') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Lot is terminal'; END IF;
 END IF;
 IF NEW.status IN ('open','offered') THEN IF a.status<>'open' THEN RAISE EXCEPTION 'Auction must be open'; END IF; PERFORM public.auction_require_beneficiary(NEW.owner_id,a.currency); PERFORM public.auction_require_beneficiary(a.organiser_id,a.currency); END IF;
 IF (NEW.owner_pct IS NOT NULL OR NEW.organiser_pct IS NOT NULL) AND (NEW.owner_pct IS NULL OR NEW.organiser_pct IS NULL OR NEW.owner_pct<0 OR NEW.organiser_pct<0 OR NEW.owner_pct+NEW.organiser_pct<>100) THEN RAISE EXCEPTION 'Auction split must sum to 100'; END IF;
 IF pg_trigger_depth()=1 AND auth.uid() IS NOT NULL THEN
  IF TG_OP='INSERT' THEN
   IF NEW.deal_id IS NOT NULL OR NEW.funded_deal_id IS NOT NULL OR NEW.funding_tx_id IS NOT NULL OR NEW.split_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Financial lot links require server action'; END IF;
  ELSE
   IF NEW.deal_id IS DISTINCT FROM OLD.deal_id OR NEW.funded_deal_id IS DISTINCT FROM OLD.funded_deal_id OR NEW.funding_tx_id IS DISTINCT FROM OLD.funding_tx_id OR NEW.split_locked_at IS DISTINCT FROM OLD.split_locked_at THEN RAISE EXCEPTION 'Financial lot links require server action'; END IF;
  END IF;
 END IF;
 IF NEW.status='funded' AND NEW.funded_deal_id IS NULL THEN RAISE EXCEPTION 'Lot requires confirmed funding'; END IF;
 IF NEW.status IN ('cancelled','closed') AND EXISTS(SELECT 1 FROM public.deal_transactions t JOIN public.deals d ON d.id=t.deal_id WHERE d.auction_lot_id=NEW.id AND t.kind='funding' AND t.status IN ('pending','processing','succeeded')) THEN RAISE EXCEPTION 'Funding lot cannot be cancelled'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER guard_auction_lot BEFORE INSERT OR UPDATE OR DELETE ON public.auction_lots FOR EACH ROW EXECUTE FUNCTION public.guard_auction_lot();
CREATE OR REPLACE FUNCTION public.guard_lot_bidder() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l public.auction_lots; a public.auctions; prev public.lot_bidders; aid uuid; BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Cannot delete recorded bidder; cancel lot'; END IF;
 SELECT auction_id INTO aid FROM public.auction_lots WHERE id=NEW.lot_id;
 SELECT * INTO a FROM public.auctions WHERE id=aid FOR UPDATE;
 SELECT * INTO l FROM public.auction_lots WHERE id=NEW.lot_id FOR UPDATE;
 IF l.status NOT IN ('open','offered','funded') THEN RAISE EXCEPTION 'Lot is not open'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status NOT IN ('waiting','offered') THEN RAISE EXCEPTION 'New bidder must be waiting or offered'; END IF;
  IF NEW.rank>1 AND NOT EXISTS(SELECT 1 FROM public.lot_bidders WHERE lot_id=NEW.lot_id AND rank=NEW.rank-1) THEN RAISE EXCEPTION 'Cannot skip bidder rank'; END IF;
 ELSE
  IF NEW.lot_id IS DISTINCT FROM OLD.lot_id OR NEW.rank IS DISTINCT FROM OLD.rank OR NEW.price IS DISTINCT FROM OLD.price OR NEW.email IS DISTINCT FROM OLD.email OR NEW.platform_handle IS DISTINCT FROM OLD.platform_handle OR (OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id) THEN RAISE EXCEPTION 'Recorded bidder and price immutable'; END IF;
  IF OLD.status IN ('paid','expired','declined') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Bidder is terminal'; END IF;
  IF OLD.offered_at IS NOT NULL AND (NEW.offered_at IS DISTINCT FROM OLD.offered_at OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at) THEN RAISE EXCEPTION 'Bidder deadline immutable'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT ((OLD.status='waiting' AND NEW.status='offered') OR (OLD.status='offered' AND NEW.status IN ('expired','declined','paid'))) THEN RAISE EXCEPTION 'Invalid bidder transition'; END IF;
  IF NEW.status='expired' AND OLD.status<>'expired' AND clock_timestamp()<OLD.deadline_at THEN RAISE EXCEPTION 'Payment deadline has not expired'; END IF;
  IF NEW.status='declined' AND OLD.status<>'declined' AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Organiser cannot decline for bidder; cancel lot only'; END IF;
 END IF;
 IF NEW.status='paid' THEN
  IF auth.uid() IS NOT NULL OR l.funded_deal_id IS NULL THEN RAISE EXCEPTION 'Paid bidder requires provider confirmation'; END IF;
 ELSIF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
  IF EXISTS(SELECT 1 FROM public.deal_transactions t JOIN public.deals d ON d.id=t.deal_id WHERE d.auction_lot_id=l.id AND t.kind='funding' AND t.status IN ('pending','processing','succeeded')) THEN RAISE EXCEPTION 'Funding reserved; cannot move bidder'; END IF;
 END IF;
 IF NEW.status='offered' AND (TG_OP='INSERT' OR OLD.status<>'offered') THEN
  IF NEW.rank>1 THEN SELECT * INTO prev FROM public.lot_bidders WHERE lot_id=NEW.lot_id AND rank=NEW.rank-1; IF prev.status NOT IN ('expired','declined') THEN RAISE EXCEPTION 'Cannot skip bidder; previous offer must end'; END IF; END IF;
  IF EXISTS(SELECT 1 FROM public.lot_bidders WHERE lot_id=NEW.lot_id AND id<>NEW.id AND status IN ('offered','paid')) THEN RAISE EXCEPTION 'Cannot skip active bidder'; END IF;
  NEW.offered_at:=clock_timestamp(); NEW.deadline_at:=NEW.offered_at+interval '24 hours';
 ELSIF TG_OP='INSERT' THEN NEW.offered_at:=NULL; NEW.deadline_at:=NULL; END IF;
 IF l.split_locked_at IS NULL THEN UPDATE public.auction_lots SET owner_pct=100-a.organiser_commission_pct,organiser_pct=a.organiser_commission_pct,split_locked_at=clock_timestamp() WHERE id=l.id; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER guard_lot_bidder BEFORE INSERT OR UPDATE OR DELETE ON public.lot_bidders FOR EACH ROW EXECUTE FUNCTION public.guard_lot_bidder();
CREATE OR REPLACE FUNCTION public.guard_auction_deal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l public.auction_lots; a public.auctions; b public.lot_bidders; BEGIN
 IF TG_OP='UPDATE' AND (OLD.auction_lot_id IS NOT NULL OR OLD.deal_type::text='auction') AND (NEW.auction_lot_id IS DISTINCT FROM OLD.auction_lot_id OR NEW.deal_type IS DISTINCT FROM OLD.deal_type) THEN RAISE EXCEPTION 'Auction deal link immutable'; END IF;
 IF NEW.auction_lot_id IS NULL AND NEW.deal_type::text<>'auction' THEN RETURN NEW; END IF;
 IF NEW.auction_lot_id IS NULL OR NEW.deal_type::text<>'auction' THEN RAISE EXCEPTION 'Auction deal requires lot'; END IF;
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Auction deals require server action'; END IF;
 SELECT * INTO l FROM public.auction_lots WHERE id=NEW.auction_lot_id FOR UPDATE;
 SELECT * INTO a FROM public.auctions WHERE id=l.auction_id;
 IF l.status IN ('cancelled','closed') THEN RAISE EXCEPTION 'Lot is terminal'; END IF;
 SELECT * INTO b FROM public.lot_bidders WHERE lot_id=l.id AND user_id=NEW.buyer_id AND status IN ('offered','paid');
 IF b.id IS NULL OR NEW.seller_id IS DISTINCT FROM l.owner_id OR NEW.amount<>b.price OR NEW.currency<>a.currency OR NEW.fee_payer<>'buyer' OR NEW.inspection_days<>3 OR NEW.shipping_responsibility<>'seller' OR NEW.payment_deadline_at IS DISTINCT FROM b.deadline_at THEN RAISE EXCEPTION 'Auction deal must match bidder price, deadline and buyer-paid fee'; END IF;
 IF l.funded_deal_id IS NOT NULL AND l.funded_deal_id<>NEW.id THEN RAISE EXCEPTION 'Lot already funded'; END IF;
 IF TG_OP='INSERT' AND clock_timestamp()>=b.deadline_at THEN RAISE EXCEPTION 'Payment deadline expired'; END IF;
 IF NEW.status='delivered' AND (NEW.delivered_at IS NULL OR NEW.auto_release_at IS DISTINCT FROM NEW.delivered_at+interval '72 hours') THEN RAISE EXCEPTION 'Auction inspection is 72 hours after delivery'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER guard_auction_deal BEFORE INSERT OR UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.guard_auction_deal();
CREATE OR REPLACE FUNCTION public.guard_auction_funding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.deals; l public.auction_lots; b public.lot_bidders; a public.auctions; BEGIN
 IF TG_OP='DELETE' THEN IF EXISTS(SELECT 1 FROM public.deals WHERE id=OLD.deal_id AND auction_lot_id IS NOT NULL) THEN RAISE EXCEPTION 'Auction transactions immutable'; END IF; RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.deals WHERE id=OLD.deal_id AND auction_lot_id IS NOT NULL) AND (NEW.deal_id IS DISTINCT FROM OLD.deal_id OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.amount IS DISTINCT FROM OLD.amount OR NEW.currency IS DISTINCT FROM OLD.currency OR (OLD.status='succeeded' AND NEW.status<>'succeeded')) THEN RAISE EXCEPTION 'Auction transaction terms immutable'; END IF;
 SELECT * INTO d FROM public.deals WHERE id=NEW.deal_id;
 IF d.auction_lot_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO l FROM public.auction_lots WHERE id=d.auction_lot_id FOR UPDATE;
 IF NEW.kind IN ('release','payout') THEN RAISE EXCEPTION 'Direct provider split settlement not enabled in step 1'; END IF;
 IF NEW.kind<>'funding' OR NEW.status IN ('failed','cancelled') THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.auctions WHERE id=l.auction_id;
 SELECT * INTO b FROM public.lot_bidders WHERE lot_id=l.id AND user_id=d.buyer_id AND status IN ('offered','paid');
 IF b.id IS NULL OR l.status NOT IN ('open','offered','funded') OR l.deal_id IS DISTINCT FROM d.id OR d.amount<>b.price THEN RAISE EXCEPTION 'Funding does not match current offer'; END IF;
 IF (TG_OP='INSERT' OR OLD.status IN ('failed','cancelled')) AND clock_timestamp()>=b.deadline_at THEN RAISE EXCEPTION 'Payment deadline expired'; END IF;
 IF l.funded_deal_id IS NOT NULL AND l.funded_deal_id<>d.id THEN RAISE EXCEPTION 'Lot already funded'; END IF;
 IF EXISTS(SELECT 1 FROM public.deal_transactions t JOIN public.deals other ON other.id=t.deal_id WHERE other.auction_lot_id=l.id AND t.id<>NEW.id AND t.kind='funding' AND t.status IN ('pending','processing','succeeded')) THEN RAISE EXCEPTION 'Lot funding already reserved'; END IF;
 PERFORM public.auction_require_beneficiary(l.owner_id,a.currency); PERFORM public.auction_require_beneficiary(a.organiser_id,a.currency);
 UPDATE public.auction_lots SET funding_tx_id=NEW.id,funded_deal_id=CASE WHEN NEW.status='succeeded' THEN d.id ELSE funded_deal_id END WHERE id=l.id;
 RETURN NEW; END; $$;
CREATE TRIGGER guard_auction_funding AFTER INSERT OR UPDATE OR DELETE ON public.deal_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_auction_funding();
CREATE OR REPLACE FUNCTION public.guard_auction_split() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.deals; l public.auction_lots; a public.auctions; expected_pct numeric; expected_id uuid; expected_amount numeric; digits integer; BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Locked payout split cannot be deleted'; END IF;
 SELECT * INTO d FROM public.deals WHERE id=NEW.deal_id;
 SELECT * INTO l FROM public.auction_lots WHERE id=d.auction_lot_id FOR UPDATE;
 SELECT * INTO a FROM public.auctions WHERE id=l.auction_id;
 IF l.split_locked_at IS NULL THEN RAISE EXCEPTION 'Payout split requires locked lot'; END IF;
 expected_pct:=CASE WHEN NEW.role='owner' THEN l.owner_pct ELSE l.organiser_pct END;
 expected_id:=CASE WHEN NEW.role='owner' THEN l.owner_id ELSE a.organiser_id END;
 digits:=CASE WHEN d.currency IN ('BHD','KWD','OMR') THEN 3 ELSE 2 END;
 expected_amount:=CASE WHEN NEW.role='organiser' THEN round(d.amount*l.organiser_pct/100,digits) ELSE d.amount-round(d.amount*l.organiser_pct/100,digits) END;
 IF NEW.pct<>expected_pct OR NEW.beneficiary_id<>expected_id OR NEW.currency<>d.currency OR NEW.amount<>expected_amount THEN RAISE EXCEPTION 'Payout split must match locked beneficiary share'; END IF;
 IF TG_OP='UPDATE' AND (NEW.deal_id IS DISTINCT FROM OLD.deal_id OR NEW.role IS DISTINCT FROM OLD.role) THEN RAISE EXCEPTION 'Payout split identity immutable'; END IF;
 IF NEW.release_tx_id IS NOT NULL THEN RAISE EXCEPTION 'Direct provider split payout not enabled in step 1'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER guard_auction_split BEFORE INSERT OR UPDATE OR DELETE ON public.deal_payout_splits FOR EACH ROW EXECUTE FUNCTION public.guard_auction_split();
CREATE OR REPLACE FUNCTION public.validate_auction_split_total() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; total numeric; amounts numeric; hammer numeric; BEGIN
 SELECT count(*),sum(pct),sum(amount) INTO n,total,amounts FROM public.deal_payout_splits WHERE deal_id=NEW.deal_id;
 SELECT amount INTO hammer FROM public.deals WHERE id=NEW.deal_id;
 IF n<>2 OR total<>100 OR amounts<>hammer THEN RAISE EXCEPTION 'Two direct payout shares must sum to 100 and hammer price'; END IF;
 RETURN NULL; END; $$;
CREATE CONSTRAINT TRIGGER validate_auction_split_total AFTER INSERT OR UPDATE ON public.deal_payout_splits DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_auction_split_total();
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fee_rules' AND policyname='fee_rules_public_read') THEN CREATE POLICY fee_rules_public_read ON public.fee_rules FOR SELECT TO anon USING(currency='USD'); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vat_rates' AND policyname='vat_rates_public_read') THEN CREATE POLICY vat_rates_public_read ON public.vat_rates FOR SELECT TO anon USING(true); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fx_rates' AND policyname='fx_rates_public_read') THEN CREATE POLICY fx_rates_public_read ON public.fx_rates FOR SELECT TO anon USING(active=true); END IF;
END $$;
GRANT SELECT ON public.fee_rules,public.vat_rates TO anon;
REVOKE SELECT ON public.fx_rates FROM anon;
GRANT SELECT(code,name,provider_rate,spread,minor_units,active) ON public.fx_rates TO anon;