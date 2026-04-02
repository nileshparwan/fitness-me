begin;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('training_sessions', 'workouts'),
        ('strength_sets', 'workout_sets'),
        ('cardio_sessions', 'workout_cardio'),
        ('workout_executions', 'workout_logs'),
        ('workout_execution_exercises', 'workout_log_exercises'),
        ('training_plans', 'programs'),
        ('training_plan_items', 'program_workouts'),
        ('coach_plan_templates', 'program_templates'),
        ('coach_plan_template_sessions', 'program_template_workouts'),
        ('client_plan_assignments', 'program_assignments'),
        ('client_plan_assignment_sessions', 'program_assignment_workouts'),
        ('exercise_catalog', 'exercises'),
        ('exercise_prs', 'personal_records')
    ) as pairs(old_name, new_name)
  loop
    if to_regclass(format('public.%s', item.old_name)) is not null
       and to_regclass(format('public.%s', item.new_name)) is null then
      execute format('alter table public.%I rename to %I', item.old_name, item.new_name);
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('idx_workout_executions_subject_user_performed_on', 'idx_workout_logs_subject_user_performed_on'),
        ('idx_workout_executions_subject_client_performed_on', 'idx_workout_logs_subject_client_performed_on'),
        ('idx_workout_executions_template_performed_on', 'idx_workout_logs_template_workout_performed_on'),
        ('idx_workout_executions_actor_performed_on', 'idx_workout_logs_actor_performed_on'),
        ('idx_workout_executions_quick_log_dedupe', 'idx_workout_logs_quick_log_dedupe'),
        ('idx_workout_execution_exercises_unique', 'idx_workout_log_exercises_unique'),
        ('idx_workout_execution_exercises_execution', 'idx_workout_log_exercises_execution'),
        ('idx_workout_execution_exercises_exercise', 'idx_workout_log_exercises_exercise'),
        ('idx_training_sessions_subject_user_performed_on', 'idx_workouts_subject_user_performed_on'),
        ('idx_training_sessions_subject_client_performed_on', 'idx_workouts_subject_client_performed_on'),
        ('idx_training_sessions_plan_assignment_session', 'idx_workouts_program_assignment_workout'),
        ('idx_strength_sets_execution_exercise', 'idx_workout_sets_execution_exercise'),
        ('idx_cardio_sessions_execution_activity', 'idx_workout_cardio_execution_activity'),
        ('idx_exercise_prs_subject_user', 'idx_personal_records_subject_user'),
        ('idx_exercise_prs_subject_client', 'idx_personal_records_subject_client'),
        ('idx_exercise_prs_best_1rm', 'idx_personal_records_best_1rm')
    ) as pairs(old_name, new_name)
  loop
    if to_regclass(format('public.%s', item.old_name)) is not null
       and to_regclass(format('public.%s', item.new_name)) is null then
      execute format('alter index public.%I rename to %I', item.old_name, item.new_name);
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('workouts', 'training_sessions_insert_subject_or_coach', 'workouts_insert_subject_or_coach'),
        ('workouts', 'training_sessions_select_subject_or_coach', 'workouts_select_subject_or_coach'),
        ('workouts', 'training_sessions_update_subject_or_coach', 'workouts_update_subject_or_coach'),
        ('workouts', 'training_sessions_delete_subject_or_coach', 'workouts_delete_subject_or_coach'),
        ('workout_cardio', 'cardio_sessions_select_subject_or_coach', 'workout_cardio_select_subject_or_coach'),
        ('workout_cardio', 'cardio_sessions_write_subject_or_coach', 'workout_cardio_write_subject_or_coach'),
        ('workout_sets', 'strength_sets_select_subject_or_coach', 'workout_sets_select_subject_or_coach'),
        ('workout_sets', 'strength_sets_write_subject_or_coach', 'workout_sets_write_subject_or_coach'),
        ('workout_logs', 'workout_executions_insert_access', 'workout_logs_insert_access'),
        ('workout_logs', 'workout_executions_select_access', 'workout_logs_select_access'),
        ('workout_logs', 'workout_executions_delete_access', 'workout_logs_delete_access'),
        ('workout_log_exercises', 'workout_execution_exercises_write_access', 'workout_log_exercises_write_access'),
        ('workout_log_exercises', 'workout_execution_exercises_select_access', 'workout_log_exercises_select_access'),
        ('programs', 'training_plans_select_owner_or_admin', 'programs_select_owner_or_admin'),
        ('programs', 'training_plans_write_owner_or_admin', 'programs_write_owner_or_admin'),
        ('program_workouts', 'training_plan_items_select_owner_or_admin', 'program_workouts_select_owner_or_admin'),
        ('program_workouts', 'training_plan_items_write_owner_or_admin', 'program_workouts_write_owner_or_admin'),
        ('program_templates', 'coach_plan_templates_insert_owner_or_admin', 'program_templates_insert_owner_or_admin'),
        ('program_templates', 'coach_plan_templates_select_owner_or_admin', 'program_templates_select_owner_or_admin'),
        ('program_templates', 'coach_plan_templates_update_owner_or_admin', 'program_templates_update_owner_or_admin'),
        ('program_templates', 'coach_plan_templates_delete_owner_or_admin', 'program_templates_delete_owner_or_admin'),
        ('program_template_workouts', 'coach_plan_template_sessions_select_owner_or_admin', 'program_template_workouts_select_owner_or_admin'),
        ('program_template_workouts', 'coach_plan_template_sessions_write_owner_or_admin', 'program_template_workouts_write_owner_or_admin'),
        ('program_assignments', 'client_plan_assignments_select_access', 'program_assignments_select_access'),
        ('program_assignments', 'client_plan_assignments_write_access', 'program_assignments_write_access'),
        ('program_assignment_workouts', 'client_plan_assignment_sessions_select_access', 'program_assignment_workouts_select_access'),
        ('program_assignment_workouts', 'client_plan_assignment_sessions_write_access', 'program_assignment_workouts_write_access'),
        ('exercises', 'exercise_catalog_insert_authenticated', 'exercises_insert_authenticated'),
        ('exercises', 'exercise_catalog_select_all', 'exercises_select_all'),
        ('exercises', 'exercise_catalog_update_authenticated', 'exercises_update_authenticated'),
        ('exercises', 'exercise_catalog_delete_authenticated', 'exercises_delete_authenticated'),
        ('exercises', 'exercise_catalog_insert_owner_or_admin', 'exercises_insert_owner_or_admin'),
        ('exercises', 'exercise_catalog_update_owner_or_admin', 'exercises_update_owner_or_admin'),
        ('exercises', 'exercise_catalog_delete_owner_or_admin', 'exercises_delete_owner_or_admin'),
        ('personal_records', 'exercise_prs_select_access', 'personal_records_select_access'),
        ('personal_records', 'exercise_prs_write_access', 'personal_records_write_access')
    ) as pairs(table_name, old_name, new_name)
  loop
    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = item.table_name
        and policyname = item.old_name
    ) then
      execute format(
        'alter policy %I on public.%I rename to %I',
        item.old_name,
        item.table_name,
        item.new_name
      );
    end if;
  end loop;
