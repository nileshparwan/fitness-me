-- Remove assistant coach delegation model; ownership stays with primary coach only.

create or replace function public.has_client_coach_access(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_sysadmin()
    or exists (
      select 1
      from public.clients c
      where c.id = target_client_id
        and c.primary_coach_id = auth.uid()
        and c.is_archived = false
    );
$$;

grant execute on function public.has_client_coach_access(uuid) to authenticated;

drop table if exists public.coach_client_assignments cascade;
drop function if exists public.is_client_primary_coach(uuid);
drop type if exists public.coach_assignment_role;
