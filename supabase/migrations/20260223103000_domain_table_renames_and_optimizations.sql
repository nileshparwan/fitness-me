begin;

-- Table renames to use consistent fitness-domain naming.
do $$
begin
  if to_regclass('public.workout_logs') is not null and to_regclass('public.strength_sets') is null then
    alter table public.workout_logs rename to strength_sets;
  end if;

  if to_regclass('public.cardio_logs') is not null and to_regclass('public.cardio_sessions') is null then
    alter table public.cardio_logs rename to cardio_sessions;
  end if;

  if to_regclass('public.workouts') is not null and to_regclass('public.training_sessions') is null then
    alter table public.workouts rename to training_sessions;
  end if;

  if to_regclass('public.program_items') is not null and to_regclass('public.training_plan_items') is null then
    alter table public.program_items rename to training_plan_items;
  end if;

  if to_regclass('public.programs') is not null and to_regclass('public.training_plans') is null then
    alter table public.programs rename to training_plans;
  end if;

  if to_regclass('public.nutrition_meals') is not null and to_regclass('public.meal_plan_meals') is null then
    alter table public.nutrition_meals rename to meal_plan_meals;
  end if;

  if to_regclass('public.nutrition_programs') is not null and to_regclass('public.meal_plans') is null then
    alter table public.nutrition_programs rename to meal_plans;
  end if;

  if to_regclass('public.goals') is not null and to_regclass('public.fitness_goals') is null then
    alter table public.goals rename to fitness_goals;
  end if;

  if to_regclass('public.body_metrics') is not null and to_regclass('public.body_measurements') is null then
    alter table public.body_metrics rename to body_measurements;
  end if;

  if to_regclass('public.exercise_library') is not null and to_regclass('public.exercise_catalog') is null then
    alter table public.exercise_library rename to exercise_catalog;
  end if;
end
$$;

-- Constraint renames to keep naming coherent after table renames.
do $$
begin
  if to_regclass('public.cardio_sessions') is not null
    and exists (
      select 1
      from pg_constraint
      where conrelid = 'public.cardio_sessions'::regclass
        and conname = 'cardio_logs_workout_id_fkey'
    )
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.cardio_sessions'::regclass
        and conname = 'cardio_sessions_workout_id_fkey'
    )
  then
    alter table public.cardio_sessions
      rename constraint cardio_logs_workout_id_fkey to cardio_sessions_workout_id_fkey;
  end if;

  if to_regclass('public.strength_sets') is not null
    and exists (
      select 1
      from pg_constraint
      where conrelid = 'public.strength_sets'::regclass
        and conname = 'workout_logs_exercise_id_fkey'
    )
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.strength_sets'::regclass
        and conname = 'strength_sets_exercise_id_fkey'
    )
  then
    alter table public.strength_sets
      rename constraint workout_logs_exercise_id_fkey to strength_sets_exercise_id_fkey;
  end if;

  if to_regclass('public.strength_sets') is not null
    and exists (
      select 1
      from pg_constraint
      where conrelid = 'public.strength_sets'::regclass
        and conname = 'workout_logs_workout_id_fkey'
    )
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.strength_sets'::regclass
        and conname = 'strength_sets_workout_id_fkey'
    )
  then
    alter table public.strength_sets
      rename constraint workout_logs_workout_id_fkey to strength_sets_workout_id_fkey;
  end if;

  if to_regclass('public.meal_plan_meals') is not null
    and exists (
      select 1
      from pg_constraint
      where conrelid = 'public.meal_plan_meals'::regclass
        and conname = 'nutrition_meals_program_id_fkey'
    )
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.meal_plan_meals'::regclass
        and conname = 'meal_plan_meals_program_id_fkey'
    )
  then
    alter table public.meal_plan_meals
      rename constraint nutrition_meals_program_id_fkey to meal_plan_meals_program_id_fkey;
  end if;

  if to_regclass('public.training_plan_items') is not null
    and exists (
      select 1
      from pg_constraint
      where conrelid = 'public.training_plan_items'::regclass
        and conname = 'program_items_program_id_fkey'
    )
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.training_plan_items'::regclass
        and conname = 'training_plan_items_program_id_fkey'
    )
  then
    alter table public.training_plan_items
      rename constraint program_items_program_id_fkey to training_plan_items_program_id_fkey;
  end if;

  if to_regclass('public.training_plan_items') is not null
    and exists (
      select 1
      from pg_constraint
      where conrelid = 'public.training_plan_items'::regclass
        and conname = 'program_items_workout_id_fkey'
    )
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.training_plan_items'::regclass
        and conname = 'training_plan_items_workout_id_fkey'
    )
  then
    alter table public.training_plan_items
      rename constraint program_items_workout_id_fkey to training_plan_items_workout_id_fkey;
  end if;
