-- Defence in depth (27 Oct review): provider credentials are read and written only by server functions (service role).
-- RLS already blocks client roles (no policies); this also removes the default table grants.
REVOKE ALL ON public.finance_provider_credentials FROM anon, authenticated;
