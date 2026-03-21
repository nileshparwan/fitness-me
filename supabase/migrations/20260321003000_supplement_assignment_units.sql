begin;

alter table public.supplement_assignments
  add column if not exists unit text;

update public.supplement_assignments
set unit = null
where unit is not null and btrim(unit) = '';

alter table public.supplement_assignments
  drop constraint if exists supplement_assignments_unit_check;

alter table public.supplement_assignments
  add constraint supplement_assignments_unit_check
  check (
    unit is null
    or unit in (
      'unit',
      'serving',
      'scoop',
      'capsule',
      'tablet',
      'softgel',
      'packet',
      'sachet',
      'drop',
      'spray',
      'piece',
      'tsp',
      'tbsp',
      'ml',
      'l',
      'fl_oz',
      'oz',
      'g',
      'mg',
      'mcg',
      'iu'
    )
  );

commit;
