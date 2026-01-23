import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Initialize Supabase Admin Client (needed to manipulate auth.users)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const main = async () => {
  console.log('🌱 Starting database seed...');

  // ==========================================
  // 1. SEED EXERCISE LIBRARY (5+ Entries)
  // ==========================================
  console.log('💪 Seeding Exercise Library...');
//   const exercises = [
//     { name: 'Barbell Squat', category: 'legs', muscle_groups: ['quads', 'glutes'], equipment: 'barbell', difficulty: 'intermediate' },
//     { name: 'Bench Press', category: 'chest', muscle_groups: ['chest', 'triceps'], equipment: 'barbell', difficulty: 'intermediate' },
//     { name: 'Deadlift', category: 'back', muscle_groups: ['back', 'hamstrings'], equipment: 'barbell', difficulty: 'advanced' },
//     { name: 'Overhead Press', category: 'shoulders', muscle_groups: ['shoulders'], equipment: 'barbell', difficulty: 'intermediate' },
//     { name: 'Pull Up', category: 'back', muscle_groups: ['lats', 'biceps'], equipment: 'bodyweight', difficulty: 'intermediate' },
//     { name: 'Dumbbell Curl', category: 'arms', muscle_groups: ['biceps'], equipment: 'dumbbell', difficulty: 'beginner' },
//     { name: 'Tricep Extension', category: 'arms', muscle_groups: ['triceps'], equipment: 'cable', difficulty: 'beginner' },
//   ];

  // Upsert exercises to avoid duplicates
  const { data: exerciseData, error: exError } = await supabase
    .from('exercise_library')
    // .upsert(exercises, { onConflict: 'name' })
    .select();

  if (exError) throw new Error(`Exercise insert failed: ${exError.message}`);
  
  // Store IDs for later use
  const exIds = exerciseData.map(e => e.id);


  // ==========================================
  // 2. CREATE 5 DUMMY USERS
  // ==========================================
  console.log('👥 Creating 5 Users...');
  const users = [];

  for (let i = 1; i <= 5; i++) {
    const email = `athlete${i}_${Date.now()}@example.com`;
    const password = 'password123';

    // Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`Error creating user ${email}:`, authError.message);
      continue;
    }

    users.push(authData.user.id);
  }

  // ==========================================
  // 3. SEED USER-SPECIFIC TABLES (Loop through users)
  // ==========================================
  
  for (const userId of users) {
    console.log(`📝 Seeding data for User ID: ${userId}`);

    // --- A. PROFILES ---
    await supabase.from('profiles').upsert({
      id: userId,
      display_name: `Athlete ${userId.slice(0, 4)}`,
      height: 175 + Math.floor(Math.random() * 10),
      birth_date: '1995-01-01',
      gender: 'male',
      activity_level: 'very_active'
    });

    // --- B. GOALS ---
    await supabase.from('goals').insert({
      user_id: userId,
      goal_type: 'muscle_gain',
      target_weight: 85,
      target_body_fat_percent: 12,
      target_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(), // 90 days from now
    });

    // --- C. WORKOUT TEMPLATES ---
    const { data: template } = await supabase.from('workout_templates').insert({
      user_id: userId,
      name: 'Full Body A',
      description: 'Standard full body split',
      frequency_per_week: 3
    }).select().single();

    if (template) {
        // Add exercises to template
        await supabase.from('template_exercises').insert([
            { template_id: template.id, exercise_id: exIds[0], order_index: 1, default_sets: 3, default_reps: 8 },
            { template_id: template.id, exercise_id: exIds[1], order_index: 2, default_sets: 3, default_reps: 10 }
        ]);
    }

    // --- D. WORKOUTS (5 Past Workouts per User) ---
    for (let j = 1; j <= 5; j++) {
      const { data: workout } = await supabase.from('workouts').insert({
        user_id: userId,
        name: `Workout Session ${j}`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * j).toISOString(), // j days ago
        status: 'completed',
        duration_minutes: 60,
        overall_rating: 8
      }).select().single();

      if (workout) {
        // --- E. WORKOUT LOGS (3 Logs per Workout) ---
        const logs = [
            { workout_id: workout.id, exercise_id: exIds[0], exercise_name: 'Barbell Squat', set_number: 1, reps: 10, weight: 100, rpe: 7 },
            { workout_id: workout.id, exercise_id: exIds[0], exercise_name: 'Barbell Squat', set_number: 2, reps: 8, weight: 105, rpe: 8 },
            { workout_id: workout.id, exercise_id: exIds[1], exercise_name: 'Bench Press', set_number: 1, reps: 10, weight: 60, rpe: 7 }
        ];
        await supabase.from('workout_logs').insert(logs);
      }
    }

    // --- F. CARDIO LOGS ---
    await supabase.from('cardio_logs').insert([
        { user_id: userId, activity_type: 'running', duration_minutes: 30, distance_km: 5, date: new Date().toISOString() },
        { user_id: userId, activity_type: 'cycling', duration_minutes: 45, distance_km: 15, date: new Date().toISOString() }
    ]);

    // --- G. BODY METRICS ---
    await supabase.from('body_metrics').insert({
        user_id: userId,
        date: new Date().toISOString(),
        weight: 80,
        body_fat_percent: 15,
        muscle_mass_kg: 65
    });

    // --- H. NUTRITION LOGS ---
    await supabase.from('nutrition_logs').insert([
        { user_id: userId, date: new Date().toISOString(), meal_type: 'breakfast', food_name: 'Oats', calories: 300, protein_g: 10, carbs_g: 50, fats_g: 5 },
        { user_id: userId, date: new Date().toISOString(), meal_type: 'lunch', food_name: 'Chicken Rice', calories: 600, protein_g: 40, carbs_g: 60, fats_g: 10 }
    ]);
    
    // --- I. AI INSIGHTS ---
    await supabase.from('ai_insights').insert({
        user_id: userId,
        insight_type: 'progress_analysis',
        title: 'Good consistency',
        content: 'You have logged workouts 5 days in a row.',
        priority: 'medium'
    });
  }

  console.log('✅ Seed complete!');
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});