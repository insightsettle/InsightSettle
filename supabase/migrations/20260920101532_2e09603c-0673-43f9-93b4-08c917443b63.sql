CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'deal',
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.deal_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  kind text NOT NULL,
  amount numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'manual',
  provider_ref text,
  error_message text,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.deal_transactions TO authenticated;
GRANT ALL ON public.deal_transactions TO service_role;
ALTER TABLE public.deal_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY deal_transactions_select_party ON public.deal_transactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_transactions.deal_id
        AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
    )
  );
CREATE POLICY deal_transactions_select_staff ON public.deal_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX deal_transactions_deal_idx ON public.deal_transactions (deal_id, created_at DESC);

CREATE TRIGGER update_deal_transactions_updated_at
  BEFORE UPDATE ON public.deal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_transaction_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kind NOT IN ('funding','release','refund','payout','fee') THEN
    RAISE EXCEPTION 'Invalid transaction kind: %', NEW.kind;
  END IF;
  IF NEW.status NOT IN ('pending','processing','succeeded','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid transaction status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_deal_transactions
  BEFORE INSERT OR UPDATE ON public.deal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_fields();

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS risk_score integer,
  ADD COLUMN IF NOT EXISTS risk_summary text,
  ADD COLUMN IF NOT EXISTS risk_checked_at timestamptz;