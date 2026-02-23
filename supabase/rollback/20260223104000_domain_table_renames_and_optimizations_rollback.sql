begin;

-- Drop check constraints added by the forward migration.
do $$
begin
  if to_regclass('public.training_sessions') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.training_sessions'::regclass
      and conname = 'training_sessions_duration_non_negative'
  ) then
    alter table public.training_sessions
      drop constraint training_sessions_duration_non_negative;
  end if;

  if to_regclass('public.workouts') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.workouts'::regclass
      and conname = 'training_sessions_duration_non_negative'
  ) then
    alter table public.workouts
      drop constraint training_sessions_duration_non_negative;
  end if;

  if to_regclass('public.strength_sets') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.strength_sets'::regclass
      and conname = 'strength_sets_non_negative_values'
  ) then
    alter table public.strength_sets
      drop constraint strength_sets_non_negative_values;
  end if;

  if to_regclass('public.workout_logs') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.workout_logs'::regclass
      and conname = 'strength_sets_non_negative_values'
  ) then
    alter table public.workout_logs
      drop constraint strength_sets_non_negative_values;
  end if;

  if to_regclass('public.cardio_sessions') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.cardio_sessions'::regclass
      and conname = 'cardio_sessions_non_negative_values'
  ) then
    alter table public.cardio_sessions
      drop constraint cardio_sessions_non_negative_values;
  end if;

  if to_regclass('public.cardio_logs') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.cardio_logs'::regclass
      and conname = 'cardio_sessions_non_negative_values'
  ) then
    alter table public.cardio_logs
      drop constraint cardio_sessions_non_negative_values;
  end if;

  if to_regclass('public.meal_plan_meals') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.meal_plan_meals'::regclass
      and conname = 'meal_plan_meals_non_negative_macros'
  ) then
    alter table public.meal_plan_meals
      drop constraint meal_plan_meals_non_negative_macros;
  end if;

  if to_regclass('public.nutrition_meals') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.nutrition_meals'::regclass
      and conname = 'meal_plan_meals_non_negative_macros'
  ) then
    alter table public.nutrition_meals
      drop constraint meal_plan_meals_non_negative_macros;
  end if;

  if to_regclass('public.fitness_goals') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.fitness_goals'::regclass
      and conname = 'fitness_goals_valid_targets'
  ) then
    alter table public.fitness_goals
      drop constraint fitness_goals_valid_targets;
  end if;

  if to_regclass('public.goals') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.goals'::regclass
      and conname = 'fitness_goals_valid_targets'
  ) then
    alter table public.goals
      drop constraint fitness_goals_valid_targets;
  end if;

  if to_regclass('public.body_measurements') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.body_measurements'::regclass
      and conname = 'body_measurements_non_negative_values'
  ) then
    alter table public.body_measurements
      drop constraint body_measurements_non_negative_values;
  end if;

  if to_regclass('public.body_metrics') is not null and exists (
    select 1 from pg_constraint
    where conrelid = 'public.body_metrics'::regclass
      and conname = 'body_measurements_non_negative_values'
  ) then
    alter table public.body_metrics
      drop constraint body_measurements_non_negative_values;
  end if;
end
$$;

-- Drop indexes added by the forward migration.
drop index if exists public.idx_training_sessions_user_date;
drop index if exists public.idx_training_sessions_status;
drop index if exists public.idx_strength_sets_workout_exercise;
drop index if exists public.idx_strength_sets_exercise_created;
drop index if exists public.idx_cardio_sessions_user_date;
drop index if exists public.idx_cardio_sessions_workout_date;
drop index if exists public.idx_training_plan_items_program_order;
drop index if exists public.idx_training_plan_items_workout;
drop index if exists public.idx_meal_plans_user_dates;
drop index if exists public.idx_meal_plan_meals_program_position;
drop index if exists public.idx_fitness_goals_user;
drop index if exists public.idx_body_measurements_user_date;
drop index if exists public.idx_exercise_catalog_name;

