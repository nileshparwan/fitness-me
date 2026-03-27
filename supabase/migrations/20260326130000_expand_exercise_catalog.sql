begin;

-- Create the exercise category enum if it does not already exist.
do $$
begin
  create type public.exercise_category as enum ('strength', 'cardio', 'mind_body', 'mobility');
exception
  when duplicate_object then null;
end $$;

-- Migrate the category column to the enum when the current schema still uses text.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercise_catalog'
      and column_name = 'category'
      and udt_name <> 'exercise_category'
  ) then
    alter table public.exercise_catalog
      alter column category type public.exercise_category
      using (
        case
          when category is null or btrim(category) = '' then 'strength'
          when lower(regexp_replace(btrim(category), '[\s-]+', '_', 'g')) in (
            'strength',
            'push',
            'pull',
            'upper_body',
            'lower_body',
            'chest',
            'back',
            'legs',
            'shoulders',
            'arms',
            'core',
            'glutes'
          ) then 'strength'
          when lower(regexp_replace(btrim(category), '[\s-]+', '_', 'g')) in (
            'cardio',
            'conditioning',
            'endurance',
            'running',
            'cycling',
            'hiit',
            'aerobic'
          ) then 'cardio'
          when lower(regexp_replace(btrim(category), '[\s-]+', '_', 'g')) in (
            'mind_body',
            'mindbody',
            'yoga',
            'pilates',
            'barre',
            'breathwork'
          ) then 'mind_body'
          when lower(regexp_replace(btrim(category), '[\s-]+', '_', 'g')) in (
            'mobility',
            'stretch',
            'stretching',
            'flexibility',
            'recovery',
            'rehab',
            'rehabilitation',
            'pelvic_floor'
          ) then 'mobility'
          else 'strength'
        end
      )::public.exercise_category;
  end if;
end $$;

-- Extend the muscle-group normalizer so these new inputs roll up to the existing parents.
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
        when tag in ('legs', 'quads', 'hamstrings', 'calves', 'adductors', 'abductors', 'hip_abductors', 'hip_flexors') then array['legs']
        when tag in ('glutes') then array['glutes', 'legs']
        when tag in ('core', 'abs', 'obliques', 'lower_abs', 'transverse_abdominis', 'pelvic_floor') then array['core']
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
set muscle_groups = public._normalize_exercise_muscle_groups(muscle_groups, category::text);

