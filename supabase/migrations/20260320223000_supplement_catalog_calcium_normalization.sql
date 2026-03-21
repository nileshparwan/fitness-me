begin;

-- Ensure one canonical calcium entry is always available in catalog.
insert into public.supplement_catalog (name, brand, category, serving_label, nutrients, is_global, owner_user_id)
select
  'Calcium',
  null,
  'mineral',
  'mg',
  '{"calcium_mg":1}'::jsonb,
  true,
  null
where not exists (
  select 1
  from public.supplement_catalog
  where lower(name) = 'calcium'
    and is_global = true
);

-- Remove duplicate legacy calcium SKUs only when they are not referenced.
with legacy as (
  select id
  from public.supplement_catalog
  where is_global = true
    and name in ('Calcium 500mg', 'Calcium 1000mg')
),
referenced as (
  select distinct supplement_id as id
  from public.supplement_assignments
  where supplement_id in (select id from legacy)
  union
  select distinct supplement_id as id
  from public.supplement_logs
  where supplement_id in (select id from legacy)
)
delete from public.supplement_catalog c
where c.id in (
  select id
  from legacy
  except
  select id
  from referenced
);

commit;
