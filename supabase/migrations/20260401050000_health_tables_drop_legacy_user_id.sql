create or replace function public.trigger_body_measurements_calculate_bmi()
returns trigger
language plpgsql
as $$
declare
  effective_height numeric;
begin
  effective_height := new.height_cm;

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
before insert or update of weight, height_cm
on public.body_measurements
for each row
execute function public.trigger_body_measurements_calculate_bmi();

create or replace function public.calculate_bmi()
returns trigger
language plpgsql
as $$
declare
  w numeric;
  h numeric;
begin
  w := new.weight;
  h := new.height_cm;

  if h is null then
    if new.subject_client_id is not null then
      select bm.height_cm
        into h
        from public.body_measurements bm
       where bm.subject_client_id = new.subject_client_id
         and bm.height_cm is not null
         and bm.id is distinct from new.id
       order by bm.date desc, bm.created_at desc
       limit 1;
    elsif new.subject_user_id is not null then
      select bm.height_cm
        into h
        from public.body_measurements bm
       where bm.subject_user_id = new.subject_user_id
         and bm.height_cm is not null
         and bm.id is distinct from new.id
       order by bm.date desc, bm.created_at desc
       limit 1;
    end if;
  end if;

  if w is not null and w > 0 and h is not null and h > 0 then
    new.bmi := round(w / ((h / 100.0) * (h / 100.0)), 1);
  else
    new.bmi := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_calculate_bmi on public.body_measurements;
create trigger trg_calculate_bmi
before insert or update of weight, height_cm
on public.body_measurements
for each row
execute function public.calculate_bmi();

alter table if exists public.body_measurements
  drop column if exists user_id;

alter table if exists public.daily_activity
  drop column if exists user_id;

alter table if exists public.sleep_log
  drop column if exists user_id;

alter table if exists public.vitals_log
  drop column if exists user_id;

alter table if exists public.menstrual_cycles
  drop column if exists user_id;
