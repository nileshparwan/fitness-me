begin;

alter table public.supplement_catalog
  add column if not exists categories text[];

update public.supplement_catalog
set categories = array[category]
where categories is null or cardinality(categories) = 0;

update public.supplement_catalog
set categories = (
  select array_agg(distinct category_value)
  from unnest(categories) as category_value
  where category_value = any (array['vitamin', 'mineral', 'omega', 'protein', 'electrolyte', 'herbal', 'other']::text[])
)
where categories is not null;

update public.supplement_catalog
set categories = array[coalesce(category, 'other')]
where categories is null or cardinality(categories) = 0;

alter table public.supplement_catalog
  drop constraint if exists supplement_catalog_categories_check;

alter table public.supplement_catalog
  add constraint supplement_catalog_categories_check
  check (
    cardinality(categories) > 0 and
    categories <@ array['vitamin', 'mineral', 'omega', 'protein', 'electrolyte', 'herbal', 'other']::text[]
  );

create index if not exists idx_supplement_catalog_categories
  on public.supplement_catalog
  using gin (categories);

-- Ensure canonical base entries exist for frequent seed duplicates.
insert into public.supplement_catalog (name, brand, category, categories, serving_label, nutrients, is_global, owner_user_id)
values
  ('Calcium', null, 'mineral', array['mineral']::text[], 'unit', '{"calcium_mg":1000}'::jsonb, true, null),
  ('Vitamin D3', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_d_iu":2000}'::jsonb, true, null),
  ('Vitamin C', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_c_mg":500}'::jsonb, true, null),
  ('Vitamin B12', null, 'vitamin', array['vitamin']::text[], 'unit', '{"vitamin_b12_mcg":1000}'::jsonb, true, null),
  ('Omega-3 Fish Oil', null, 'omega', array['omega']::text[], 'unit', '{"omega3_g":1}'::jsonb, true, null),
  ('Creatine Monohydrate', null, 'protein', array['protein']::text[], 'unit', '{"creatine_g":5}'::jsonb, true, null)
on conflict (name, is_global) do nothing;

with ranked as (
  select
    sc.id,
    row_number() over (
      partition by lower(
        regexp_replace(
          regexp_replace(sc.name, '\s*\((?:[^)]*\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu)[^)]*)\)\s*$', '', 'i'),
          '\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu)\s*$',
          '',
          'i'
        )
      )
      order by
        case when sc.name ~* '\d+(?:\.\d+)?\s*(mg|mcg|g|iu)' then 1 else 0 end,
        length(sc.name),
        sc.id
    ) as rn
  from public.supplement_catalog sc
  where sc.is_global = true
),
deletable as (
  select r.id
  from ranked r
  left join public.supplement_assignments sa on sa.supplement_id = r.id
  left join public.supplement_logs sl on sl.supplement_id = r.id
  where r.rn > 1
    and sa.id is null
    and sl.id is null
)
delete from public.supplement_catalog sc
where sc.id in (select id from deletable);

commit;
