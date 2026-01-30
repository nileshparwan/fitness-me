import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// ADJUST PATH IF NEEDED

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const main = async () => {
  console.log('🚨 STARTING SEED (Fixed Integer Constraints) 🚨');

  // ===========================================================================
  // 1. CLEANUP
  // ===========================================================================
  console.log('🧹 Cleaning up database...');
  const tables = [
    'program_items', 'nutrition_meals', 'nutrition_programs', 
    'workout_logs', 'cardio_logs', 'workouts', 
    'ai_processing_queue', 'ai_insights', 'body_metrics', 
    'goals', 'programs', 'profiles', 'exercise_library'
  ] as const;

  for (const table of tables) {
    // @ts-ignore
    await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
  
  const { data: users } = await supabase.auth.admin.listUsers();
  const admin = users.users.find(u => u.email === ADMIN_EMAIL);
  if (admin) await supabase.auth.admin.deleteUser(admin.id);

  // ===========================================================================
  // 2. EXERCISE LIBRARY
  // ===========================================================================
  console.log('💪 Seeding Exercise Library...');
  const exercises = [
    // PUSH
    { name: 'Bench Press', category: 'chest', muscle_groups: ['pectorals', 'triceps'], equipment: 'barbell' },
    { name: 'Overhead Press', category: 'shoulders', muscle_groups: ['deltoids'], equipment: 'barbell' },
    { name: 'Incline Dumbbell Press', category: 'chest', muscle_groups: ['upper chest'], equipment: 'dumbbell' },
    { name: 'Tricep Pushdown', category: 'arms', muscle_groups: ['triceps'], equipment: 'cable' },
    { name: 'Lateral Raise', category: 'shoulders', muscle_groups: ['side delts'], equipment: 'dumbbell' },
    { name: 'Push Ups', category: 'chest', muscle_groups: ['pectorals'], equipment: 'bodyweight' },
    { name: 'Dips', category: 'chest', muscle_groups: ['pectorals', 'triceps'], equipment: 'bodyweight' },
    
    // PULL
    { name: 'Deadlift', category: 'back', muscle_groups: ['hamstrings', 'lower back'], equipment: 'barbell' },
    { name: 'Pull Up', category: 'back', muscle_groups: ['lats', 'biceps'], equipment: 'bodyweight' },
    { name: 'Barbell Row', category: 'back', muscle_groups: ['lats', 'rhomboids'], equipment: 'barbell' },
    { name: 'Face Pulls', category: 'shoulders', muscle_groups: ['rear deltoids'], equipment: 'cable' },
    { name: 'Dumbbell Curl', category: 'arms', muscle_groups: ['biceps'], equipment: 'dumbbell' },
    { name: 'Lat Pulldown', category: 'back', muscle_groups: ['lats'], equipment: 'cable' },
    { name: 'Hammer Curls', category: 'arms', muscle_groups: ['forearms', 'biceps'], equipment: 'dumbbell' },

    // LEGS
    { name: 'Barbell Squat', category: 'legs', muscle_groups: ['quadriceps', 'glutes'], equipment: 'barbell' },
    { name: 'Leg Press', category: 'legs', muscle_groups: ['quadriceps'], equipment: 'machine' },
    { name: 'Romanian Deadlift', category: 'legs', muscle_groups: ['hamstrings'], equipment: 'barbell' },
    { name: 'Walking Lunges', category: 'legs', muscle_groups: ['glutes', 'quads'], equipment: 'dumbbell' },
    { name: 'Leg Extension', category: 'legs', muscle_groups: ['quadriceps'], equipment: 'machine' },
    { name: 'Calf Raise', category: 'legs', muscle_groups: ['calves'], equipment: 'machine' },

    // CARDIO
    { name: 'Running', category: 'cardio', muscle_groups: ['legs', 'heart'], equipment: 'bodyweight' },
    { name: 'Cycling', category: 'cardio', muscle_groups: ['legs', 'heart'], equipment: 'machine' },
    { name: 'Rowing', category: 'cardio', muscle_groups: ['full body'], equipment: 'machine' },
    { name: 'Jump Rope', category: 'cardio', muscle_groups: ['legs', 'heart'], equipment: 'rope' },
  ];

  const { data: exData, error: exError } = await supabase.from('exercise_library').insert(exercises).select();
  if (exError) throw new Error(`Exercise insert failed: ${exError.message}`);

  const strengthExercises = exData?.filter(e => e.category !== 'cardio') || [];
  const cardioExercises = exData?.filter(e => e.category === 'cardio') || [];

  // ===========================================================================
  // 3. USER PROFILE
  // ===========================================================================
  console.log('👤 Creating User...');
  const { data: auth, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Admin Coach' }
  });
  if (authError || !auth.user) throw new Error(`Auth failed: ${authError?.message}`);
  const userId = auth.user.id;
  const now = new Date().toISOString();

  await supabase.from('profiles').insert({
    id: userId,
    display_name: 'Admin Coach',
    height: 180,
    birth_date: '1995-01-01',
    gender: 'male',
    activity_level: 'active',
    preferred_units: 'metric',
    created_at: now,
    updated_at: now
  });

  // ===========================================================================
  // 4. CREATE PROGRAM
  // ===========================================================================
  console.log('📁 Creating Program...');
  const { data: program } = await supabase.from('programs').insert({
    user_id: userId,
    name: 'High Volume Block',
    description: '10 Unique Workouts, High Volume Intensity',
    is_active: true,
    created_at: now
  }).select().single();

  if (!program) throw new Error("Failed to create program");

  // ===========================================================================
  // 5. DEFINE 10 TEMPLATE WORKOUTS
  // ===========================================================================
  console.log('📋 Defining 10 Program Workouts...');
  
  const referenceWorkouts = [];
  for (let i = 1; i <= 10; i++) {
    const { data: w, error: wError } = await supabase.from('workouts').insert({
      user_id: userId,
      name: `Block Day ${i}`,
      status: 'draft',
      date: now,
      overall_rating: null // Corrected: null for draft
    }).select().single();
    
    if (w) referenceWorkouts.push(w);
  }

  if (referenceWorkouts.length === 0) throw new Error("ABORTING: No reference workouts created.");

  // Link to program
  const programItems = referenceWorkouts.map((w, i) => ({
    program_id: program.id,
    workout_id: w.id,
    day_label: `Day ${i + 1}`,
    order_index: i + 1,
    item_type: 'workout',
    created_at: now
  }));
  await supabase.from('program_items').insert(programItems);

  // ===========================================================================
  // 6. GENERATE 30 DAYS OF HISTORY
  // ===========================================================================
  console.log('History: Simulating 30 Days of Logs...');

  const historyLogs: any[] = [];
  const historyCardio: any[] = [];

  for (let d = 0; d < 30; d++) {
    const daysAgo = 30 - d;
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - daysAgo);
    const dateISO = dateObj.toISOString();

    const workoutIndex = d % referenceWorkouts.length;
    const refWorkout = referenceWorkouts[workoutIndex];
    
    if (!refWorkout) continue;

    // Create Completed Workout (History)
    const { data: doneWorkout } = await supabase.from('workouts').insert({
      user_id: userId,
      name: `${refWorkout.name} (Completed)`,
      date: dateISO,
      created_at: dateISO, 
      updated_at: dateISO,
      status: 'completed',
      duration_minutes: 75,
      overall_rating: 8,
      notes: `Session ${d+1} of 30`
    }).select().single();

    if (!doneWorkout) continue;

    // Pick Exercises
    const offset = workoutIndex * 2; 
    
    const dailyStrength = [
      ...strengthExercises.slice(offset % strengthExercises.length),
      ...strengthExercises
    ].slice(0, 8); 

    const dailyCardio = [
      cardioExercises[workoutIndex % cardioExercises.length],
      cardioExercises[(workoutIndex + 1) % cardioExercises.length]
    ].filter(Boolean);

    // Strength Logs
    dailyStrength.forEach(ex => {
      const cycleNum = Math.floor(d / 10);
      const baseWeight = 40 + (cycleNum * 2.5);

      for (let s = 1; s <= 3; s++) {
        // FIX: Round RPE to integer
        const rpeVal = Math.round(7 + (s * 0.5)); 
        
        historyLogs.push({
          workout_id: doneWorkout.id,
          exercise_id: ex.id,
          exercise_name: ex.name,
          set_number: s,
          reps: 8 + (s % 2),
          weight: baseWeight + (s * 2),
          rpe: rpeVal, // Integer
          calculated_1rm: Math.round((baseWeight + (s*2)) * 1.2),
          created_at: dateISO,
          updated_at: dateISO
        });
      }
    });

    // Cardio Logs
    dailyCardio.forEach(ex => {
      let dur = 20;
      let dist = 3;
      if (ex.name === 'Cycling') { dur = 30; dist = 10; }
      
      // FIX: Round Duration to integer
      const finalDur = Math.round(dur - (d * 0.1));

      historyCardio.push({
        user_id: userId,
        workout_id: doneWorkout.id,
        date: dateISO,
        created_at: dateISO,
        updated_at: dateISO,
        activity_type: ex.name,
        duration_minutes: finalDur, // Integer
        distance_km: dist,
        calories_burned: 200,
        average_heart_rate: 150
      });
    });
  }

  // INSERT BULK
  console.log(`📝 Inserting ${historyLogs.length} Strength Logs...`);
  const chunkSize = 200;
  for (let i = 0; i < historyLogs.length; i += chunkSize) {
    const { error } = await supabase.from('workout_logs').insert(historyLogs.slice(i, i + chunkSize));
    if (error) console.error("Error inserting logs:", error.message);
  }

  console.log(`🏃 Inserting ${historyCardio.length} Cardio Logs...`);
  const { error: cardioError } = await supabase.from('cardio_logs').insert(historyCardio);
  if (cardioError) console.error("Error inserting cardio:", cardioError.message);

  // ===========================================================================
  // 7. NUTRITION
  // ===========================================================================
  console.log('🍎 Adding Nutrition Data...');
  const { data: nutProgram } = await supabase.from('nutrition_programs').insert({
    user_id: userId,
    name: 'Volume Phase Diet',
    start_date: now,
    end_date: now,
    status: 'active'
  }).select().single();

  if (nutProgram) {
    const meals = [];
    for (let i = 0; i < 4; i++) {
        meals.push({
            program_id: nutProgram.id,
            meal_type: ['breakfast', 'lunch', 'dinner', 'snack'][i],
            food_name: `Meal Option ${i+1}`,
            calories: 600,
            protein_g: 40,
            carbs_g: 50,
            fats_g: 20
        });
    }
    await supabase.from('nutrition_meals').insert(meals);
  }

  console.log('✅ SEED COMPLETE!');
  console.log(`👉 Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});