CREATE OR REPLACE FUNCTION public.guard_auction_final_confirmation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE expected_status text; refund numeric; moved numeric;
BEGIN
 IF NEW.deal_type::text<>'auction' OR NEW.status NOT IN ('released','refunded','partially_refunded') OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 SELECT sum(amount),coalesce(sum(amount) FILTER(WHERE kind='refund'),0) INTO moved,refund FROM public.deal_transactions WHERE deal_id=NEW.id AND kind IN ('release','refund');
 IF moved IS DISTINCT FROM NEW.amount OR EXISTS(SELECT 1 FROM public.deal_transactions WHERE deal_id=NEW.id AND kind IN ('release','refund') AND status<>'succeeded') THEN RAISE EXCEPTION 'Every auction payout leg must be confirmed before final status'; END IF;
 expected_status:=CASE WHEN refund=NEW.amount THEN 'refunded' WHEN refund>0 THEN 'partially_refunded' ELSE 'released' END;
 IF NEW.status<>expected_status THEN RAISE EXCEPTION 'Auction final status must match confirmed legs'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_auction_final_confirmation BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.guard_auction_final_confirmation();