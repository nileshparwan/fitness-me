create or replace function public._normalize_exercise_muscle_groups(
  input_muscles text[],
  input_category text
)
returns text[]
language plpgsql
as $$
declare
  raw_tag text;
  tag text;
  normalized_muscles text[] := '{}';
  candidate_groups text[] := '{}';
  main_group text;
  final_groups text[] := '{}';
begin
  foreach raw_tag in array coalesce(input_muscles, '{}') loop
    tag := lower(trim(raw_tag));
    tag := regexp_replace(tag, '[\s-]+', '_', 'g');
    tag := regexp_replace(tag, '_+', '_', 'g');
    tag := regexp_replace(tag, '^_+|_+$', '', 'g');

    if tag = '' then
      continue;
    end if;

    case tag
      when 'quad' then tag := 'quads';
      when 'leg' then tag := 'legs';
      when 'shoulder' then tag := 'shoulders';
      when 'arm' then tag := 'arms';
      when 'ab' then tag := 'abs';
      when 'lat' then tag := 'lats';
      when 'delt' then tag := 'delts';
      else null;
    end case;

    if not (tag = any(normalized_muscles)) then
      normalized_muscles := array_append(normalized_muscles, tag);
    end if;
  end loop;

  foreach tag in array normalized_muscles loop
    foreach raw_tag in array (
      case
        when tag in ('chest', 'upper_chest', 'lower_chest', 'pecs', 'pectorals') then array['chest']
        when tag in ('back', 'upper_back', 'lower_back', 'lats', 'traps', 'rhomboids', 'erectors') then array['back']
        when tag in ('shoulders', 'front_delts', 'side_delts', 'rear_delts', 'delts', 'rotator_cuff') then array['shoulders']
        when tag in ('arms', 'biceps', 'triceps', 'forearms', 'brachialis') then array['arms']
        when tag in ('legs', 'quads', 'hamstrings', 'calves', 'adductors', 'abductors', 'hip_flexors') then array['legs']
        when tag in ('glutes') then array['glutes', 'legs']
        when tag in ('core', 'abs', 'obliques', 'lower_abs', 'transverse_abdominis') then array['core']
        when tag in ('cardio', 'cardiovascular', 'conditioning', 'endurance', 'coordination') then array['cardio']
        else array[]::text[]
      end
    ) loop
      if not (raw_tag = any(candidate_groups)) then
        candidate_groups := array_append(candidate_groups, raw_tag);
      end if;
    end loop;
  end loop;

  tag := lower(trim(coalesce(input_category, '')));
  tag := regexp_replace(tag, '[\s-]+', '_', 'g');
  tag := regexp_replace(tag, '_+', '_', 'g');
  tag := regexp_replace(tag, '^_+|_+$', '', 'g');
  if tag in ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'glutes', 'cardio') then
    main_group := tag;
  else
    if 'chest' = any(candidate_groups) then
      main_group := 'chest';
    elsif 'back' = any(candidate_groups) then
      main_group := 'back';
    elsif 'legs' = any(candidate_groups) then
      main_group := 'legs';
    elsif 'shoulders' = any(candidate_groups) then
      main_group := 'shoulders';
    elsif 'arms' = any(candidate_groups) then
      main_group := 'arms';
    elsif 'core' = any(candidate_groups) then
      main_group := 'core';
    elsif 'glutes' = any(candidate_groups) then
      main_group := 'glutes';
    elsif 'cardio' = any(candidate_groups) then
      main_group := 'cardio';
    else
      main_group := null;
    end if;
  end if;

  if main_group is not null then
    final_groups := array_append(final_groups, main_group);
  end if;
  foreach tag in array normalized_muscles loop
    if not (tag = any(final_groups)) then
      final_groups := array_append(final_groups, tag);
    end if;
  end loop;

  return final_groups;
end;
$$;

update public.exercise_catalog
set muscle_groups = public._normalize_exercise_muscle_groups(muscle_groups, category);

drop function if exists public._normalize_exercise_muscle_groups(text[], text);
