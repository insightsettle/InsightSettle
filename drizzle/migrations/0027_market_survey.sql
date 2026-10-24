-- C03 market survey (founder decision, 24 Oct): anonymous responses; optional email only for a pilot invitation.
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lang text NOT NULL DEFAULT 'ar',
  respondent text NOT NULL,
  country text NOT NULL,
  unknown_party text NOT NULL,
  problems text[] NOT NULL DEFAULT '{}',
  deal_size text NOT NULL,
  current_method text NOT NULL,
  would_use text NOT NULL,
  fee_ok text NOT NULL,
  heard_of text[] NOT NULL DEFAULT '{}',
  comment text NOT NULL DEFAULT '',
  pilot_email text,
  source text NOT NULL DEFAULT 'link'
);
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
-- No policies: written and read only by server functions (service role).
CREATE INDEX IF NOT EXISTS survey_responses_created_idx ON public.survey_responses (created_at DESC);
