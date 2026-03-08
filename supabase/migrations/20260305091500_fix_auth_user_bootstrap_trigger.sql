begin;

-- Ensure new auth users can always be created without failing due to stale profile logic.
-- This replaces legacy trigger/function implementations that referenced removed role values/columns.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  incoming_role text;
  resolved_role public.user_role := 'user'::public.user_role;
  resolved_name text;
begin
  incoming_role := lower(
    coalesce(
      new.raw_app_meta_data ->> 'role',
      new.raw_user_meta_data ->> 'role',
      ''
    )
  );

  if incoming_role in ('admin', 'sysadmin') then
    resolved_role := 'sysadmin'::public.user_role;
  end if;

  resolved_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'display_name',
        new.raw_user_meta_data ->> 'name',
        split_part(coalesce(new.email, ''), '@', 1)
      )
    ),
    ''
  );

  begin
    insert into public.profiles (id, role, full_name, is_active)
    values (new.id, resolved_role, resolved_name, true)
    on conflict (id) do update
      set role = excluded.role,
          full_name = coalesce(excluded.full_name, public.profiles.full_name),
          is_active = true,
          updated_at = now();
  exception
    when undefined_column then
      insert into public.profiles (id, role, full_name)
      values (new.id, resolved_role, resolved_name)
      on conflict (id) do update
        set role = excluded.role,
            full_name = coalesce(excluded.full_name, public.profiles.full_name),
            updated_at = now();
  end;

  return new;
exception
  when others then
    raise warning 'handle_new_user failed for auth.users.id=%: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

commit;
