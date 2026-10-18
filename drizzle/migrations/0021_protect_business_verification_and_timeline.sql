-- C09-D29 (high): a member could set their own business_profiles.verification_status to 'verified'
-- through the API (owner UPDATE policy, no guard), bypassing staff KYB and auction-organiser eligibility.
create or replace function public.protect_business_verification()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    return new;
  end if;
  if new.verification_status is distinct from old.verification_status then
    raise exception 'Only Insight staff can verify a business.';
  end if;
  -- Changing the registered details of a verified business sends it back for review.
  if old.verification_status = 'verified' and (new.legal_name is distinct from old.legal_name
     or new.registration_number is distinct from old.registration_number or new.country is distinct from old.country
     or new.authorized_person is distinct from old.authorized_person or new.tax_number is distinct from old.tax_number) then
    new.verification_status := 'pending';
  end if;
  return new;
end; $$;

drop trigger if exists protect_business_verification on public.business_profiles;
create trigger protect_business_verification before insert or update on public.business_profiles
  for each row execute function public.protect_business_verification();

-- C09-D30 (medium): parties could add arbitrary entries to their own deal timeline, which is the record
-- Insight keeps. Timeline events are written only by server functions (service role).
drop policy if exists deal_events_insert_party on public.deal_events;
