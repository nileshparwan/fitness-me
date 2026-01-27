import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Initialize Supabase Admin Client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const main = async () => {
  console.log('🚨 STARTING DATABASE RESET & SEED 🚨');

  // ==========================================
  // 1. CLEANUP (DELETE EXISTING DATA)
  // ==========================================
  console.log('🧹 Cleaning up existing data...');
  
  // Order matters due to Foreign Key constraints
  const tables = [
    'ai_processing_queue', 'ai_insights', 'nutrition_logs', 'body_metrics', 
    'cardio_logs', 'workout_logs', 'template_exercises', 'program_items',
    'workouts', 'workout_templates', 'programs', 'goals', 'profiles', 
    'exercise_library'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) console.error(`Error cleaning ${table}:`, error.message);
  }

  // Clean up Auth User (if exists)
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingAdmin = existingUsers.users.find(u => u.email === ADMIN_EMAIL);
  
  if (existingAdmin) {
    console.log('🗑️ Deleting existing admin user...');
    await supabase.auth.admin.deleteUser(existingAdmin.id);
  }

  console.log('✨ Database clean. Starting Seed...');

  // ==========================================
  // 2. SEED EXERCISE LIBRARY (15+ ENTRIES)
  // ==========================================
  console.log('💪 Seeding Exercise Library (15+ items)...');
  const exercises = [
    { name: 'Barbell Squat', category: 'legs', muscle_groups: ['quadriceps', 'glutes', 'core'], equipment: 'barbell', difficulty: 'intermediate' },
    { name: 'Bench Press', category: 'chest', muscle_groups: ['pectorals', 'triceps'], equipment: 'barbell', difficulty: 'intermediate' },
    { name: 'Deadlift', category: 'back', muscle_groups: ['hamstrings', 'glutes', 'lower back'], equipment: 'barbell', difficulty: 'advanced' },
    { name: 'Overhead Press', category: 'shoulders', muscle_groups: ['anterior deltoids'], equipment: 'barbell', difficulty: 'intermediate' },
    { name: 'Pull Up', category: 'back', muscle_groups: ['lats', 'biceps'], equipment: 'bodyweight', difficulty: 'intermediate' },
    { name: 'Dumbbell Curl', category: 'arms', muscle_groups: ['biceps'], equipment: 'dumbbell', difficulty: 'beginner' },
    { name: 'Tricep Rope Pushdown', category: 'arms', muscle_groups: ['triceps'], equipment: 'cable', difficulty: 'beginner' },
    { name: 'Leg Press', category: 'legs', muscle_groups: ['quadriceps'], equipment: 'machine', difficulty: 'beginner' },
    { name: 'Lat Pulldown', category: 'back', muscle_groups: ['lats'], equipment: 'cable', difficulty: 'beginner' },
    { name: 'Walking Lunges', category: 'legs', muscle_groups: ['quadriceps', 'glutes'], equipment: 'dumbbell', difficulty: 'intermediate' },
    { name: 'Face Pulls', category: 'shoulders', muscle_groups: ['rear deltoids'], equipment: 'cable', difficulty: 'beginner' },
    { name: 'Incline Dumbbell Press', category: 'chest', muscle_groups: ['upper chest'], equipment: 'dumbbell', difficulty: 'intermediate' },
    { name: 'Romanian Deadlift', category: 'legs', muscle_groups: ['hamstrings'], equipment: 'barbell', difficulty: 'intermediate' },
    { name: 'Plank', category: 'core', muscle_groups: ['core'], equipment: 'bodyweight', difficulty: 'beginner' },
    { name: 'Russian Twists', category: 'core', muscle_groups: ['obliques'], equipment: 'bodyweight', difficulty: 'beginner' },
    { name: 'Running', category: 'cardio', muscle_groups: ['legs', 'heart'], equipment: 'bodyweight', difficulty: 'beginner' },
    { name: 'Cycling', category: 'cardio', muscle_groups: ['legs', 'heart'], equipment: 'machine', difficulty: 'beginner' }
  ];

  const { data: exerciseData, error: exError } = await supabase
    .from('exercise_library')
    .insert(exercises)
    .select();

  if (exError) throw new Error(`Exercise insert failed: ${exError.message}`);
  
  // Helper to find ID by Name
  const getExId = (name: string) => exerciseData.find(e => e.name === name)?.id;


  // ==========================================
  // 3. CREATE ADMIN USER
  // ==========================================
  console.log(`👤 Creating Admin User: ${ADMIN_EMAIL}...`);
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Admin User' }
  });

  if (authError || !authData.user) throw new Error(`Auth create failed: ${authError?.message}`);
  const userId = authData.user.id;

  // ==========================================
  // 4. USER PROFILE & GOALS
  // ==========================================
  console.log('📝 Setting up Profile and Goals...');

  await supabase.from('profiles').insert({
    id: userId,
    display_name: 'Admin Coach',
    height: 180,
    birth_date: '1990-01-01',
    gender: 'male',
    activity_level: 'very_active',
    preferred_units: 'metric'
  });

  await supabase.from('goals').insert({
    user_id: userId,
    goal_type: 'strength',
    target_weight: 85,
    target_body_fat_percent: 12,
    target_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
    status: 'active'
  });

  // ==========================================
  // 5. WORKOUT TEMPLATES
  // ==========================================
  console.log('📋 Creating Templates...');
  
  const { data: template } = await supabase.from('workout_templates').insert({
    user_id: userId,
    name: 'Upper Body Power',
    description: 'Heavy compound movements for upper body mass.',
    frequency_per_week: 2,
    is_public: true
  }).select().single();

  if (template) {
    await supabase.from('template_exercises').insert([
      { template_id: template.id, exercise_id: getExId('Bench Press'), order_index: 1, default_sets: 4, default_reps: 5 },
      { template_id: template.id, exercise_id: getExId('Overhead Press'), order_index: 2, default_sets: 3, default_reps: 8 },
      { template_id: template.id, exercise_id: getExId('Pull Up'), order_index: 3, default_sets: 3, default_reps: 10 }
    ]);
  }

  // ==========================================
  // 6. PROGRAMS
  // ==========================================
  console.log('📁 Creating Program...');
  
  const { data: program } = await supabase.from('programs').insert({
    user_id: userId,
    name: 'Winter Arc 2024',
    description: 'Strength focused block.',
    is_active: true
  }).select().single();

  // ==========================================
  // 7. WORKOUTS (History & Active)
  // ==========================================
  console.log('🏋️ Creating Workout History (Active, Completed, Draft, Archived)...');

  // A. COMPLETED WORKOUTS (Past) - Useful for charts
  const historyDates = [7, 5, 2]; // Days ago
  
  for (const daysAgo of historyDates) {
    const { data: w } = await supabase.from('workouts').insert({
      user_id: userId,
      name: `Upper Body - ${daysAgo} Days Ago`,
      date: new Date(Date.now() - 86400000 * daysAgo).toISOString(),
      status: 'completed',
      duration_minutes: 65,
      overall_rating: 8
    }).select().single();

    if (w) {
      // Add logs with progressive overload logic (weight increases slightly each workout)
      const baseWeight = 80 + (7 - daysAgo) * 2.5; 
      await supabase.from('workout_logs').insert([
        { workout_id: w.id, exercise_id: getExId('Bench Press'), exercise_name: 'Bench Press', set_number: 1, reps: 5, weight: baseWeight, rpe: 7 },
        { workout_id: w.id, exercise_id: getExId('Bench Press'), exercise_name: 'Bench Press', set_number: 2, reps: 5, weight: baseWeight, rpe: 8 },
        { workout_id: w.id, exercise_id: getExId('Pull Up'), exercise_name: 'Pull Up', set_number: 1, reps: 10, weight: 0, rpe: 6 }
      ]);
    }
  }

  // B. ACTIVE WORKOUT (Today)
  const { data: activeW } = await supabase.from('workouts').insert({
    user_id: userId,
    name: 'Leg Day (Live)',
    date: new Date().toISOString(),
    status: 'active',
    duration_minutes: 20,
    notes: 'Currently in the gym'
  }).select().single();

  if (activeW) {
    await supabase.from('workout_logs').insert([
      { workout_id: activeW.id, exercise_id: getExId('Barbell Squat'), exercise_name: 'Barbell Squat', set_number: 1, reps: 5, weight: 100, rpe: 6, is_warmup: true },
      { workout_id: activeW.id, exercise_id: getExId('Barbell Squat'), exercise_name: 'Barbell Squat', set_number: 2, reps: 5, weight: 120, rpe: 8, is_warmup: false }
    ]);
  }

  // C. DRAFT WORKOUT (Future)
  const { data: draftW } = await supabase.from('workouts').insert({
    user_id: userId,
    name: 'Next Week Planning',
    date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days future
    status: 'draft',
    notes: 'Planning to attempt 1RM'
  }).select().single();

  // D. ARCHIVED WORKOUT
  await supabase.from('workouts').insert({
    user_id: userId,
    name: 'Old Routine 2023',
    date: new Date(Date.now() - 86400000 * 300).toISOString(),
    status: 'archived',
    notes: 'Deprecated'
  });

  // ==========================================
  // 8. LINK WORKOUTS TO PROGRAM
  // ==========================================
  if (program && draftW) {
    await supabase.from('program_items').insert([
      {
        program_id: program.id,
        workout_id: draftW.id,
        day_label: 'Monday',
        order_index: 0,
        item_type: 'workout'
      },
      {
        program_id: program.id,
        day_label: 'Tuesday',
        order_index: 1,
        item_type: 'nutrition' // Placeholder
      }
    ]);
  }

  // ==========================================
  // 9. OTHER LOGS (Cardio, Body, Nutrition, AI)
  // ==========================================
  console.log('📊 Seeding Metrics & AI Data...');

  // Cardio
  await supabase.from('cardio_logs').insert({
    user_id: userId,
    date: new Date().toISOString(),
    activity_type: 'running',
    duration_minutes: 30,
    distance_km: 5,
    calories_burned: 400
  });

  // Body Metrics
  await supabase.from('body_metrics').insert({
    user_id: userId,
    date: new Date().toISOString(),
    weight: 82.5,
    body_fat_percent: 14.5,
    photo_front_url: 'https://placehold.co/400x600/png'
  });

  // Nutrition
  await supabase.from('nutrition_logs').insert({
    user_id: userId,
    date: new Date().toISOString(),
    meal_type: 'lunch',
    food_name: 'Steak and Potatoes',
    calories: 800,
    protein_g: 60,
    carbs_g: 50,
    fats_g: 30
  });

  // AI Insights
  await supabase.from('ai_insights').insert({
    user_id: userId,
    insight_type: 'workout_feedback',
    title: 'Bench Press Strength Increasing',
    content: 'Your estimated 1RM has increased by 5% over the last 3 sessions.',
    priority: 'high'
  });

  // AI Queue
  await supabase.from('ai_processing_queue').insert({
    user_id: userId,
    input_text: 'Analyze my squat form',
    task_type: 'form_check',
    status: 'pending'
  });

  console.log('✅ SEED COMPLETE!');
  console.log(`👉 Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});