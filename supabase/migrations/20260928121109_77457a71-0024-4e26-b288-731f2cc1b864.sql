CREATE TABLE public.fx_rates (
  code text PRIMARY KEY,
  name text NOT NULL,
  provider_rate numeric NOT NULL,
  spread numeric NOT NULL DEFAULT 0.01,
  minor_units integer NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fx_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_rates TO authenticated;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY fx_rates_read ON public.fx_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY fx_rates_staff_write ON public.fx_rates FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER fx_rates_updated BEFORE UPDATE ON public.fx_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.fx_rates (code,name,provider_rate,spread,minor_units) VALUES
 ('SAR','Saudi riyal',1,0,2),
 ('AED','UAE dirham',1.021,0.008,2),
 ('BHD','Bahraini dinar',9.94563,0.0105,3),
 ('QAR','Qatari riyal',1.030,0.008,2),
 ('KWD','Kuwaiti dinar',12.2185,0.01,3),
 ('OMR','Omani rial',9.740,0.01,3),
 ('USD','US dollar',3.75,0.006,2),
 ('EUR','Euro',4.09,0.012,2),
 ('GBP','Pound sterling',4.78,0.012,2);

CREATE TABLE public.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  amount_from numeric NOT NULL DEFAULT 0,
  amount_to numeric,
  percent numeric NOT NULL DEFAULT 0,
  min_fee numeric NOT NULL DEFAULT 0,
  max_fee numeric,
  country text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_rules TO authenticated;
GRANT SELECT ON public.fee_rules TO anon;
GRANT ALL ON public.fee_rules TO service_role;
ALTER TABLE public.fee_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY fee_rules_read ON public.fee_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY fee_rules_staff_write ON public.fee_rules FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER fee_rules_updated BEFORE UPDATE ON public.fee_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
INSERT INTO public.fee_rules (label,amount_from,amount_to,percent,min_fee,max_fee,sort_order) VALUES
 ('Up to 1,000',0,1000,3.5,15,NULL,1),
 ('1,001 – 50,000',1000.01,50000,2.5,0,NULL,2),
 ('50,001 – 1,000,000',50000.01,1000000,1.8,0,NULL,3),
 ('Above 1,000,000',1000000.01,NULL,0,12000,12000,4);

CREATE TABLE public.fx_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  source_currency text NOT NULL,
  target_currency text NOT NULL DEFAULT 'SAR',
  source_amount numeric NOT NULL,
  provider_rate numeric NOT NULL,
  customer_rate numeric NOT NULL,
  provider_amount numeric NOT NULL,
  customer_amount numeric NOT NULL,
  fx_spread numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fx_quotes TO authenticated;
GRANT ALL ON public.fx_quotes TO service_role;
ALTER TABLE public.fx_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY fx_quotes_party ON public.fx_quotes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid()=d.buyer_id OR auth.uid()=d.seller_id)) OR has_role(auth.uid(),'admin'));

CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id),
  transaction_id uuid REFERENCES public.deal_transactions(id),
  account text NOT NULL,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  currency text NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_party ON public.ledger_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM deals d WHERE d.id=deal_id AND (auth.uid()=d.buyer_id OR auth.uid()=d.seller_id)) OR has_role(auth.uid(),'admin'));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_staff_read ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(user_id, action, entity, entity_id, old_value, new_value)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME,
    COALESCE((CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'id',''),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END; $$;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_deals AFTER INSERT OR UPDATE OR DELETE ON public.deals FOR EACH ROW EXECUTE FUNCTION write_audit_log();
CREATE TRIGGER audit_deal_transactions AFTER INSERT OR UPDATE OR DELETE ON public.deal_transactions FOR EACH ROW EXECUTE FUNCTION write_audit_log();
CREATE TRIGGER audit_kyc AFTER INSERT OR UPDATE OR DELETE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION write_audit_log();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION write_audit_log();
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION write_audit_log();
CREATE TRIGGER audit_fx_rates AFTER INSERT OR UPDATE OR DELETE ON public.fx_rates FOR EACH ROW EXECUTE FUNCTION write_audit_log();
CREATE TRIGGER audit_fee_rules AFTER INSERT OR UPDATE OR DELETE ON public.fee_rules FOR EACH ROW EXECUTE FUNCTION write_audit_log();

ALTER TABLE public.deal_transactions ADD COLUMN idempotency_key text, ADD COLUMN original_transaction_id uuid REFERENCES public.deal_transactions(id), ADD COLUMN fx_quote_id uuid REFERENCES public.fx_quotes(id);
CREATE UNIQUE INDEX deal_transactions_idem ON public.deal_transactions(deal_id, kind, idempotency_key) WHERE idempotency_key IS NOT NULL;