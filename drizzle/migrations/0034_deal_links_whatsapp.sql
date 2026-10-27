-- 27 Oct (founder): deal links for sellers, WhatsApp updates (opt-in), and the member card.

-- 1. Deal links: a seller publishes an offer once; each buyer who opens it gets their own deal.
CREATE TABLE IF NOT EXISTS public.deal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9]{8,16}$'),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_type text NOT NULL CHECK (deal_type IN ('goods','services','freelance')),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 200),
  description text NOT NULL DEFAULT '',
  amount numeric(18,3) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('SAR','BHD','AED','QAR','KWD','OMR','USD')),
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  fee_payer text NOT NULL DEFAULT 'buyer' CHECK (fee_payer IN ('buyer','seller','split')),
  inspection_days int NOT NULL DEFAULT 3 CHECK (inspection_days BETWEEN 1 AND 30),
  delivery_days int NOT NULL DEFAULT 7 CHECK (delivery_days BETWEEN 1 AND 180),
  shipping_required boolean NOT NULL DEFAULT true,
  shipping_responsibility text NOT NULL DEFAULT 'seller' CHECK (shipping_responsibility IN ('seller','buyer','none')),
  supplier_country text,
  acceptance_criteria text NOT NULL DEFAULT '',
  refund_conditions text NOT NULL DEFAULT '',
  cancellation_conditions text NOT NULL DEFAULT '',
  auto_release boolean NOT NULL DEFAULT true,
  max_uses int CHECK (max_uses IS NULL OR max_uses BETWEEN 1 AND 10000),
  uses int NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_links_owner_idx ON public.deal_links(owner_id, created_at DESC);
ALTER TABLE public.deal_links ENABLE ROW LEVEL SECURITY;
-- Read and written only by server functions; the public page gets a safe projection.
REVOKE ALL ON public.deal_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deal_links TO service_role;

ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deal_link_id uuid REFERENCES public.deal_links(id);
CREATE INDEX IF NOT EXISTS deals_deal_link_idx ON public.deals(deal_link_id) WHERE deal_link_id IS NOT NULL;

-- 2. WhatsApp updates: explicit opt-in per user; every message is logged (sandbox: not sent until the provider is configured).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz;

CREATE TABLE IF NOT EXISTS public.whatsapp_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deal_id uuid,
  event text NOT NULL,
  phone_last4 text,
  body text NOT NULL,
  template text,
  params jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (status IN ('queued','sent','failed','disabled','skipped')),
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS whatsapp_outbox_created_idx ON public.whatsapp_outbox(created_at DESC);
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_outbox TO service_role;
