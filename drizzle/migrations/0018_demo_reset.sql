-- T20 demo reset (C09). Demo environments only: the server function checks that no live payment
-- provider is connected and that the caller is staff, then calls reset_demo_data() with the service role.
--
-- Guards and audit triggers honour two transaction-local flags that only reset_demo_data() sets:
--   insight.demo_reset = on  -> guard triggers step aside so recorded rows can be removed
--   insight.demo_quiet = on  -> row audit triggers step aside; the reset writes ONE audit row itself
-- No API role can set them: set_config is not exposed, and reset_demo_data() is service-role only.

create or replace function public.demo_reset_active() returns boolean
language sql stable as $$ select coalesce(current_setting('insight.demo_reset', true), '') = 'on' $$;

create or replace function public.demo_quiet() returns boolean
language sql stable as $$ select coalesce(current_setting('insight.demo_quiet', true), '') = 'on' $$;

drop trigger if exists guard_auction_lot on public.auction_lots;
create trigger guard_auction_lot before insert or delete or update on public.auction_lots
  for each row when (not public.demo_reset_active()) execute function public.guard_auction_lot();

drop trigger if exists guard_auction_split on public.deal_payout_splits;
create trigger guard_auction_split before insert or delete or update on public.deal_payout_splits
  for each row when (not public.demo_reset_active()) execute function public.guard_auction_split();

drop trigger if exists guard_auction_funding on public.deal_transactions;
create trigger guard_auction_funding after insert or delete or update on public.deal_transactions
  for each row when (not public.demo_reset_active()) execute function public.guard_auction_funding();

drop trigger if exists guard_lot_bidder on public.lot_bidders;
create trigger guard_lot_bidder before insert or delete or update on public.lot_bidders
  for each row when (not public.demo_reset_active()) execute function public.guard_lot_bidder();

drop trigger if exists protect_deal_milestones on public.deal_milestones;
create trigger protect_deal_milestones before insert or delete or update on public.deal_milestones
  for each row when (not public.demo_reset_active()) execute function public.protect_deal_milestones();

drop trigger if exists audit_deal_milestones on public.deal_milestones;
create trigger audit_deal_milestones after insert or delete or update on public.deal_milestones
  for each row when (not public.demo_quiet()) execute function public.write_audit_log();

drop trigger if exists audit_deal_transactions on public.deal_transactions;
create trigger audit_deal_transactions after insert or delete or update on public.deal_transactions
  for each row when (not public.demo_quiet()) execute function public.write_audit_log();

drop trigger if exists audit_deals on public.deals;
create trigger audit_deals after insert or delete or update on public.deals
  for each row when (not public.demo_quiet()) execute function public.write_audit_log();

drop trigger if exists audit_disputes on public.disputes;
create trigger audit_disputes after insert or update on public.disputes
  for each row when (not public.demo_quiet()) execute function public.write_audit_log();

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

  -- Break the lot <-> deal links, then remove every deal-related row (children first).
  update public.auction_lots set deal_id = null, funded_deal_id = null, funding_tx_id = null;
  delete from public.deal_payout_splits;
  delete from public.ledger_entries;
  delete from public.tax_invoices;
  delete from public.dispute_evidence;
  delete from public.deal_transactions;
  delete from public.disputes;
  delete from public.fx_quotes;
  delete from public.lot_bidders;
  delete from public.risk_flags;
  delete from public.deal_attachments;
  delete from public.deal_term_versions;
  delete from public.deal_milestones;
  delete from public.notifications where deal_id is not null;
  delete from public.deals;
  delete from public.auction_lots;
  delete from public.auctions;

  perform set_config('insight.demo_reset', 'off', true);

  -- Fictional starting dataset (C06 §1). Each account is fictional; states (b), (d) and (e) are
  -- produced live during the demo in a few clicks with the simulated provider.
  select id into buyer from auth.users where email = 'test@insightsettle.com';
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
      'goods', 1000.000, 'BHD', 1, 1000.000, 'split', buyer, supplier, supplier, 'test@insightsettle.com',
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
      'contracting', 10000.000, 'BHD', 1, 10000.000, 'split', buyer, supplier, supplier, 'test@insightsettle.com',
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
