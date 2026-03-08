begin;

-- Remove all custom triggers on auth.users to eliminate legacy failing hooks.
do $$
declare
  trig record;
begin
  for trig in
    select tgname
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and not tgisinternal
  loop
    execute format('drop trigger if exists %I on auth.users', trig.tgname);
  end loop;
end $$;

-- Reinstall a single safe insert trigger for profile bootstrap.
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

commit;
