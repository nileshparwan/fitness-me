begin;

-- Remove stale triggers on body_measurements that still reference dropped weekly_checkins.
do $$
declare
  rec record;
  fn_def text;
begin
  if to_regclass('public.body_measurements') is null then
    return;
  end if;

  for rec in
    select tg.tgname as trigger_name, p.oid as fn_oid
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    where tg.tgrelid = 'public.body_measurements'::regclass
      and not tg.tgisinternal
  loop
    fn_def := pg_get_functiondef(rec.fn_oid);
    if fn_def ilike '%weekly_checkins%' then
      execute format('drop trigger if exists %I on public.body_measurements', rec.trigger_name);
    end if;
  end loop;
end
$$;

-- Ensure BMI trigger function is correct and self-contained.
create or replace function public.trigger_body_measurements_calculate_bmi()
returns trigger
language plpgsql
as $$
declare
  effective_height numeric;
begin
  effective_height := new.height_cm;

  if effective_height is null and new.user_id is not null then
    select p.height_cm
    into effective_height
    from public.profiles p
    where p.id = new.user_id;
  end if;

  if new.weight is not null and effective_height is not null and effective_height > 0 then
    new.bmi := round((new.weight / power((effective_height / 100.0), 2))::numeric, 2);
  else
    new.bmi := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_body_measurements_bmi on public.body_measurements;
create trigger trg_body_measurements_bmi
before insert or update of weight, height_cm, user_id
on public.body_measurements
for each row
execute function public.trigger_body_measurements_calculate_bmi();

-- Keep updated_at behavior deterministic.
do $$
begin
  if to_regprocedure('public.trigger_set_updated_at()') is not null then
    drop trigger if exists trg_body_measurements_set_updated_at on public.body_measurements;
    create trigger trg_body_measurements_set_updated_at
    before update on public.body_measurements
    for each row
    execute function public.trigger_set_updated_at();
  end if;
end
$$;

commit;
