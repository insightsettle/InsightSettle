CREATE OR REPLACE FUNCTION public.block_inactive_accounts() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE st text; actor uuid; BEGIN
 actor:=auth.uid();
 IF actor IS NULL THEN
  IF TG_TABLE_NAME<>'deals' OR TG_OP<>'INSERT' THEN RETURN NEW; END IF;
  IF public.demo_reset_active() THEN RETURN NEW; END IF;
  actor:=NEW.created_by;
 END IF;
 SELECT account_state INTO st FROM public.profiles WHERE id=actor FOR UPDATE;
 IF NOT FOUND OR st IS NULL OR st='suspended' OR (st='restricted' AND TG_TABLE_NAME='deals') THEN RAISE EXCEPTION 'Your account cannot perform this action while suspended or restricted. Contact Insight support.'; END IF;
 RETURN NEW;
END $$;