alter table if exists public.profiles
  add column if not exists default_nutrition_plan_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_default_nutrition_plan_id_fkey'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.profiles
      add constraint profiles_default_nutrition_plan_id_fkey
      foreign key (default_nutrition_plan_id)
      references public.nutrition_plans (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_profiles_default_nutrition_plan_id
  on public.profiles (default_nutrition_plan_id)
  where default_nutrition_plan_id is not null;
