-- Founder request (18 Oct): password-reset emails for the demo accounts must reach insightsettle@gmail.com.
-- Gmail delivers plus-addresses (insightsettle+anything@gmail.com) to the same inbox, so each account keeps
-- its own sign-in while every email lands with the founder.
--   admin@insightsettle.com -> insightsettle+admin@gmail.com   (Insight admin)
--   test@insightsettle.com  -> insightsettle+client@gmail.com  (demo buyer)
--   insightsettle+supplier@gmail.com is unchanged (demo supplier)

update auth.users set email = 'insightsettle+admin@gmail.com', email_change = '', email_change_token_new = '', updated_at = now()
  where email = 'admin@insightsettle.com';
update auth.users set email = 'insightsettle+client@gmail.com', email_change = '', email_change_token_new = '', updated_at = now()
  where email = 'test@insightsettle.com';
update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb('insightsettle+admin@gmail.com'::text)), updated_at = now()
  where provider = 'email' and identity_data->>'email' = 'admin@insightsettle.com';
update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb('insightsettle+client@gmail.com'::text)), updated_at = now()
  where provider = 'email' and identity_data->>'email' = 'test@insightsettle.com';
update public.deals set counterparty_email = 'insightsettle+client@gmail.com' where counterparty_email = 'test@insightsettle.com';

