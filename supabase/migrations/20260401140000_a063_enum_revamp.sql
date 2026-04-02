begin;

do $$
begin
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'meal_log_type')
     and not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'diary_entry_type') then
    execute 'alter type public.meal_log_type rename to diary_entry_type';
  end if;

  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'meal_item_type')
     and not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'nutrition_plan_item_type') then
    execute 'alter type public.meal_item_type rename to nutrition_plan_item_type';
  end if;

  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'meal_group_status')
     and not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'nutrition_plan_status') then
    execute 'alter type public.meal_group_status rename to nutrition_plan_status';
  end if;

  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'meal_group_assignment_status')
     and not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'nutrition_plan_assignment_status') then
    execute 'alter type public.meal_group_assignment_status rename to nutrition_plan_assignment_status';
  end if;

  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'meal_day_of_week')
     and not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'day_of_week') then
    execute 'alter type public.meal_day_of_week rename to day_of_week';
  end if;

  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'session_location_type')
     and not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'workout_location') then
    execute 'alter type public.session_location_type rename to workout_location';
  end if;

  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'session_slot')
     and not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'workout_slot') then
    execute 'alter type public.session_slot rename to workout_slot';
  end if;

  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'client_checkin_status')
     and not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'client_review_status') then
    execute 'alter type public.client_checkin_status rename to client_review_status';
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_enum where enumtypid = 'public.diary_entry_type'::regtype and enumlabel = 'snacks') then
    update public.diary_entries
       set meal_type = 'snack'
     where meal_type::text = 'snacks';
  end if;
exception
  when undefined_table then
    null;
end $$;

do $$
begin
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'diary_entry_type') then
    create type public.diary_entry_type_v2 as enum (
      'breakfast',
      'lunch',
      'dinner',
      'other',
      'snack',
      'pre_workout_meal',
      'post_workout_meal',
      'protein_drink',
      'water'
    );

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'diary_entries'
        and column_name = 'meal_type'
    ) then
      alter table public.diary_entries
        alter column meal_type type public.diary_entry_type_v2
        using (case when meal_type::text = 'snacks' then 'snack' else meal_type::text end)::public.diary_entry_type_v2;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'diary_sections'
        and column_name = 'meal_type'
    ) then
      alter table public.diary_sections
        alter column meal_type type public.diary_entry_type_v2
        using (case when meal_type::text = 'snacks' then 'snack' else meal_type::text end)::public.diary_entry_type_v2;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'diary_favorites'
        and column_name = 'meal_type'
    ) then
      alter table public.diary_favorites
        alter column meal_type type public.diary_entry_type_v2
        using (
          case
            when meal_type is null then null
            when meal_type::text = 'snacks' then 'snack'
            else meal_type::text
          end
        )::public.diary_entry_type_v2;
    end if;

    drop type public.diary_entry_type;
    alter type public.diary_entry_type_v2 rename to diary_entry_type;
  end if;
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'meal_assignment_status')
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'nutrition_plan_assignments'
         and column_name = 'status'
     ) then
    drop trigger if exists trg_nutrition_plan_assignments_overlap_guard on public.nutrition_plan_assignments;
    alter table public.nutrition_plan_assignments
      alter column status type public.nutrition_plan_assignment_status
      using status::text::public.nutrition_plan_assignment_status;
    create trigger trg_nutrition_plan_assignments_overlap_guard
    before insert or update of status, start_date, end_date, subject_user_id, subject_client_id
    on public.nutrition_plan_assignments
    for each row
    execute function public.enforce_active_nutrition_plan_overlap();
  end if;
exception
  when undefined_object then
    null;
end $$;

drop type if exists public.meal_assignment_status;

drop view if exists public.coach_client_summary;

do $$
begin
  if exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'client_review_status'
  ) and exists (
    select 1 from pg_enum
    where enumtypid = 'public.client_review_status'::regtype
      and enumlabel = 'pending'
  ) then
    create type public.client_review_status_v2 as enum (
      'pending_review',
      'reviewed',
      'actioned'
    );

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'client_reviews'
        and column_name = 'status'
    ) then
      alter table public.client_reviews
        alter column status drop default;

      alter table public.client_reviews
        alter column status type public.client_review_status_v2
        using (
          case
            when status::text = 'pending' then 'pending_review'
            else status::text
          end
        )::public.client_review_status_v2;

      alter table public.client_reviews
        alter column status set default 'pending_review'::public.client_review_status_v2;
    end if;

    drop type public.client_review_status;
    alter type public.client_review_status_v2 rename to client_review_status;
  end if;
