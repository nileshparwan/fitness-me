begin;

alter table public.clients
  add column if not exists gender public.gender_type,
  add column if not exists fitness_level public.fitness_level,
  add column if not exists is_pregnant boolean not null default false,
  add column if not exists due_date date,
  add column if not exists is_postpartum boolean not null default false,
  add column if not exists postpartum_since date,
  add column if not exists avatar_url text,
  add column if not exists bio text;

alter table public.clients
  drop constraint if exists clients_due_date_requires_pregnant;

alter table public.clients
  add constraint clients_due_date_requires_pregnant
  check (due_date is null or is_pregnant = true);

drop view if exists public.coach_client_summary;

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
  c.email;

alter view public.coach_client_summary set (security_invoker = on);
grant select on public.coach_client_summary to authenticated;

commit;