-- The demo reset finds the buyer by the new address.
create or replace function public.reset_demo_data(_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  buyer uuid; supplier uuid; organiser uuid; owner uuid;
  removed integer;
  goods uuid; works uuid; auc uuid; lot uuid;
  started timestamptz := clock_timestamp();
begin
  if _actor is null or not (public.has_role(_actor, 'admin') or public.has_role(_actor, 'staff')) then
    raise exception 'Only Insight staff can reset the demo.';
  end if;

  perform set_config('insight.demo_reset', 'on', true);
  perform set_config('insight.demo_quiet', 'on', true);

  select count(*) into removed from public.deals;

  -- Break the lot <-> deal links (every statement carries WHERE: PostgREST runs pg_safeupdate), then remove every deal-related row (children first).
  update public.auction_lots set deal_id = null, funded_deal_id = null, funding_tx_id = null where true;
  update public.deal_payout_splits set release_tx_id = null where release_tx_id is not null;
  delete from public.ledger_entries where true;
  delete from public.tax_invoices where true;
  delete from public.dispute_evidence where true;
  delete from public.deal_transactions where true;
  delete from public.deal_payout_splits where true;
  delete from public.disputes where true;
  delete from public.fx_quotes where true;
  delete from public.lot_bidders where true;
  delete from public.risk_flags where true;
  delete from public.deal_attachments where true;
  delete from public.deal_term_versions where true;
  delete from public.deal_milestones where true;
  delete from public.notifications where deal_id is not null;
  delete from public.deals where true;
  delete from public.auction_lots where true;
  delete from public.auctions where true;

  perform set_config('insight.demo_reset', 'off', true);

  -- Fictional starting dataset (C06 §1). Each account is fictional; states (b), (d) and (e) are
  -- produced live during the demo in a few clicks with the simulated provider.
  select id into buyer from auth.users where email = 'insightsettle+client@gmail.com';
  select id into supplier from auth.users where email = 'insightsettle+supplier@gmail.com';
  select id into organiser from auth.users where email like 't22-organiser-%@example.test' order by created_at limit 1;
  select id into owner from auth.users where email like 't22-owner-%@example.test' order by created_at limit 1;

  if buyer is not null and supplier is not null then
    insert into public.deals (ref, title, description, deal_type, amount, currency, quantity, unit_price, fee_payer,
      buyer_id, seller_id, created_by, counterparty_email, status, terms_status, terms_version, inspection_days,
      shipping_responsibility, shipping_status, delivery_country, supplier_country, funding_mode,
      acceptance_criteria, retention_percent, defects_liability_days, revisions_included)
    values ('DL-24817', 'Packaging materials, Riyadh – Manama (Demo)',
      'Fictional demo deal: 2,000 corrugated boxes from a Manama supplier to a Riyadh buyer. No real goods or funds.',
      'goods', 1000.000, 'BHD', 1, 1000.000, 'split', buyer, supplier, supplier, 'insightsettle+client@gmail.com',
      'pending_funding', 'pending', 1, 3, 'seller', 'preparing', 'SA', 'BH', 'upfront',
      'Boxes delivered intact, in the agreed quantity and size.', 0, 0, 0)
    returning id into goods;
    insert into public.deal_term_versions (deal_id, version, snapshot, note, created_by)
    select d.id, 1, jsonb_build_object('title', d.title, 'amount', d.amount, 'currency', d.currency, 'quantity', d.quantity,
      'unit_price', d.unit_price, 'due_at', null, 'inspection_days', d.inspection_days, 'fee_payer', d.fee_payer,
      'deal_type', d.deal_type, 'funding_mode', d.funding_mode, 'retention_percent', 0, 'defects_liability_days', 0,
      'revisions_included', 0, 'shipping_responsibility', d.shipping_responsibility, 'acceptance_criteria', d.acceptance_criteria,
      'refund_conditions', null, 'cancellation_conditions', null, 'milestones', '[]'::jsonb), 'Initial terms', supplier
    from public.deals d where d.id = goods;

    insert into public.deals (ref, title, description, deal_type, amount, currency, quantity, unit_price, fee_payer,
      buyer_id, seller_id, created_by, counterparty_email, status, terms_status, terms_version, inspection_days,
      shipping_responsibility, shipping_status, delivery_country, supplier_country, funding_mode,
      retention_percent, defects_liability_days, revisions_included)
    values ('DL-30512', 'Showroom fit-out, Riyadh (Demo)',
      'Fictional demo contract: fit-out of a 240 m² showroom in four stages. No real works or funds.',
      'contracting', 10000.000, 'BHD', 1, 10000.000, 'split', buyer, supplier, supplier, 'insightsettle+client@gmail.com',
      'pending_funding', 'pending', 1, 5, 'none', 'not_required', 'SA', 'BH', 'upfront', 5, 90, 0)
    returning id into works;
    insert into public.deal_milestones (deal_id, seq, kind, title, amount, status)
    values (works, 1, 'advance', 'Mobilisation advance', 1000.000, 'pending'),
           (works, 2, 'work', 'Partitions and ceilings', 4000.000, 'pending'),
           (works, 3, 'work', 'MEP works', 3000.000, 'pending'),
           (works, 4, 'work', 'Finishes and handover', 2000.000, 'pending');
    insert into public.deal_term_versions (deal_id, version, snapshot, note, created_by)
    select d.id, 1, jsonb_build_object('title', d.title, 'amount', d.amount, 'currency', d.currency, 'quantity', 1,
      'unit_price', d.unit_price, 'due_at', null, 'inspection_days', d.inspection_days, 'fee_payer', d.fee_payer,
      'deal_type', d.deal_type, 'funding_mode', d.funding_mode, 'retention_percent', d.retention_percent,
      'defects_liability_days', d.defects_liability_days, 'revisions_included', 0, 'shipping_responsibility', 'none',
      'acceptance_criteria', null, 'refund_conditions', null, 'cancellation_conditions', null,
      'milestones', (select jsonb_agg(jsonb_build_object('id', null, 'seq', m.seq, 'kind', m.kind, 'title', m.title,
        'amount', m.amount, 'description', null, 'due_date', null, 'evidence_required', null) order by m.seq)
        from public.deal_milestones m where m.deal_id = d.id)), 'Initial terms', supplier
    from public.deals d where d.id = works;
  end if;

  if organiser is not null and owner is not null then
    insert into public.auctions (organiser_id, title, platform, currency, organiser_commission_pct, status, starts_at)
    values (organiser, 'Najd evening lot sale (Demo)', 'instagram', 'SAR', 15, 'open', now())
    returning id into auc;
    insert into public.auction_lots (auction_id, title, description, owner_id, owner_pct, organiser_pct, status)
    values (auc, 'Vintage oud set (Demo)', 'Fictional demo lot. No real item or funds.', owner, 85, 15, 'open')
    returning id into lot;
  end if;

  perform set_config('insight.demo_quiet', 'off', true);

  insert into public.audit_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (_actor, 'demo_reset', 'demo', 'T20', jsonb_build_object('deals_removed', removed),
    jsonb_build_object('deals', (select count(*) from public.deals), 'auctions', (select count(*) from public.auctions),
      'lots', (select count(*) from public.auction_lots), 'ms', round(extract(epoch from clock_timestamp() - started) * 1000)));

  return jsonb_build_object('removed', removed, 'deals', (select count(*) from public.deals),
    'auctions', (select count(*) from public.auctions), 'lots', (select count(*) from public.auction_lots),
    'ms', round(extract(epoch from clock_timestamp() - started) * 1000));
end; $$;

revoke all on function public.reset_demo_data(uuid) from public, anon, authenticated;
grant execute on function public.reset_demo_data(uuid) to service_role;
