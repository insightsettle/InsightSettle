DROP POLICY IF EXISTS fee_rules_read ON public.fee_rules;
CREATE POLICY fee_rules_read ON public.fee_rules FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.fee_rules FROM anon;

DROP POLICY IF EXISTS fx_rates_read ON public.fx_rates;
CREATE POLICY fx_rates_read ON public.fx_rates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS deal_ratings_select_authenticated ON public.deal_ratings;
CREATE POLICY deal_ratings_select_parties ON public.deal_ratings FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_ratings.deal_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid()))
);