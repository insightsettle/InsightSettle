-- Per-milestone funding (D-43, C07 rule 8): each milestone is funded, charged and invoiced on its own.
-- One tax invoice per funding: whole-deal funding keeps one invoice per deal; milestone fundings get one
-- invoice per milestone.

alter table public.tax_invoices add column if not exists milestone_id uuid references public.deal_milestones(id) on delete cascade;

alter table public.tax_invoices drop constraint if exists tax_invoices_deal_id_key;
create unique index if not exists tax_invoices_one_per_deal on public.tax_invoices (deal_id) where milestone_id is null;
create unique index if not exists tax_invoices_one_per_milestone on public.tax_invoices (deal_id, milestone_id) where milestone_id is not null;

-- One live funding per milestone (a declined attempt may be retried with a new key).
create unique index if not exists deal_transactions_one_milestone_funding on public.deal_transactions (milestone_id)
  where kind = 'funding' and milestone_id is not null and status in ('pending', 'processing', 'succeeded');
