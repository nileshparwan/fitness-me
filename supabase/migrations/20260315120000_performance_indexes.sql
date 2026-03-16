begin;

create extension if not exists pg_trgm;

create index if not exists idx_fitness_goals_user_status
  on public.fitness_goals (user_id, status);

create index if not exists idx_fitness_goals_active
  on public.fitness_goals (user_id, updated_at desc)
  where status in ('active', 'on_track', 'at_risk');

create index if not exists idx_training_sessions_client_date
  on public.training_sessions (subject_client_id, performed_on desc);

create index if not exists idx_coach_notes_client_created
  on public.coach_notes (client_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'goal_progress_history'
      and indexdef ilike '%(goal_id, snapshot_at desc)%'
  ) then
    create index idx_goal_history_goal_snapshot
      on public.goal_progress_history (goal_id, snapshot_at desc);
  end if;
end $$;

create index if not exists idx_clients_coach_status
  on public.clients (primary_coach_id, status);

create index if not exists idx_client_checkins_client
  on public.client_checkins (subject_client_id, submitted_at desc);

create index if not exists idx_exercise_catalog_name_trgm
  on public.exercise_catalog using gin (name gin_trgm_ops);

create or replace view public.coach_client_summary as
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
  p.avatar_url,
  c.email,
  count(fg.id) filter (
    where fg.status in ('active', 'on_track', 'at_risk')
  ) as active_goals_count,
  count(fg.id) filter (where fg.status = 'completed') as completed_goals_count,
  count(fg.id) filter (where fg.status = 'at_risk') as at_risk_goals_count,
  max(fg.updated_at) as last_goal_update,
  count(ts.id) filter (where ts.performed_on = current_date) as sessions_today_count,
  count(ts.id) filter (
    where ts.performed_on = current_date
      and coalesce(lower(ts.status), 'scheduled') in ('pending', 'planned', 'scheduled')
  ) as sessions_today_pending_count,
  count(ts.id) filter (
    where ts.performed_on >= current_date - interval '30 days'
  ) as sessions_last_30d,
  max(ts.performed_on) as last_session_date,
  coalesce(
    sum(cp.amount) filter (
      where cp.status = 'paid'
        and cp.payment_date >= date_trunc('month', current_date)::date
    ),
    0
  )::numeric as mtd_revenue,
  max(cp.payment_date) filter (where cp.status = 'paid') as last_payment_date,
  count(cp.id) filter (
    where cp.status = 'pending'
      and cp.payment_date <= current_date
  ) as pending_payments_count,
  max(cp.payment_date) filter (where cp.status = 'pending') as last_pending_payment_date,
  count(cc.id) filter (
    where cc.submitted_at >= now() - interval '30 days'
  ) as checkins_last_30d,
  count(cc.id) filter (where cc.status = 'pending') as pending_checkins,
  count(cc.id) filter (where cc.status = 'pending' and cc.urgent = true) as urgent_checkins,
  count(cn.id) filter (
    where cn.created_at >= now() - interval '30 days'
  ) as notes_last_30d,
  max(cn.created_at) as last_note_at
from public.clients c
left join public.profiles p on p.id = c.linked_user_id
left join public.fitness_goals fg
  on fg.user_id = c.linked_user_id
 and coalesce(fg.is_personal_goal, false) = false
left join public.training_sessions ts on ts.subject_client_id = c.id
left join public.client_payments cp
  on cp.client_id = c.id
 and cp.coach_id = c.primary_coach_id
left join public.client_checkins cc on cc.subject_client_id = c.id
left join public.coach_notes cn
  on cn.client_id = c.id
 and cn.archived_at is null
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
  p.avatar_url,
  c.email;

alter view public.coach_client_summary set (security_invoker = on);
grant select on public.coach_client_summary to authenticated;

create or replace function public.get_coach_goal_history(
  p_coach_id uuid,
  p_limit int default 400
)
returns table (
  goal_id uuid,
  progress_percent numeric,
  snapshot_at timestamptz
)
language sql
stable
security invoker
as $$
  select gph.goal_id, gph.progress_percent::numeric, gph.snapshot_at
  from public.goal_progress_history gph
  join public.fitness_goals fg on fg.id = gph.goal_id
  join public.clients c on c.linked_user_id = fg.user_id
  where c.primary_coach_id = p_coach_id
    and c.is_archived = false
  order by gph.snapshot_at desc
  limit greatest(coalesce(p_limit, 400), 1);
$$;

grant execute on function public.get_coach_goal_history(uuid, int) to authenticated;

commit;
