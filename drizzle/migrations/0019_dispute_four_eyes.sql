-- CL-10 / C05 v0.2 §7: a dispute decision is proposed by one staff member and applied only when a
-- second, different staff member approves the same outcome. The proposal is recorded on the dispute.
alter table public.disputes
  add column if not exists proposed_outcome text,
  add column if not exists proposed_buyer_percent numeric,
  add column if not exists proposed_note text,
  add column if not exists proposed_by uuid references auth.users(id),
  add column if not exists proposed_at timestamptz;