insert into public.exercise_catalog (
  name,
  category,
  equipment,
  muscle_groups,
  description,
  is_approved
)
values
  -- Yoga
  ('Vinyasa Flow', 'mind_body', 'bodyweight', array['core','cardio','mobility']::text[], 'Dynamic yoga sequence linking breath and movement.', true),
  ('Hatha Flow', 'mind_body', 'bodyweight', array['mobility','core']::text[], 'Balanced yoga practice with steady holds.', true),
  ('Yin Yoga', 'mind_body', 'bodyweight', array['mobility','recovery']::text[], 'Long-held passive stretches to support mobility.', true),
  ('Restorative Yoga', 'mind_body', 'bodyweight', array['mobility','recovery']::text[], 'Fully supported yoga for relaxation and recovery.', true),
  ('Power Yoga', 'mind_body', 'bodyweight', array['core','cardio','mobility']::text[], 'Higher-intensity yoga with strength emphasis.', true),
  ('Sun Salutation', 'mind_body', 'bodyweight', array['mobility','core','cardio']::text[], 'Foundational warm-up yoga sequence.', true),
  ('Warrior Sequence', 'mind_body', 'bodyweight', array['legs','glutes','core']::text[], 'Standing yoga sequence for strength and balance.', true),
  ('Hip Opener Flow', 'mind_body', 'bodyweight', array['mobility','glutes','hips']::text[], 'Yoga flow focused on hip mobility.', true),
  ('Core Yoga', 'mind_body', 'bodyweight', array['core','mobility']::text[], 'Yoga session emphasizing trunk stability.', true),
  ('Prenatal Yoga', 'mind_body', 'bodyweight', array['mobility','core','recovery']::text[], 'Prenatal-friendly yoga with safe movement patterns.', true),

  -- Pilates
  ('Mat Pilates', 'mind_body', 'bodyweight', array['core','mobility']::text[], 'Floor-based Pilates session for control and stability.', true),
  ('Reformer Pilates (simulated)', 'mind_body', 'reformer', array['core','mobility']::text[], 'Reformer-inspired Pilates pattern for core and posture.', true),
  ('Pilates 100', 'mind_body', 'bodyweight', array['core']::text[], 'Classic Pilates core endurance exercise.', true),
  ('Pilates Roll-Up', 'mind_body', 'bodyweight', array['core','mobility']::text[], 'Spinal articulation and controlled trunk flexion.', true),
  ('Pilates Leg Circles', 'mind_body', 'bodyweight', array['core','mobility','hips']::text[], 'Controlled hip mobility and core stability drill.', true),
  ('Pilates Teaser', 'mind_body', 'bodyweight', array['core','hips']::text[], 'Advanced Pilates balance and trunk control movement.', true),
  ('Side-Lying Clam', 'mind_body', 'bodyweight', array['glutes','hip_abductors']::text[], 'Pilates side-lying hip activation drill.', true),
  ('Pilates Bridge', 'mind_body', 'bodyweight', array['glutes','hamstrings','core']::text[], 'Bridge pattern with Pilates control.', true),
  ('Pilates Plank Series', 'mind_body', 'bodyweight', array['core','shoulders']::text[], 'Plank-based Pilates sequence for stability.', true),
  ('Postpartum Pilates', 'mind_body', 'bodyweight', array['core','pelvic_floor','mobility']::text[], 'Gentle postpartum return-to-core training.', true),

  -- Barre
  ('Barre Plié Sequence', 'mind_body', 'bodyweight', array['quads','glutes','calves']::text[], 'Plié sequence for lower-body endurance.', true),
  ('Barre Thigh Work', 'mind_body', 'bodyweight', array['quads','glutes']::text[], 'High-rep barre lower-body burn.', true),
  ('Barre Seat Work', 'mind_body', 'bodyweight', array['glutes','hamstrings']::text[], 'Barre sequence for glute and hamstring endurance.', true),
  ('Barre Core Series', 'mind_body', 'bodyweight', array['core']::text[], 'Core-focused barre circuit.', true),
  ('Barre Arm Series', 'mind_body', 'bodyweight', array['shoulders','arms']::text[], 'Upper-body barre sequence with light resistance.', true),

  -- Mobility & Flexibility
  ('Full Body Stretch', 'mobility', 'bodyweight', array['mobility','recovery']::text[], 'Full-body flexibility and recovery sequence.', true),
  ('Hip Flexor Stretch', 'mobility', 'bodyweight', array['mobility','hips']::text[], 'Targeted hip flexor stretch.', true),
  ('Thoracic Spine Mobility', 'mobility', 'bodyweight', array['mobility','back']::text[], 'Thoracic rotation and extension mobility work.', true),
  ('Shoulder Mobility Flow', 'mobility', 'bodyweight', array['mobility','shoulders']::text[], 'Dynamic shoulder control and range work.', true),
  ('Hamstring Stretch Sequence', 'mobility', 'bodyweight', array['mobility','hamstrings']::text[], 'Hamstring flexibility series.', true),
  ('Ankle Mobility', 'mobility', 'bodyweight', array['mobility','calves']::text[], 'Ankle dorsiflexion and stability drill.', true),
  ('Pigeon Pose Sequence', 'mobility', 'bodyweight', array['mobility','glutes','hips']::text[], 'Hip-opening stretch sequence.', true),
  ('Cat-Cow Flow', 'mobility', 'bodyweight', array['mobility','back','core']::text[], 'Spinal mobility flow.', true),
  ('Foam Rolling (Full Body)', 'mobility', 'foam_roller', array['mobility','recovery']::text[], 'General self-myofascial release routine.', true),
  ('Foam Rolling (Legs)', 'mobility', 'foam_roller', array['mobility','legs']::text[], 'Lower-body recovery rolling routine.', true),

  -- Additional cardio
  ('Walking (Outdoor)', 'cardio', 'bodyweight', array['cardiovascular','legs']::text[], 'Outdoor walking for base aerobic work.', true),
  ('Walking (Treadmill)', 'cardio', 'cardio_machine', array['cardiovascular','legs']::text[], 'Indoor incline or flat treadmill walking.', true),
  ('Swimming (Laps)', 'cardio', 'cardio_machine', array['cardiovascular','full_body']::text[], 'Lap swimming for endurance and recovery.', true),
  ('Water Aerobics', 'cardio', 'bodyweight', array['cardiovascular','full_body']::text[], 'Low-impact aquatic conditioning.', true),
  ('Dance Cardio', 'cardio', 'bodyweight', array['cardiovascular','coordination']::text[], 'Rhythmic cardio workout with dance patterns.', true),
  ('Zumba', 'cardio', 'bodyweight', array['cardiovascular','coordination']::text[], 'Dance-fitness cardio class.', true),
  ('Spin Class', 'cardio', 'bike', array['cardiovascular','quads','glutes']::text[], 'Guided indoor cycling class.', true),
  ('HIIT Circuit', 'cardio', 'bodyweight', array['cardiovascular','full_body']::text[], 'High-intensity interval cardio circuit.', true),
  ('Jump Rope (Moderate)', 'cardio', 'bodyweight', array['cardiovascular','calves','coordination']::text[], 'Moderate-pace jump rope conditioning.', true),
  ('Low-Impact Cardio', 'cardio', 'bodyweight', array['cardiovascular','legs']::text[], 'Joint-friendly cardio session.', true),

  -- Glute & hip focus strength
  ('Banded Clamshell', 'strength', 'band', array['glutes','hip_abductors']::text[], 'Glute medius activation with band resistance.', true),
  ('Banded Lateral Walk', 'strength', 'band', array['glutes','hip_abductors']::text[], 'Lateral band walk for hip stability.', true),
  ('Cable Kickback', 'strength', 'cable', array['glutes','hamstrings']::text[], 'Cable hip extension for glute isolation.', true),
  ('Cable Hip Abduction', 'strength', 'cable', array['glutes','hip_abductors']::text[], 'Cable abduction for glute medius.', true),
  ('Single-Leg Glute Bridge', 'strength', 'bodyweight', array['glutes','hamstrings','core']::text[], 'Unilateral bridge for posterior-chain control.', true),
  ('Frog Pump', 'strength', 'bodyweight', array['glutes']::text[], 'High-rep glute pump movement.', true),
  ('Romanian Single-Leg Deadlift', 'strength', 'dumbbell', array['hamstrings','glutes','core']::text[], 'Unilateral hip hinge for balance and hamstrings.', true),
  ('Curtsy Lunge', 'strength', 'bodyweight', array['glutes','quads','hip_abductors']::text[], 'Cross-behind lunge for glutes and hips.', true),

  -- Pelvic floor & rehabilitation
  ('Kegel Exercise', 'mobility', 'bodyweight', array['pelvic_floor']::text[], 'Pelvic floor contraction and release drill.', true),
  ('Diaphragmatic Breathing', 'mobility', 'bodyweight', array['core','pelvic_floor']::text[], 'Breathing pattern to support core and pelvic floor coordination.', true),
  ('Dead Bug', 'mobility', 'bodyweight', array['core','pelvic_floor']::text[], 'Core stability drill with pelvic control.', true),
  ('Bird Dog', 'mobility', 'bodyweight', array['core','back','pelvic_floor']::text[], 'Cross-body stability exercise for rehab.', true),
  ('Pelvic Tilt', 'mobility', 'bodyweight', array['core','pelvic_floor']::text[], 'Pelvic alignment and lower-back control drill.', true),
  ('McGill Big 3 (Bird Dog variant)', 'mobility', 'bodyweight', array['core','back','pelvic_floor']::text[], 'Rehab-oriented stability sequence.', true),
  ('Transverse Abdominis Activation', 'mobility', 'bodyweight', array['core','pelvic_floor']::text[], 'Deep core bracing and activation drill.', true)
on conflict (name) do nothing;

commit;
