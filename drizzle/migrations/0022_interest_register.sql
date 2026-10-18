-- Row 11: interest register (founder, 15 Oct). Behind a feature flag that stays OFF until the GASTAT
-- position and the C05 PDPL wording are confirmed. No API policies: rows are written and read only by
-- server functions (service role); staff read through the console.
create table if not exists public.interest_register (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  company text check (company is null or char_length(company) <= 160),
  email text not null check (char_length(email) between 5 and 200),
  country text not null check (country in ('SA','BH','AE','KW','QA','OM','OTHER')),
  role text not null check (role in ('buyer','supplier','auction_organiser','contractor','other')),
  monthly_volume_band text check (monthly_volume_band in ('lt_10k','10k_50k','50k_250k','gt_250k')),
  notice_version text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);
-- Emails are stored lower-cased by the server, so a plain unique constraint supports upsert.
alter table public.interest_register add constraint interest_register_email_key unique (email);
alter table public.interest_register enable row level security;
