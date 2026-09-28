CREATE OR REPLACE FUNCTION public.block_inactive_accounts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE st text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT account_state INTO st FROM profiles WHERE id = auth.uid();
  IF st = 'suspended' OR (st = 'restricted' AND TG_TABLE_NAME = 'deals') THEN
    RAISE EXCEPTION 'Your account is %, so this action is not available. Contact Insight support.', st;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.block_inactive_accounts() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER block_inactive_deals BEFORE INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION block_inactive_accounts();
CREATE TRIGGER block_inactive_messages BEFORE INSERT ON public.deal_messages FOR EACH ROW EXECUTE FUNCTION block_inactive_accounts();

CREATE OR REPLACE FUNCTION public.protect_payout_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(),'admin') THEN
    IF TG_OP = 'UPDATE' AND (NEW.iban IS DISTINCT FROM OLD.iban OR NEW.account_name IS DISTINCT FROM OLD.account_name) THEN
      NEW.verified := false;
    ELSIF TG_OP = 'UPDATE' AND NEW.verified AND NOT OLD.verified THEN
      RAISE EXCEPTION 'Only Insight staff can verify a bank account.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.protect_payout_verified() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_payout_verified BEFORE UPDATE ON public.payout_accounts FOR EACH ROW EXECUTE FUNCTION protect_payout_verified();