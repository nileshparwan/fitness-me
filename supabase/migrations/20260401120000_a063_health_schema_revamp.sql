begin;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('daily_activity', 'checkins'),
        ('sleep_log', 'checkin_sleep'),
        ('vitals_log', 'checkin_vitals'),
        ('body_measurements', 'measurements'),
        ('menstrual_cycles', 'cycle_entries')
    ) as pairs(old_name, new_name)
  loop
    if to_regclass(format('public.%s', item.old_name)) is not null
       and to_regclass(format('public.%s', item.new_name)) is null then
      execute format('alter table public.%I rename to %I', item.old_name, item.new_name);
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('checkins', 'daily_activity_subject_access', 'checkins_subject_access'),
        ('checkin_sleep', 'sleep_log_subject_access', 'checkin_sleep_subject_access'),
        ('checkin_vitals', 'vitals_log_subject_access', 'checkin_vitals_subject_access'),
        ('measurements', 'body_measurements_subject_access', 'measurements_subject_access')
    ) as pairs(table_name, old_name, new_name)
  loop
    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = item.table_name
        and policyname = item.old_name
    ) then
      execute format(
        'alter policy %I on public.%I rename to %I',
        item.old_name,
        item.table_name,
        item.new_name
      );
    end if;
  end loop;
end $$;

commit;
