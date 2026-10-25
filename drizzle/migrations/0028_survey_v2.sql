-- Survey v2 (25 Oct): three new questions and a multi-answer "how do you protect yourself".
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS deals_per_year text;
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS channel text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS cross_border text;
ALTER TABLE public.survey_responses ALTER COLUMN current_method TYPE text[] USING ARRAY[current_method];
