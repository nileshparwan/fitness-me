create table if not exists public.supplement_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  brand text,
  category text not null,
  categories text[] not null default array['other']::text[],
  serving_label text not null,
  nutrients jsonb not null default '{}'::jsonb,
  is_global boolean not null default false,
  owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint supplement_catalog_category_check
    check (category in ('vitamin', 'mineral', 'omega', 'protein', 'electrolyte', 'herbal', 'other')),
  constraint supplement_catalog_categories_check
    check (
      cardinality(categories) > 0 and
      categories <@ array['vitamin', 'mineral', 'omega', 'protein', 'electrolyte', 'herbal', 'other']::text[]
    ),
  constraint supplement_catalog_scope_check
    check (
      (is_global = true and owner_user_id is null) or
      (is_global = false and owner_user_id is not null)
    )
);

create index if not exists idx_supplement_catalog_global
  on public.supplement_catalog (is_global, category);

create index if not exists idx_supplement_catalog_owner
  on public.supplement_catalog (owner_user_id)
  where owner_user_id is not null;

create index if not exists idx_supplement_catalog_categories
  on public.supplement_catalog
  using gin (categories);

alter table public.supplement_catalog enable row level security;

drop policy if exists supplement_catalog_select_global_or_owner on public.supplement_catalog;
create policy supplement_catalog_select_global_or_owner
on public.supplement_catalog
for select
to authenticated
using (
  is_global = true
  or owner_user_id = auth.uid()
  or public.is_sysadmin()
);

drop policy if exists supplement_catalog_insert_owner on public.supplement_catalog;
create policy supplement_catalog_insert_owner
on public.supplement_catalog
for insert
to authenticated
with check (
  (
    owner_user_id = auth.uid()
    and coalesce(is_global, false) = false
  )
  or public.is_sysadmin()
);

drop policy if exists supplement_catalog_update_owner on public.supplement_catalog;
create policy supplement_catalog_update_owner
on public.supplement_catalog
for update
to authenticated
using (
  (owner_user_id = auth.uid() and is_global = false)
  or public.is_sysadmin()
)
with check (
  (
    owner_user_id = auth.uid()
    and coalesce(is_global, false) = false
  )
  or public.is_sysadmin()
);

drop policy if exists supplement_catalog_delete_owner on public.supplement_catalog;
create policy supplement_catalog_delete_owner
on public.supplement_catalog
for delete
to authenticated
using (
  (owner_user_id = auth.uid() and is_global = false)
  or public.is_sysadmin()
);

insert into public.supplement_catalog (name, brand, category, categories, serving_label, nutrients, is_global, owner_user_id)
values
  -- Vitamins and minerals
  ('Vitamin D3', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_d_iu":2000}'::jsonb, true, null),
  ('Vitamin C', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_c_mg":500}'::jsonb, true, null),
  ('Vitamin B12', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_b12_mcg":1000}'::jsonb, true, null),
  ('Vitamin K2', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_k2_mcg":100}'::jsonb, true, null),
  ('Folate', null, 'vitamin', array['vitamin']::text[], 'unit', '{"folate_mcg":400}'::jsonb, true, null),
  ('Vitamin A', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_a_mcg":800}'::jsonb, true, null),
  ('Vitamin E', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_e_mg":134}'::jsonb, true, null),
  ('Magnesium', null, 'mineral', array['mineral']::text[], 'unit', '{"magnesium_mg":400}'::jsonb, true, null),
  ('Magnesium Glycinate', null, 'mineral', array['mineral']::text[], 'unit', '{"magnesium_mg":400}'::jsonb, true, null),
  ('Zinc', null, 'mineral', array['mineral']::text[], 'unit', '{"zinc_mg":25}'::jsonb, true, null),
  ('Iron', null, 'mineral', array['mineral']::text[], 'unit', '{"iron_mg":18}'::jsonb, true, null),
  ('Calcium', null, 'mineral', array['mineral']::text[], 'unit', '{"calcium_mg":1000}'::jsonb, true, null),
  ('Potassium', null, 'mineral', array['mineral', 'electrolyte']::text[], 'unit', '{"potassium_mg":99}'::jsonb, true, null),
  ('Selenium', null, 'mineral', array['mineral']::text[], 'unit', '{"selenium_mcg":200}'::jsonb, true, null),

  -- Performance and hydration
  ('Omega-3 Fish Oil', null, 'omega', array['omega']::text[], 'unit', '{"omega3_g":1}'::jsonb, true, null),
  ('Multivitamin', null, 'vitamin', array['vitamin', 'mineral']::text[], 'unit', '{"vitamin_d_iu":400,"vitamin_c_mg":60,"vitamin_b12_mcg":6,"folate_mcg":400,"iron_mg":18,"zinc_mg":11,"magnesium_mg":100,"calcium_mg":200}'::jsonb, true, null),
  ('Electrolyte Tablet', null, 'electrolyte', array['electrolyte', 'mineral']::text[], 'unit', '{"sodium_mg":200,"potassium_mg":150,"magnesium_mg":25}'::jsonb, true, null),
  ('Electrolyte Powder', null, 'electrolyte', array['electrolyte', 'mineral']::text[], 'unit', '{"sodium_mg":500,"potassium_mg":250,"magnesium_mg":50}'::jsonb, true, null),
  ('Creatine Monohydrate', null, 'protein', array['protein']::text[], 'unit', '{"creatine_g":5}'::jsonb, true, null),
  ('Whey Protein', null, 'protein', array['protein']::text[], 'unit', '{"protein_g":25}'::jsonb, true, null),
  ('Casein Protein', null, 'protein', array['protein']::text[], 'unit', '{"protein_g":24}'::jsonb, true, null),
  ('Collagen Peptides', null, 'protein', array['protein']::text[], 'unit', '{"collagen_g":10}'::jsonb, true, null),
  ('Ashwagandha', null, 'herbal', array['herbal']::text[], 'unit', '{"ashwagandha_mg":600}'::jsonb, true, null)
on conflict (name) do nothing;
