begin;

insert into public.exercise_catalog (
  name,
  category,
  equipment,
  muscle_groups,
  description,
  is_custom,
  is_approved
)
values
  -- Barbell essentials
  ('Squat', 'strength', 'barbell', ARRAY['quads','glutes','core']::text[], 'Barbell back squat for lower-body strength.', false, true),
  ('Deadlift', 'strength', 'barbell', ARRAY['hamstrings','glutes','lower_back']::text[], 'Conventional deadlift for posterior-chain strength.', false, true),
  ('Bench Press', 'strength', 'barbell', ARRAY['chest','triceps','front_delts']::text[], 'Horizontal press strength movement.', false, true),
  ('Overhead Press', 'strength', 'barbell', ARRAY['shoulders','triceps','upper_chest']::text[], 'Vertical pressing pattern with barbell.', false, true),
  ('Barbell Row', 'strength', 'barbell', ARRAY['lats','upper_back','biceps']::text[], 'Bent-over barbell row for pulling strength.', false, true),
  ('Romanian Deadlift', 'strength', 'barbell', ARRAY['hamstrings','glutes','lower_back']::text[], 'Hip hinge emphasizing hamstrings.', false, true),
  ('Hip Thrust', 'strength', 'barbell', ARRAY['glutes','hamstrings']::text[], 'Glute-dominant hip extension pattern.', false, true),
  ('Sumo Deadlift', 'strength', 'barbell', ARRAY['glutes','adductors','hamstrings']::text[], 'Wide-stance deadlift variation.', false, true),
  ('Power Clean', 'strength', 'barbell', ARRAY['full_body','traps','legs']::text[], 'Explosive Olympic lifting movement.', false, true),

  -- Dumbbell essentials
  ('Dumbbell Press', 'strength', 'dumbbell', ARRAY['chest','triceps','front_delts']::text[], 'Flat dumbbell chest press.', false, true),
  ('Dumbbell Row', 'strength', 'dumbbell', ARRAY['lats','upper_back','biceps']::text[], 'Single-arm dumbbell row.', false, true),
  ('Dumbbell Curl', 'strength', 'dumbbell', ARRAY['biceps','forearms']::text[], 'Elbow flexion for biceps.', false, true),
  ('Lateral Raise', 'strength', 'dumbbell', ARRAY['side_delts']::text[], 'Shoulder abduction isolation.', false, true),
  ('Goblet Squat', 'strength', 'dumbbell', ARRAY['quads','glutes','core']::text[], 'Front-loaded squat variation.', false, true),
  ('Dumbbell Lunge', 'strength', 'dumbbell', ARRAY['quads','glutes','hamstrings']::text[], 'Unilateral lower-body strength movement.', false, true),
  ('Incline Press', 'strength', 'dumbbell', ARRAY['upper_chest','triceps','front_delts']::text[], 'Incline dumbbell chest press.', false, true),
  ('Dumbbell RDL', 'strength', 'dumbbell', ARRAY['hamstrings','glutes','lower_back']::text[], 'Romanian deadlift with dumbbells.', false, true),

  -- Bodyweight essentials
  ('Pull-up', 'strength', 'bodyweight', ARRAY['lats','upper_back','biceps']::text[], 'Vertical pull using body weight.', false, true),
  ('Chin-up', 'strength', 'bodyweight', ARRAY['lats','biceps','upper_back']::text[], 'Supinated-grip vertical pull.', false, true),
  ('Push-up', 'strength', 'bodyweight', ARRAY['chest','triceps','front_delts']::text[], 'Horizontal push bodyweight movement.', false, true),
  ('Dip', 'strength', 'bodyweight', ARRAY['chest','triceps','shoulders']::text[], 'Bodyweight dip for pressing strength.', false, true),
  ('Plank', 'strength', 'bodyweight', ARRAY['core']::text[], 'Isometric core stability hold.', false, true),
  ('Glute Bridge', 'strength', 'bodyweight', ARRAY['glutes','hamstrings']::text[], 'Hip extension bodyweight drill.', false, true),
  ('Bulgarian Split Squat', 'strength', 'bodyweight', ARRAY['quads','glutes','hamstrings']::text[], 'Rear-foot elevated unilateral squat.', false, true),
  ('Inverted Row', 'strength', 'bodyweight', ARRAY['upper_back','lats','biceps']::text[], 'Horizontal pulling movement.', false, true),
  ('Pike Push-up', 'strength', 'bodyweight', ARRAY['shoulders','triceps','upper_chest']::text[], 'Bodyweight vertical press variation.', false, true),
  ('Nordic Curl', 'strength', 'bodyweight', ARRAY['hamstrings']::text[], 'Knee-flexion hamstring strength movement.', false, true),

  -- Cable / machine essentials
  ('Cable Row', 'strength', 'cable', ARRAY['lats','upper_back','biceps']::text[], 'Seated or standing cable row pattern.', false, true),
  ('Lat Pulldown', 'strength', 'machine', ARRAY['lats','upper_back','biceps']::text[], 'Machine-assisted vertical pull.', false, true),
  ('Leg Press', 'strength', 'machine', ARRAY['quads','glutes','hamstrings']::text[], 'Machine lower-body press.', false, true),
  ('Leg Curl', 'strength', 'machine', ARRAY['hamstrings']::text[], 'Machine knee-flexion isolation.', false, true),
  ('Leg Extension', 'strength', 'machine', ARRAY['quads']::text[], 'Machine quadriceps isolation.', false, true),
  ('Chest Fly', 'strength', 'machine', ARRAY['chest','front_delts']::text[], 'Machine/cable chest adduction pattern.', false, true),
  ('Face Pull', 'strength', 'cable', ARRAY['rear_delts','upper_back','rotator_cuff']::text[], 'Cable pull for shoulder health.', false, true),
  ('Tricep Pushdown', 'strength', 'cable', ARRAY['triceps']::text[], 'Cable triceps extension.', false, true),
  ('Cable Lateral Raise', 'strength', 'cable', ARRAY['side_delts']::text[], 'Cable shoulder abduction isolation.', false, true),

  -- Cardio essentials
  ('Treadmill Run', 'cardio', 'cardio_machine', ARRAY['cardiovascular','legs']::text[], 'Steady-state or interval treadmill run.', false, true),
  ('Rowing Machine', 'cardio', 'cardio_machine', ARRAY['cardiovascular','back','legs']::text[], 'Full-body rowing ergometer session.', false, true),
  ('Cycling (Stationary)', 'cardio', 'cardio_machine', ARRAY['cardiovascular','quads','glutes']::text[], 'Indoor bike cardio session.', false, true),
  ('Jump Rope', 'cardio', 'bodyweight', ARRAY['cardiovascular','calves','coordination']::text[], 'Rope skipping conditioning movement.', false, true),

  -- Additional seed coverage (for a richer default library)
  ('Front Squat', 'strength', 'barbell', ARRAY['quads','core','glutes']::text[], 'Anterior-loaded squat variation.', false, true),
  ('Barbell Split Squat', 'strength', 'barbell', ARRAY['quads','glutes','hamstrings']::text[], 'Barbell unilateral squat pattern.', false, true),
  ('Hack Squat', 'strength', 'machine', ARRAY['quads','glutes']::text[], 'Machine squat variation emphasizing quads.', false, true),
  ('Calf Raise', 'strength', 'machine', ARRAY['calves']::text[], 'Ankle plantarflexion calf isolation.', false, true),
  ('Seated Shoulder Press', 'strength', 'machine', ARRAY['shoulders','triceps']::text[], 'Machine-based vertical pressing.', false, true),
  ('Machine Chest Press', 'strength', 'machine', ARRAY['chest','triceps','front_delts']::text[], 'Guided chest pressing movement.', false, true),
  ('Hamstring Curl (Seated)', 'strength', 'machine', ARRAY['hamstrings']::text[], 'Seated machine hamstring curl.', false, true),
  ('Walking Lunge', 'strength', 'bodyweight', ARRAY['quads','glutes','hamstrings']::text[], 'Dynamic unilateral lunge pattern.', false, true),
  ('Air Squat', 'strength', 'bodyweight', ARRAY['quads','glutes','core']::text[], 'Bodyweight squat movement.', false, true),
  ('Mountain Climber', 'cardio', 'bodyweight', ARRAY['cardiovascular','core','shoulders']::text[], 'Bodyweight conditioning drill.', false, true),
  ('Assault Bike', 'cardio', 'cardio_machine', ARRAY['cardiovascular','full_body']::text[], 'Air bike interval conditioning.', false, true),
  ('Stair Climber', 'cardio', 'cardio_machine', ARRAY['cardiovascular','glutes','quads']::text[], 'Stepper-based conditioning session.', false, true)
on conflict (name) do nothing;

commit;
