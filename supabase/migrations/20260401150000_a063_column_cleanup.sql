begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'onboarding_completed'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'is_onboarding_completed'
  ) then
    alter table public.profiles
      rename column onboarding_completed to is_onboarding_completed;
  end if;
end $$;

drop policy if exists diary_items_select_subject_access on public.diary_items;
drop policy if exists diary_items_insert_subject_access on public.diary_items;
drop policy if exists diary_items_update_subject_access on public.diary_items;
drop policy if exists diary_items_delete_subject_access on public.diary_items;

alter table if exists public.diary_items
  drop column if exists created_by_user_id,
  drop column if exists created_by_client_id;

create policy diary_items_select_subject_access
on public.diary_items
for select
to authenticated
using (
  exists (
    select 1
    from public.diary_entries entry_row
    where entry_row.id = diary_items.meal_log_id
      and public.has_nutrition_subject_access(entry_row.subject_user_id, entry_row.subject_client_id)
      and (
        entry_row.nutrition_plan_id is null
        or public.can_access_nutrition_plan(entry_row.nutrition_plan_id)
      )
  )
  or public.is_sysadmin()
);

create policy diary_items_insert_subject_access
on public.diary_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.diary_entries entry_row
    where entry_row.id = diary_items.meal_log_id
      and public.has_nutrition_subject_access(entry_row.subject_user_id, entry_row.subject_client_id)
      and (
        entry_row.nutrition_plan_id is null
        or public.can_access_nutrition_plan(entry_row.nutrition_plan_id)
      )
  )
  or public.is_sysadmin()
);

create policy diary_items_update_subject_access
on public.diary_items
for update
to authenticated
using (
  exists (
    select 1
    from public.diary_entries entry_row
    where entry_row.id = diary_items.meal_log_id
      and public.has_nutrition_subject_access(entry_row.subject_user_id, entry_row.subject_client_id)
      and (
        entry_row.nutrition_plan_id is null
        or public.can_access_nutrition_plan(entry_row.nutrition_plan_id)
      )
  )
  or public.is_sysadmin()
)
with check (
  exists (
    select 1
    from public.diary_entries entry_row
    where entry_row.id = diary_items.meal_log_id
      and public.has_nutrition_subject_access(entry_row.subject_user_id, entry_row.subject_client_id)
      and (
        entry_row.nutrition_plan_id is null
        or public.can_access_nutrition_plan(entry_row.nutrition_plan_id)
      )
  )
  or public.is_sysadmin()
);

create policy diary_items_delete_subject_access
on public.diary_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.diary_entries entry_row
    where entry_row.id = diary_items.meal_log_id
      and public.has_nutrition_subject_access(entry_row.subject_user_id, entry_row.subject_client_id)
      and (
        entry_row.nutrition_plan_id is null
        or public.can_access_nutrition_plan(entry_row.nutrition_plan_id)
      )
  )
  or public.is_sysadmin()
);

drop policy if exists workouts_select_subject_or_coach on public.workouts;
drop policy if exists workout_sets_select_subject_or_coach on public.workout_sets;
drop policy if exists workout_cardio_select_subject_or_coach on public.workout_cardio;

create policy workouts_select_subject_or_coach
on public.workouts
for select
to authenticated
using (
  public.is_sysadmin()
  or created_by_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or (subject_client_id is not null and public.has_client_coach_access(subject_client_id))
);

create policy workout_sets_select_subject_or_coach
on public.workout_sets
for select
to authenticated
using (
  exists (
    select 1
    from public.workouts workout_row
    where workout_row.id = workout_sets.workout_id
      and (
        public.is_sysadmin()
        or workout_row.created_by_user_id = auth.uid()
        or workout_row.subject_user_id = auth.uid()
        or (
          workout_row.subject_client_id is not null
          and public.has_client_coach_access(workout_row.subject_client_id)
        )
      )
  )
);

create policy workout_cardio_select_subject_or_coach
on public.workout_cardio
for select
to authenticated
using (
  exists (
    select 1
    from public.workouts workout_row
    where workout_row.id = workout_cardio.workout_id
      and (
        public.is_sysadmin()
        or workout_row.created_by_user_id = auth.uid()
        or workout_row.subject_user_id = auth.uid()
        or (
          workout_row.subject_client_id is not null
          and public.has_client_coach_access(workout_row.subject_client_id)
        )
      )
  )
);

alter table if exists public.workouts
  drop column if exists user_id;

alter table if exists public.workout_cardio
  drop column if exists user_id;

commit;
