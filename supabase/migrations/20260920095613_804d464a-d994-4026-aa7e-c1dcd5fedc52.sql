-- Allow authenticated users (and RLS policies they trigger) to use has_role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Deal extras
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS fee_override_percent numeric,
  ADD COLUMN IF NOT EXISTS fee_override_flat numeric,
  ADD COLUMN IF NOT EXISTS fee_override_note text,
  ADD COLUMN IF NOT EXISTS fee_override_by uuid,
  ADD COLUMN IF NOT EXISTS disputed_reason text,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- Status validation via trigger (not CHECK)
CREATE OR REPLACE FUNCTION public.validate_deal_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending_funding','held','delivered','under_review','released','refunded','disputed') THEN
    RAISE EXCEPTION 'Invalid deal status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_deal_status_trigger ON public.deals;
CREATE TRIGGER validate_deal_status_trigger
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.validate_deal_status();

-- Deal messages
CREATE TABLE IF NOT EXISTS public.deal_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Member',
  author_kind text NOT NULL DEFAULT 'party',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.deal_messages TO authenticated;
GRANT ALL ON public.deal_messages TO service_role;

ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY deal_messages_select_party ON public.deal_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_messages.deal_id
      AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY deal_messages_insert_party ON public.deal_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_messages.deal_id
        AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Staff read/write access on existing tables
CREATE POLICY profiles_select_staff ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY profiles_update_staff ON public.profiles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY deals_select_staff ON public.deals
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY deals_update_staff ON public.deals
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY deal_events_select_staff ON public.deal_events
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY deal_events_insert_staff ON public.deal_events
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins manage roles
CREATE POLICY user_roles_select_staff ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_insert_staff ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_delete_staff ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, DELETE ON public.user_roles TO authenticated;