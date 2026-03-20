-- Enforce one active assignee per workout template while allowing many active templates per client.

-- Keep only the latest active assignment per workout template.
with ranked_workout_assignments as (
  select
    id,
    row_number() over (
      partition by template_id
      order by assigned_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.client_plan_assignments
  where status = 'active'
    and template_id is not null
)
update public.client_plan_assignments a
set
  status = 'archived',
  ended_on = coalesce(a.ended_on, current_date),
  updated_at = now()
from ranked_workout_assignments r
where a.id = r.id
  and r.rn > 1;

-- Old rule: one active template per client. Remove it.
drop index if exists public.uq_client_plan_assignments_one_active;

-- New rule: one active assignee per template.
create unique index if not exists uq_client_plan_assignments_template_one_active
  on public.client_plan_assignments (template_id)
  where status = 'active'
    and template_id is not null;

-- Enforce one active/paused assignee per meal group template.

-- Keep one current assignee per template_group_id (prefer active over paused).
with ranked_meal_assignments as (
  select
    id,
    row_number() over (
      partition by template_group_id
      order by
        case when status = 'active' then 0 else 1 end,
        updated_at desc nulls last,
        created_at desc nulls last,
        id desc
    ) as rn
  from public.meal_group_assignments
  where status in ('active', 'paused')
)
update public.meal_group_assignments a
set
  status = 'archived',
  updated_at = now()
from ranked_meal_assignments r
where a.id = r.id
  and r.rn > 1;

create unique index if not exists uq_meal_group_assignments_template_one_assignee
  on public.meal_group_assignments (template_group_id)
  where status in ('active', 'paused');
