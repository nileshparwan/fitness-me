begin;

create table if not exists public.supplement_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  categories text[] not null default array['other']::text[],
  is_global boolean not null default false,
  owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint supplement_catalog_categories_check
    check (
      cardinality(categories) > 0
      and categories <@ array['vitamin', 'mineral', 'omega', 'protein', 'electrolyte', 'herbal', 'other']::text[]
    ),
  constraint supplement_catalog_scope_check
    check (
      (is_global = true and owner_user_id is null)
      or (is_global = false and owner_user_id is not null)
    )
);

create unique index if not exists uq_supplement_catalog_name_scope
  on public.supplement_catalog (name, is_global);

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

drop policy if exists supplement_catalog_update_visible on public.supplement_catalog;
drop policy if exists supplement_catalog_update_owner on public.supplement_catalog;
create policy supplement_catalog_update_visible
on public.supplement_catalog
for update
to authenticated
using (
  is_global = true
  or owner_user_id = auth.uid()
  or public.is_sysadmin()
)
with check (
  (
    is_global = true
    and owner_user_id is null
  )
  or (
    is_global = false
    and owner_user_id = auth.uid()
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

create table if not exists public.supplement_subject_profiles (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  title text,
  workout_program text,
  nutrition_program text,
  status text not null default 'active',
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplement_subject_profiles_subject_check
    check (
      (subject_user_id is not null and subject_client_id is null)
      or (subject_user_id is null and subject_client_id is not null)
    ),
  constraint supplement_subject_profiles_status_check
    check (status in ('active', 'inactive', 'archived', 'completed'))
);

create index if not exists idx_supplement_subject_profiles_updated
  on public.supplement_subject_profiles (updated_at desc);

create index if not exists idx_supplement_subject_profiles_user_updated
  on public.supplement_subject_profiles (subject_user_id, updated_at desc)
  where subject_user_id is not null;

create index if not exists idx_supplement_subject_profiles_client_updated
  on public.supplement_subject_profiles (subject_client_id, updated_at desc)
  where subject_client_id is not null;

drop trigger if exists trg_supplement_subject_profiles_set_updated_at on public.supplement_subject_profiles;
create trigger trg_supplement_subject_profiles_set_updated_at
before update on public.supplement_subject_profiles
for each row execute function public.trigger_set_updated_at();

alter table public.supplement_subject_profiles enable row level security;

drop policy if exists supplement_subject_profiles_select_subject_access on public.supplement_subject_profiles;
create policy supplement_subject_profiles_select_subject_access
on public.supplement_subject_profiles
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

drop policy if exists supplement_subject_profiles_insert_subject_access on public.supplement_subject_profiles;
create policy supplement_subject_profiles_insert_subject_access
on public.supplement_subject_profiles
for insert
to authenticated
with check (
  (updated_by = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

drop policy if exists supplement_subject_profiles_update_subject_access on public.supplement_subject_profiles;
create policy supplement_subject_profiles_update_subject_access
on public.supplement_subject_profiles
for update
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
)
with check (
  (updated_by = auth.uid() or public.is_sysadmin())
  and (public.has_nutrition_subject_access(subject_user_id, subject_client_id) or public.is_sysadmin())
);

drop policy if exists supplement_subject_profiles_delete_subject_access on public.supplement_subject_profiles;
create policy supplement_subject_profiles_delete_subject_access
on public.supplement_subject_profiles
for delete
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

create table if not exists public.supplement_assignments (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references auth.users(id) on delete cascade,
  subject_client_id uuid references public.clients(id) on delete cascade,
  subject_profile_id uuid not null references public.supplement_subject_profiles(id) on delete cascade,
  supplement_id uuid not null references public.supplement_catalog(id),
  default_servings numeric not null default 1,
  unit text,
  is_active boolean not null default true,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplement_assignments_subject_check
    check (
      (subject_user_id is not null and subject_client_id is null)
      or (subject_user_id is null and subject_client_id is not null)
    ),
  constraint supplement_assignments_default_servings_check
    check (default_servings > 0),
  constraint supplement_assignments_unit_check
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
    ),
  constraint supplement_assignments_profile_supplement_unique
    unique (subject_profile_id, supplement_id)
    deferrable initially deferred
);

create index if not exists idx_supplement_assignments_user
  on public.supplement_assignments (subject_user_id, is_active)
  where subject_user_id is not null;

create index if not exists idx_supplement_assignments_client
  on public.supplement_assignments (subject_client_id, is_active)
  where subject_client_id is not null;

create index if not exists idx_supplement_assignments_supplement
  on public.supplement_assignments (supplement_id, is_active);

create index if not exists idx_supplement_assignments_subject_profile
  on public.supplement_assignments (subject_profile_id, is_active);

drop trigger if exists trg_supplement_assignments_set_updated_at on public.supplement_assignments;
create trigger trg_supplement_assignments_set_updated_at
before update on public.supplement_assignments
for each row execute function public.trigger_set_updated_at();

alter table public.supplement_assignments enable row level security;

drop policy if exists supplement_assignments_select_subject_access on public.supplement_assignments;
create policy supplement_assignments_select_subject_access
on public.supplement_assignments
for select
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

drop policy if exists supplement_assignments_insert_subject_access on public.supplement_assignments;
create policy supplement_assignments_insert_subject_access
on public.supplement_assignments
for insert
to authenticated
with check (
  (assigned_by = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
);

drop policy if exists supplement_assignments_update_subject_access on public.supplement_assignments;
create policy supplement_assignments_update_subject_access
on public.supplement_assignments
for update
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
)
with check (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

drop policy if exists supplement_assignments_delete_subject_access on public.supplement_assignments;
create policy supplement_assignments_delete_subject_access
on public.supplement_assignments
for delete
to authenticated
using (
  public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  or public.is_sysadmin()
);

insert into public.supplement_catalog (name, categories, is_global, owner_user_id)
values
  ('Vitamin D3', array['vitamin']::text[], true, null),
  ('Vitamin C', array['vitamin']::text[], true, null),
  ('Vitamin B12', array['vitamin']::text[], true, null),
  ('Vitamin K2', array['vitamin']::text[], true, null),
  ('Folate', array['vitamin']::text[], true, null),
  ('Vitamin A', array['vitamin']::text[], true, null),
  ('Vitamin E', array['vitamin']::text[], true, null),
  ('Magnesium', array['mineral']::text[], true, null),
  ('Magnesium Glycinate', array['mineral']::text[], true, null),
  ('Zinc', array['mineral']::text[], true, null),
  ('Iron', array['mineral']::text[], true, null),
  ('Calcium', array['mineral']::text[], true, null),
  ('Potassium', array['mineral', 'electrolyte']::text[], true, null),
  ('Selenium', array['mineral']::text[], true, null),
  ('Omega-3 Fish Oil', array['omega']::text[], true, null),
  ('Multivitamin', array['vitamin', 'mineral']::text[], true, null),
  ('Electrolyte Tablet', array['electrolyte', 'mineral']::text[], true, null),
  ('Electrolyte Powder', array['electrolyte', 'mineral']::text[], true, null),
  ('Creatine Monohydrate', array['protein']::text[], true, null),
  ('Whey Protein', array['protein']::text[], true, null),
  ('Casein Protein', array['protein']::text[], true, null),
  ('Collagen Peptides', array['protein']::text[], true, null),
  ('Ashwagandha', array['herbal']::text[], true, null)
on conflict (name, is_global) do nothing;

drop table if exists public.supplement_logs cascade;

commit;
