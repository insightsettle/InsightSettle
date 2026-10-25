-- Survey: written answers when "other" is chosen (25 Oct).
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS other_answers jsonb NOT NULL DEFAULT '{}'::jsonb;
