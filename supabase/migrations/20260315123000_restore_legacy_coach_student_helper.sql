-- Compatibility shim for legacy RLS policies that still reference
-- public.is_active_or_historical_coach_for_student(uuid, uuid).
-- This function was removed during role-model cleanup in some environments,
-- but policies may still call it until schema/policy alignment is complete.

create or replace function public.is_active_or_historical_coach_for_student(
  p_coach_id uuid,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_coach_id is not null
    and p_student_id is not null
    and (
      p_coach_id = p_student_id
      or exists (
        select 1
        from public.profiles p
        where p.id = p_coach_id
          and p.role = 'sysadmin'::public.user_role
      )
      or exists (
        select 1
        from public.clients c
        where c.primary_coach_id = p_coach_id
          and c.linked_user_id = p_student_id
      )
    );
$$;

grant execute on function public.is_active_or_historical_coach_for_student(uuid, uuid) to authenticated;
