create or replace function public.get_goals_due_for_checkin(p_user_ids uuid[])
returns table(goal_id uuid, user_id uuid, goal_type text)
language sql
stable
as $$
  select
    fg.id as goal_id,
    fg.user_id as user_id,
    fg.goal_type as goal_type
  from public.fitness_goals fg
  where fg.user_id = any(p_user_ids)
    and fg.check_in_interval_days is not null
    and fg.status = 'active'
    and (
      current_date - coalesce(
        (
          select max(gph.snapshot_at::date)
          from public.goal_progress_history gph
          where gph.goal_id = fg.id
        ),
        fg.start_date::date
      )
    ) >= fg.check_in_interval_days;
$$;
