-- Staff console batch 2: platform switches, site notice and support inbox. Idempotent.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  new_deals_enabled boolean NOT NULL DEFAULT true,
  auctions_enabled boolean NOT NULL DEFAULT true,
  notice_active boolean NOT NULL DEFAULT false,
  notice_tone text NOT NULL DEFAULT 'info' CHECK (notice_tone IN ('info','warning')),
  notice_en text NOT NULL DEFAULT '',
  notice_ar text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_settings_public_read ON public.platform_settings;
CREATE POLICY platform_settings_public_read ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.staff_save_platform_settings(_actor uuid, _settings jsonb, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oldrow public.platform_settings; newrow public.platform_settings;
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO oldrow FROM public.platform_settings WHERE id FOR UPDATE;
  newrow := jsonb_populate_record(oldrow, _settings);
  IF newrow.notice_tone NOT IN ('info','warning') OR length(newrow.notice_en) > 300 OR length(newrow.notice_ar) > 300
     OR (newrow.notice_active AND (length(trim(newrow.notice_en)) = 0 OR length(trim(newrow.notice_ar)) = 0)) THEN
    RAISE EXCEPTION 'Invalid platform settings';
  END IF;
  UPDATE public.platform_settings SET new_deals_enabled = newrow.new_deals_enabled, auctions_enabled = newrow.auctions_enabled,
    notice_active = newrow.notice_active, notice_tone = newrow.notice_tone, notice_en = newrow.notice_en, notice_ar = newrow.notice_ar,
    updated_at = clock_timestamp() WHERE id;
  PERFORM public.staff_control_audit(_actor, 'PLATFORM_SETTINGS', 'platform_settings', 'true', to_jsonb(oldrow), to_jsonb(newrow), _reason);
END $$;
REVOKE ALL ON FUNCTION public.staff_save_platform_settings(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_save_platform_settings(uuid, jsonb, text) TO service_role;

-- Switches block new deals / new auctions created by customers. Staff work, existing deals and demo reset are unaffected.
CREATE OR REPLACE FUNCTION public.guard_platform_switches() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.platform_settings;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  IF s.id IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'auctions' AND NOT s.auctions_enabled THEN RAISE EXCEPTION 'New auctions are paused by Insight. Please try again later.'; END IF;
  IF TG_TABLE_NAME = 'deals' AND NOT s.new_deals_enabled AND coalesce((to_jsonb(NEW)->>'deal_type'), '') <> 'auction' THEN
    RAISE EXCEPTION 'New deals are paused by Insight. Please try again later.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS deals_platform_switch ON public.deals;
CREATE TRIGGER deals_platform_switch BEFORE INSERT ON public.deals FOR EACH ROW WHEN (NOT public.demo_reset_active()) EXECUTE FUNCTION public.guard_platform_switches();
DROP TRIGGER IF EXISTS auctions_platform_switch ON public.auctions;
CREATE TRIGGER auctions_platform_switch BEFORE INSERT ON public.auctions FOR EACH ROW WHEN (NOT public.demo_reset_active()) EXECUTE FUNCTION public.guard_platform_switches();

-- Support inbox: contact requests are stored for staff follow-up (email delivery to the fixed recipient continues).
CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid UNIQUE,
  email text NOT NULL CHECK (length(email) <= 200),
  source text NOT NULL DEFAULT 'contact_popup',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','waiting_customer','resolved')),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.support_requests TO service_role;
REVOKE ALL ON public.support_requests FROM anon, authenticated;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS support_requests_status_idx ON public.support_requests (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.staff_update_support_request(_actor uuid, _id uuid, _status text, _assignee uuid, _note text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oldrow public.support_requests;
BEGIN
  IF NOT (public.has_role(_actor, 'admin') OR public.has_role(_actor, 'staff')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('new','in_progress','waiting_customer','resolved') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF _assignee IS NOT NULL AND NOT (public.has_role(_assignee, 'admin') OR public.has_role(_assignee, 'staff')) THEN RAISE EXCEPTION 'Assignee must be staff'; END IF;
  SELECT * INTO oldrow FROM public.support_requests WHERE id = _id FOR UPDATE;
  IF oldrow.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  UPDATE public.support_requests SET status = _status, assignee_id = _assignee, staff_note = left(coalesce(_note, ''), 4000), updated_at = clock_timestamp() WHERE id = _id;
  PERFORM public.staff_control_audit(_actor, 'SUPPORT_REQUEST', 'support_requests', _id::text,
    jsonb_build_object('status', oldrow.status, 'assignee_id', oldrow.assignee_id),
    jsonb_build_object('status', _status, 'assignee_id', _assignee), _reason);
END $$;
REVOKE ALL ON FUNCTION public.staff_update_support_request(uuid, uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_support_request(uuid, uuid, text, uuid, text, text) TO service_role;