end
$$;

-- Performance indexes for high-frequency app access patterns.
create index if not exists idx_training_sessions_user_date
  on public.training_sessions (user_id, date desc);

create index if not exists idx_training_sessions_status
  on public.training_sessions (status)
  where status is not null;

create index if not exists idx_strength_sets_workout_exercise
  on public.strength_sets (workout_id, exercise_id);

create index if not exists idx_strength_sets_exercise_created
  on public.strength_sets (exercise_id, created_at desc);

create index if not exists idx_cardio_sessions_user_date
  on public.cardio_sessions (user_id, date desc);

create index if not exists idx_cardio_sessions_workout_date
  on public.cardio_sessions (workout_id, date desc);

create index if not exists idx_training_plan_items_program_order
  on public.training_plan_items (program_id, order_index);

create index if not exists idx_training_plan_items_workout
  on public.training_plan_items (workout_id);

create index if not exists idx_meal_plans_user_dates
  on public.meal_plans (user_id, start_date, end_date);

create index if not exists idx_meal_plan_meals_program_position
  on public.meal_plan_meals (program_id, position);

create index if not exists idx_fitness_goals_user
  on public.fitness_goals (user_id);

create index if not exists idx_body_measurements_user_date
  on public.body_measurements (user_id, date desc);

create index if not exists idx_exercise_catalog_name
  on public.exercise_catalog (name);

-- Data-quality checks for fitness calculations.
do $$
begin
  if to_regclass('public.training_sessions') is not null and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.training_sessions'::regclass
      and conname = 'training_sessions_duration_non_negative'
  ) then
    alter table public.training_sessions
      add constraint training_sessions_duration_non_negative
      check (duration_minutes is null or duration_minutes >= 0);
  end if;

  if to_regclass('public.strength_sets') is not null and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.strength_sets'::regclass
      and conname = 'strength_sets_non_negative_values'
  ) then
    alter table public.strength_sets
      add constraint strength_sets_non_negative_values check (
        set_number > 0
        and (reps is null or reps >= 0)
        and (weight is null or weight >= 0)
        and (rest_seconds is null or rest_seconds >= 0)
        and (calculated_1rm is null or calculated_1rm >= 0)
      );
  end if;

  if to_regclass('public.cardio_sessions') is not null and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.cardio_sessions'::regclass
      and conname = 'cardio_sessions_non_negative_values'
  ) then
    alter table public.cardio_sessions
      add constraint cardio_sessions_non_negative_values check (
        duration_minutes > 0
        and (distance_km is null or distance_km >= 0)
        and (calories_burned is null or calories_burned >= 0)
        and (average_heart_rate is null or average_heart_rate >= 0)
        and (max_heart_rate is null or max_heart_rate >= 0)
        and (elevation_gain_m is null or elevation_gain_m >= 0)
        and (reps is null or reps >= 0)
      );
  end if;

  if to_regclass('public.meal_plan_meals') is not null and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.meal_plan_meals'::regclass
      and conname = 'meal_plan_meals_non_negative_macros'
  ) then
    alter table public.meal_plan_meals
      add constraint meal_plan_meals_non_negative_macros check (
        (calories is null or calories >= 0)
        and (protein_g is null or protein_g >= 0)
        and (carbs_g is null or carbs_g >= 0)
        and (fats_g is null or fats_g >= 0)
      );
  end if;

  if to_regclass('public.fitness_goals') is not null and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.fitness_goals'::regclass
      and conname = 'fitness_goals_valid_targets'
  ) then
    alter table public.fitness_goals
      add constraint fitness_goals_valid_targets check (
        (daily_calories is null or daily_calories > 0)
        and (protein_target is null or protein_target >= 0)
        and (carbs_target is null or carbs_target >= 0)
        and (fat_target is null or fat_target >= 0)
        and (weekly_workouts is null or (weekly_workouts >= 0 and weekly_workouts <= 21))
      );
  end if;

  if to_regclass('public.body_measurements') is not null and not exists (
    select 1 from pg_constraint
    where conrelid = 'public.body_measurements'::regclass
      and conname = 'body_measurements_non_negative_values'
  ) then
    alter table public.body_measurements
      add constraint body_measurements_non_negative_values check (
        (weight is null or weight >= 0)
        and (body_fat_percent is null or (body_fat_percent >= 0 and body_fat_percent <= 100))
        and (muscle_mass_kg is null or muscle_mass_kg >= 0)
        and (waist_cm is null or waist_cm >= 0)
        and (chest_cm is null or chest_cm >= 0)
        and (arms_cm is null or arms_cm >= 0)
        and (thighs_cm is null or thighs_cm >= 0)
      );
  end if;
end
$$;

commit;