end $$;

create or replace function public.sync_exercise_pr_from_strength_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_user_id uuid;
  v_subject_client_id uuid;
  v_performed_on date;
  v_est_1rm numeric;
  v_name text;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  v_name := trim(coalesce(new.exercise_name, ''));
  if v_name = '' then
    return new;
  end if;

  v_est_1rm := coalesce(
    new.calculated_1rm,
    case
      when coalesce(new.reps, 0) > 0 and coalesce(new.weight, 0) > 0
        then new.weight * (1 + (new.reps / 30.0))
      else null
    end
  );

  if v_est_1rm is null or v_est_1rm <= 0 then
    return new;
  end if;

  select w.subject_user_id, w.subject_client_id, w.performed_on
    into v_subject_user_id, v_subject_client_id, v_performed_on
  from public.workouts w
  where w.id = new.workout_id;

  if v_subject_user_id is null and v_subject_client_id is null then
    return new;
  end if;

  insert into public.personal_records (
    subject_user_id,
    subject_client_id,
    exercise_id,
    exercise_name,
    best_estimated_1rm_kg,
    best_weight_kg,
    best_reps,
    best_set_date,
    best_set_at,
    source_set_id,
    source_execution_id,
    created_at,
    updated_at
  )
  values (
    v_subject_user_id,
    v_subject_client_id,
    new.exercise_id,
    v_name,
    round(v_est_1rm::numeric, 2),
    new.weight,
    new.reps,
    v_performed_on,
    coalesce(new.created_at, now()),
    new.id,
    new.execution_id,
    now(),
    now()
  )
  on conflict (subject_key, exercise_key)
  do update set
    best_estimated_1rm_kg = case
      when excluded.best_estimated_1rm_kg > personal_records.best_estimated_1rm_kg
        then excluded.best_estimated_1rm_kg
      else personal_records.best_estimated_1rm_kg
    end,
    best_weight_kg = case
      when excluded.best_estimated_1rm_kg > personal_records.best_estimated_1rm_kg
        then excluded.best_weight_kg
      else personal_records.best_weight_kg
    end,
    best_reps = case
      when excluded.best_estimated_1rm_kg > personal_records.best_estimated_1rm_kg
        then excluded.best_reps
      else personal_records.best_reps
    end,
    best_set_date = case
      when excluded.best_estimated_1rm_kg > personal_records.best_estimated_1rm_kg
        then excluded.best_set_date
      else personal_records.best_set_date
    end,
    best_set_at = case
      when excluded.best_estimated_1rm_kg > personal_records.best_estimated_1rm_kg
        then excluded.best_set_at
      else personal_records.best_set_at
    end,
    source_set_id = case
      when excluded.best_estimated_1rm_kg > personal_records.best_estimated_1rm_kg
        then excluded.source_set_id
      else personal_records.source_set_id
    end,
    source_execution_id = case
      when excluded.best_estimated_1rm_kg > personal_records.best_estimated_1rm_kg
        then excluded.source_execution_id
      else personal_records.source_execution_id
    end,
    updated_at = now();

  return new;
end;
$$;

commit;
