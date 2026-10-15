-- Records the 14 Oct change: deals.amount is numeric(18,3). No-op when already applied.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='amount' AND (numeric_precision IS DISTINCT FROM 18 OR numeric_scale IS DISTINCT FROM 3)) THEN
    EXECUTE 'ALTER TABLE public.deals ALTER COLUMN amount TYPE numeric(18,3)';
  END IF;
END $$;
COMMENT ON COLUMN public.deals.amount IS 'numeric(18,3): 3 decimals for BHD/KWD/OMR';