exception
  when undefined_object or duplicate_object then
    null;
end $$;

drop type if exists public.checkin_status;

create view public.coach_client_summary as
select
  c.id as client_id,
  c.primary_coach_id as coach_id,
  c.linked_user_id,
  c.status as client_status,
  c.created_at as client_since,
  coalesce(
    nullif(trim(c.display_name), ''),
    nullif(trim(p.full_name), ''),
    nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
    'Client'
  ) as full_name,
  c.email,
  count(g.id) filter (
    where g.status in ('active', 'on_track', 'at_risk')
  ) as active_goals_count,
  count(g.id) filter (where g.status = 'completed') as completed_goals_count,
  count(g.id) filter (where g.status = 'at_risk') as at_risk_goals_count,
  max(g.updated_at) as last_goal_update,
  count(w.id) filter (where w.performed_on = current_date) as sessions_today_count,
  count(w.id) filter (
    where w.performed_on = current_date
      and coalesce(lower(w.status), 'scheduled') in ('pending', 'planned', 'scheduled')
  ) as sessions_today_pending_count,
  count(w.id) filter (
    where w.performed_on >= current_date - interval '30 days'
  ) as sessions_last_30d,
  max(w.performed_on) as last_session_date,
  coalesce(
    sum(pay.amount) filter (
      where pay.status = 'paid'
        and pay.payment_date >= date_trunc('month', current_date)::date
    ),
    0
  )::numeric as mtd_revenue,
  max(pay.payment_date) filter (where pay.status = 'paid') as last_payment_date,
  count(pay.id) filter (
    where pay.status = 'pending'
      and pay.payment_date <= current_date
  ) as pending_payments_count,
  max(pay.payment_date) filter (where pay.status = 'pending') as last_pending_payment_date,
  count(review_row.id) filter (
    where review_row.submitted_at >= now() - interval '30 days'
  ) as checkins_last_30d,
  count(review_row.id) filter (where review_row.status = 'pending_review') as pending_checkins,
  count(review_row.id) filter (where review_row.status = 'pending_review' and review_row.urgent = true) as urgent_checkins,
  count(note_row.id) filter (
    where note_row.created_at >= now() - interval '30 days'
  ) as notes_last_30d,
  max(note_row.created_at) as last_note_at
from public.clients c
left join public.profiles p on p.id = c.linked_user_id
left join public.goals g
  on g.created_by_user_id = c.linked_user_id
 and coalesce(g.is_personal_goal, false) = false
left join public.workouts w on w.subject_client_id = c.id
left join public.payments pay
  on pay.client_id = c.id
 and pay.coach_id = c.primary_coach_id
left join public.client_reviews review_row on review_row.subject_client_id = c.id
left join public.client_notes note_row
  on note_row.client_id = c.id
 and note_row.archived_at is null
where c.is_archived = false
group by
  c.id,
  c.primary_coach_id,
  c.linked_user_id,
  c.status,
  c.created_at,
  c.display_name,
  c.first_name,
  c.last_name,
  p.full_name,
  c.email;

alter view public.coach_client_summary set (security_invoker = on);
grant select on public.coach_client_summary to authenticated;

do $$
begin
  if exists (select 1 from pg_enum where enumtypid = 'public.client_module_key'::regtype and enumlabel = 'training_plan') then
    alter type public.client_module_key rename value 'training_plan' to 'program';
  end if;
  if exists (select 1 from pg_enum where enumtypid = 'public.client_module_key'::regtype and enumlabel = 'meal_plan') then
    alter type public.client_module_key rename value 'meal_plan' to 'nutrition_plan';
  end if;
  if exists (select 1 from pg_enum where enumtypid = 'public.client_module_key'::regtype and enumlabel = 'meal_logging') then
    alter type public.client_module_key rename value 'meal_logging' to 'diary';
  end if;
end $$;

commit;
