-- supabase/migrations/20260402120000_muscle_mapping_tables.sql
begin;

create table if not exists public.body_muscles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- react-body-highlighter internal name (e.g. 'front-deltoids')
  label text not null, -- Display label (e.g. 'Front Deltoids')
  is_posterior boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.muscle_group_map (
  id uuid primary key default gen_random_uuid(),
  muscle_group text not null, -- The tag used in exercises.muscle_groups (e.g. 'quads')
  body_muscle_id uuid not null references public.body_muscles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(muscle_group, body_muscle_id)
);

-- Seed body_muscles
insert into public.body_muscles (name, label, is_posterior)
values
  ('abs', 'Abs', false),
  ('obliques', 'Obliques', false),
  ('forearm', 'Forearms', false),
  ('biceps', 'Biceps', false),
  ('triceps', 'Triceps', true),
  ('front-deltoids', 'Front Deltoids', false),
  ('back-deltoids', 'Back Deltoids', true),
  ('chest', 'Chest', false),
  ('upper-back', 'Upper Back', true),
  ('lower-back', 'Lower Back', true),
  ('trapezius', 'Trapezius', true),
  ('quadriceps', 'Quadriceps', false),
  ('hamstring', 'Hamstrings', true),
  ('gluteal', 'Glutes', true),
  ('calves', 'Calves', true),
  ('adductor', 'Adductors', false),
  ('abductors', 'Abductors', false),
  ('neck', 'Neck', false)
on conflict (name) do update set label = excluded.label, is_posterior = excluded.is_posterior;

-- Seed muscle_group_map based on MUSCLE_GROUP_MAP from lib/calculations/muscle-map.ts
do $$
declare
  m_abs_id uuid := (select id from public.body_muscles where name = 'abs');
  m_obliques_id uuid := (select id from public.body_muscles where name = 'obliques');
  m_forearm_id uuid := (select id from public.body_muscles where name = 'forearm');
  m_biceps_id uuid := (select id from public.body_muscles where name = 'biceps');
  m_triceps_id uuid := (select id from public.body_muscles where name = 'triceps');
  m_front_delts_id uuid := (select id from public.body_muscles where name = 'front-deltoids');
  m_back_delts_id uuid := (select id from public.body_muscles where name = 'back-deltoids');
  m_chest_id uuid := (select id from public.body_muscles where name = 'chest');
  m_upper_back_id uuid := (select id from public.body_muscles where name = 'upper-back');
  m_lower_back_id uuid := (select id from public.body_muscles where name = 'lower-back');
  m_traps_id uuid := (select id from public.body_muscles where name = 'trapezius');
  m_quads_id uuid := (select id from public.body_muscles where name = 'quadriceps');
  m_hams_id uuid := (select id from public.body_muscles where name = 'hamstring');
  m_glutes_id uuid := (select id from public.body_muscles where name = 'gluteal');
  m_calves_id uuid := (select id from public.body_muscles where name = 'calves');
  m_adductors_id uuid := (select id from public.body_muscles where name = 'adductor');
  m_abductors_id uuid := (select id from public.body_muscles where name = 'abductors');
  m_neck_id uuid := (select id from public.body_muscles where name = 'neck');
begin
  -- Clear existing if any for clean seed
  truncate table public.muscle_group_map;

  insert into public.muscle_group_map (muscle_group, body_muscle_id) values
    ('abs', m_abs_id),
    ('abductors', m_abductors_id),
    ('adductor', m_adductors_id),
    ('adductors', m_adductors_id),
    ('back', m_upper_back_id), ('back', m_lower_back_id), ('back', m_traps_id),
    ('back_deltoids', m_back_delts_id), ('back deltoids', m_back_delts_id),
    ('rear_delts', m_back_delts_id), ('rear_deltoids', m_back_delts_id),
    ('biceps', m_biceps_id),
    ('calf', m_calves_id), ('calves', m_calves_id),
    ('chest', m_chest_id),
    ('core', m_abs_id), ('core', m_obliques_id),
    ('deltoids', m_front_delts_id),
    ('delts', m_front_delts_id), ('delts', m_back_delts_id),
    ('forearm', m_forearm_id), ('forearms', m_forearm_id),
    ('front_deltoids', m_front_delts_id), ('front deltoids', m_front_delts_id),
    ('glute', m_glutes_id), ('gluteal', m_glutes_id), ('glutes', m_glutes_id),
    ('hamstring', m_hams_id), ('hamstrings', m_hams_id),
    ('hips', m_abductors_id), ('hips', m_adductors_id), ('hips', m_glutes_id),
    ('lats', m_upper_back_id),
    ('legs', m_quads_id), ('legs', m_hams_id), ('legs', m_glutes_id), ('legs', m_calves_id),
    ('lower_back', m_lower_back_id), ('lower back', m_lower_back_id),
    ('mid_back', m_upper_back_id), ('mid back', m_upper_back_id),
    ('neck', m_neck_id),
    ('obliques', m_obliques_id),
    ('posterior_chain', m_hams_id), ('posterior_chain', m_glutes_id), ('posterior_chain', m_lower_back_id), ('posterior_chain', m_calves_id),
    ('posterior chain', m_hams_id), ('posterior chain', m_glutes_id), ('posterior chain', m_lower_back_id), ('posterior chain', m_calves_id),
    ('pull', m_upper_back_id), ('pull', m_biceps_id), ('pull', m_back_delts_id), ('pull', m_traps_id), ('pull', m_forearm_id),
    ('push', m_chest_id), ('push', m_triceps_id), ('push', m_front_delts_id),
    ('quads', m_quads_id), ('quadriceps', m_quads_id),
    ('shoulders', m_front_delts_id), ('shoulders', m_back_delts_id),
    ('traps', m_traps_id), ('trapezius', m_traps_id),
    ('triceps', m_triceps_id),
    ('upper_back', m_upper_back_id), ('upper_back', m_traps_id),
    ('upper back', m_upper_back_id), ('upper back', m_traps_id);
end $$;

commit;