-- Rename FK constraints back to original names (only if they exist).
do $$
begin
  if to_regclass('public.cardio_sessions') is not null
    and exists (
      select 1 from pg_constraint
      where conrelid = 'public.cardio_sessions'::regclass
        and conname = 'cardio_sessions_workout_id_fkey'
    )
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.cardio_sessions'::regclass
        and conname = 'cardio_logs_workout_id_fkey'
    )
  then
    alter table public.cardio_sessions
      rename constraint cardio_sessions_workout_id_fkey to cardio_logs_workout_id_fkey;
  end if;

  if to_regclass('public.strength_sets') is not null
    and exists (
      select 1 from pg_constraint
      where conrelid = 'public.strength_sets'::regclass
        and conname = 'strength_sets_exercise_id_fkey'
    )
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.strength_sets'::regclass
        and conname = 'workout_logs_exercise_id_fkey'
    )
  then
    alter table public.strength_sets
      rename constraint strength_sets_exercise_id_fkey to workout_logs_exercise_id_fkey;
  end if;

  if to_regclass('public.strength_sets') is not null
    and exists (
      select 1 from pg_constraint
      where conrelid = 'public.strength_sets'::regclass
        and conname = 'strength_sets_workout_id_fkey'
    )
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.strength_sets'::regclass
        and conname = 'workout_logs_workout_id_fkey'
    )
  then
    alter table public.strength_sets
      rename constraint strength_sets_workout_id_fkey to workout_logs_workout_id_fkey;
  end if;

  if to_regclass('public.meal_plan_meals') is not null
    and exists (
      select 1 from pg_constraint
      where conrelid = 'public.meal_plan_meals'::regclass
        and conname = 'meal_plan_meals_program_id_fkey'
    )
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.meal_plan_meals'::regclass
        and conname = 'nutrition_meals_program_id_fkey'
    )
  then
    alter table public.meal_plan_meals
      rename constraint meal_plan_meals_program_id_fkey to nutrition_meals_program_id_fkey;
  end if;

  if to_regclass('public.training_plan_items') is not null
    and exists (
      select 1 from pg_constraint
      where conrelid = 'public.training_plan_items'::regclass
        and conname = 'training_plan_items_program_id_fkey'
    )
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.training_plan_items'::regclass
        and conname = 'program_items_program_id_fkey'
    )
  then
    alter table public.training_plan_items
      rename constraint training_plan_items_program_id_fkey to program_items_program_id_fkey;
  end if;

  if to_regclass('public.training_plan_items') is not null
    and exists (
      select 1 from pg_constraint
      where conrelid = 'public.training_plan_items'::regclass
        and conname = 'training_plan_items_workout_id_fkey'
    )
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.training_plan_items'::regclass
        and conname = 'program_items_workout_id_fkey'
    )
  then
    alter table public.training_plan_items
      rename constraint training_plan_items_workout_id_fkey to program_items_workout_id_fkey;
  end if;
end
$$;

-- Rename tables back to original names.
do $$
begin
  if to_regclass('public.training_plan_items') is not null and to_regclass('public.program_items') is null then
    alter table public.training_plan_items rename to program_items;
  end if;

  if to_regclass('public.training_plans') is not null and to_regclass('public.programs') is null then
    alter table public.training_plans rename to programs;
  end if;

  if to_regclass('public.meal_plan_meals') is not null and to_regclass('public.nutrition_meals') is null then
    alter table public.meal_plan_meals rename to nutrition_meals;
  end if;

  if to_regclass('public.meal_plans') is not null and to_regclass('public.nutrition_programs') is null then
    alter table public.meal_plans rename to nutrition_programs;
  end if;

  if to_regclass('public.strength_sets') is not null and to_regclass('public.workout_logs') is null then
    alter table public.strength_sets rename to workout_logs;
  end if;

  if to_regclass('public.cardio_sessions') is not null and to_regclass('public.cardio_logs') is null then
    alter table public.cardio_sessions rename to cardio_logs;
  end if;

  if to_regclass('public.training_sessions') is not null and to_regclass('public.workouts') is null then
    alter table public.training_sessions rename to workouts;
  end if;

  if to_regclass('public.fitness_goals') is not null and to_regclass('public.goals') is null then
    alter table public.fitness_goals rename to goals;
  end if;

  if to_regclass('public.body_measurements') is not null and to_regclass('public.body_metrics') is null then
    alter table public.body_measurements rename to body_metrics;
  end if;

  if to_regclass('public.exercise_catalog') is not null and to_regclass('public.exercise_library') is null then
    alter table public.exercise_catalog rename to exercise_library;
  end if;
end
$$;

commit;
