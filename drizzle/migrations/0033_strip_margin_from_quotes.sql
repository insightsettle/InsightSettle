-- Customers can read their quotes: remove Insight's per-method margin from stored quote breakdowns (27 Oct).
UPDATE public.fx_quotes
SET breakdown = jsonb_set(breakdown, '{methods}', (SELECT coalesce(jsonb_agg(m - 'margin'), '[]'::jsonb) FROM jsonb_array_elements(breakdown->'methods') m))
WHERE jsonb_typeof(breakdown->'methods') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(breakdown->'methods') m WHERE m ? 'margin');
