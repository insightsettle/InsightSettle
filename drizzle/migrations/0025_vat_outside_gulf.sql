-- Founder direction (18 Oct): trade runs across the Gulf and from the Gulf to suppliers anywhere in the world (usually in USD).
-- A supplier outside the GCC pays no VAT on its share of the Insight fee (provisional, as for QA and KW; C05 D-49 to confirm
-- with the tax adviser once the entity's base is fixed). Without this row the fee calculator fell back to 15%.
insert into public.vat_rates (country_code, rate) values ('OTHER', 0)
on conflict (country_code) do update set rate = excluded.rate;
