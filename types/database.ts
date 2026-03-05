export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          content: string
          created_at: string | null
          id: string
          insight_type: string
          is_dismissed: boolean | null
          is_read: boolean | null
          metadata: Json | null
          priority: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          insight_type: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          priority?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          insight_type?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          priority?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          metadata: Json | null
          page_path: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      account_deletion_requests: {
        Row: {
          deleted_at: string
          id: string
          metadata: Json | null
          reason: string | null
          recoverable_until: string
          requested_at: string
          restored_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          recoverable_until: string
          requested_at?: string
          restored_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          recoverable_until?: string
          requested_at?: string
          restored_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          ai_analysis: string | null
          ankle_cm: number | null
          arms_cm: number | null
          bmi: number | null
          bone_density_score: number | null
          calves_cm: number | null
          body_fat_percent: number | null
          chest_cm: number | null
          created_at: string | null
          date: string
          forearms_cm: number | null
          height_cm: number | null
          hips_cm: number | null
          id: string
          measurement_method: string | null
          muscle_mass_kg: number | null
          neck_cm: number | null
          notes: string | null
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          shoulder_cm: number | null
          skinfold_abdomen_mm: number | null
          skinfold_chest_mm: number | null
          skinfold_thigh_mm: number | null
          thighs_cm: number | null
          updated_at: string | null
          user_id: string
          visceral_fat_level: number | null
          waist_cm: number | null
          weight: number | null
          wrist_cm: number | null
        }
        Insert: {
          ai_analysis?: string | null
          ankle_cm?: number | null
          arms_cm?: number | null
          bmi?: number | null
          bone_density_score?: number | null
          calves_cm?: number | null
          body_fat_percent?: number | null
          chest_cm?: number | null
          created_at?: string | null
          date: string
          forearms_cm?: number | null
          height_cm?: number | null
          hips_cm?: number | null
          id?: string
          measurement_method?: string | null
          muscle_mass_kg?: number | null
          neck_cm?: number | null
          notes?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          shoulder_cm?: number | null
          skinfold_abdomen_mm?: number | null
          skinfold_chest_mm?: number | null
          skinfold_thigh_mm?: number | null
          thighs_cm?: number | null
          updated_at?: string | null
          user_id: string
          visceral_fat_level?: number | null
          waist_cm?: number | null
          weight?: number | null
          wrist_cm?: number | null
        }
        Update: {
          ai_analysis?: string | null
          ankle_cm?: number | null
          arms_cm?: number | null
          bmi?: number | null
          bone_density_score?: number | null
          calves_cm?: number | null
          body_fat_percent?: number | null
          chest_cm?: number | null
          created_at?: string | null
          date?: string
          forearms_cm?: number | null
          height_cm?: number | null
          hips_cm?: number | null
          id?: string
          measurement_method?: string | null
          muscle_mass_kg?: number | null
          neck_cm?: number | null
          notes?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          shoulder_cm?: number | null
          skinfold_abdomen_mm?: number | null
          skinfold_chest_mm?: number | null
          skinfold_thigh_mm?: number | null
          thighs_cm?: number | null
          updated_at?: string | null
          user_id?: string
          visceral_fat_level?: number | null
          waist_cm?: number | null
          weight?: number | null
          wrist_cm?: number | null
        }
        Relationships: []
      }
      cardio_sessions: {
        Row: {
          activity_type: string
          average_heart_rate: number | null
          avg_cadence_rpm: number | null
          average_pace: string | null
          avg_power_watts: number | null
          avg_speed_kmh: number | null
          calories_burned: number | null
          created_at: string | null
          date: string
          device_source: string | null
          distance_km: number | null
          duration_minutes: number
          elevation_gain_m: number | null
          entry_sequence: number | null
          indoor_outdoor: string | null
          id: string
          max_heart_rate: number | null
          max_speed_kmh: number | null
          notes: string | null
          reps: number | null
          route_gpx_url: string | null
          sport_type: string | null
          training_load_score: number | null
          updated_at: string | null
          user_id: string
          vo2max_estimate: number | null
          weather_conditions: string | null
          workout_id: string | null
        }
        Insert: {
          activity_type: string
          average_heart_rate?: number | null
          avg_cadence_rpm?: number | null
          average_pace?: string | null
          avg_power_watts?: number | null
          avg_speed_kmh?: number | null
          calories_burned?: number | null
          created_at?: string | null
          date?: string
          device_source?: string | null
          distance_km?: number | null
          duration_minutes: number
          elevation_gain_m?: number | null
          entry_sequence?: number | null
          indoor_outdoor?: string | null
          id?: string
          max_heart_rate?: number | null
          max_speed_kmh?: number | null
          notes?: string | null
          reps?: number | null
          route_gpx_url?: string | null
          sport_type?: string | null
          training_load_score?: number | null
          updated_at?: string | null
          user_id: string
          vo2max_estimate?: number | null
          weather_conditions?: string | null
          workout_id?: string | null
        }
        Update: {
          activity_type?: string
          average_heart_rate?: number | null
          avg_cadence_rpm?: number | null
          average_pace?: string | null
          avg_power_watts?: number | null
          avg_speed_kmh?: number | null
          calories_burned?: number | null
          created_at?: string | null
          date?: string
          device_source?: string | null
          distance_km?: number | null
          duration_minutes?: number
          elevation_gain_m?: number | null
          entry_sequence?: number | null
          indoor_outdoor?: string | null
          id?: string
          max_heart_rate?: number | null
          max_speed_kmh?: number | null
          notes?: string | null
          reps?: number | null
          route_gpx_url?: string | null
          sport_type?: string | null
          training_load_score?: number | null
          updated_at?: string | null
          user_id?: string
          vo2max_estimate?: number | null
          weather_conditions?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cardio_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_catalog: {
        Row: {
          aliases: string[] | null
          category: string | null
          contraindications: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          equipment: string | null
          force_type: string | null
          id: string
          is_approved: boolean
          is_custom: boolean
          is_unilateral: boolean
          joint_actions: string[] | null
          muscle_groups: string[] | null
          name: string
          sport_category: string[] | null
          video_url: string | null
        }
        Insert: {
          aliases?: string[] | null
          category?: string | null
          contraindications?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment?: string | null
          force_type?: string | null
          id?: string
          is_approved?: boolean
          is_custom?: boolean
          is_unilateral?: boolean
          joint_actions?: string[] | null
          muscle_groups?: string[] | null
          name: string
          sport_category?: string[] | null
          video_url?: string | null
        }
        Update: {
          aliases?: string[] | null
          category?: string | null
          contraindications?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment?: string | null
          force_type?: string | null
          id?: string
          is_approved?: boolean
          is_custom?: boolean
          is_unilateral?: boolean
          joint_actions?: string[] | null
          muscle_groups?: string[] | null
          name?: string
          sport_category?: string[] | null
          video_url?: string | null
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          assigned_by_id: string | null
          carbs_target: number | null
          current_value: number | null
          created_at: string | null
          current_weight: number | null
          custom_description: string | null
          daily_calories: number | null
          fat_target: number | null
          goal_type: string
          id: string
          priority: number
          protein_target: number | null
          review_date: string | null
          sport_specific_goal: string | null
          status: string | null
          target_body_fat_percent: number | null
          target_date: string | null
          target_value: number | null
          target_weight: number | null
          unit: string | null
          updated_at: string | null
          user_id: string
          weekly_workouts: number | null
        }
        Insert: {
          assigned_by_id?: string | null
          carbs_target?: number | null
          current_value?: number | null
          created_at?: string | null
          current_weight?: number | null
          custom_description?: string | null
          daily_calories?: number | null
          fat_target?: number | null
          goal_type: string
          id?: string
          priority?: number
          protein_target?: number | null
          review_date?: string | null
          sport_specific_goal?: string | null
          status?: string | null
          target_body_fat_percent?: number | null
          target_date?: string | null
          target_value?: number | null
          target_weight?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
          weekly_workouts?: number | null
        }
        Update: {
          assigned_by_id?: string | null
          carbs_target?: number | null
          current_value?: number | null
          created_at?: string | null
          current_weight?: number | null
          custom_description?: string | null
          daily_calories?: number | null
          fat_target?: number | null
          goal_type?: string
          id?: string
          priority?: number
          protein_target?: number | null
          review_date?: string | null
          sport_specific_goal?: string | null
          status?: string | null
          target_body_fat_percent?: number | null
          target_date?: string | null
          target_value?: number | null
          target_weight?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_workouts?: number | null
        }
        Relationships: []
      }
      meal_plan_meals: {
        Row: {
          alternatives: string | null
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          fats_g: number | null
          food_name: string
          id: string
          instructions: string | null
          meal_type: string
          position: number | null
          program_id: string
          protein_g: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          alternatives?: string | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          fats_g?: number | null
          food_name: string
          id?: string
          instructions?: string | null
          meal_type: string
          position?: number | null
          program_id: string
          protein_g?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          alternatives?: string | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          fats_g?: number | null
          food_name?: string
          id?: string
          instructions?: string | null
          meal_type?: string
          position?: number | null
          program_id?: string
          protein_g?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_meals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_public: boolean | null
          name: string
          notes: string | null
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_public?: boolean | null
          name: string
          notes?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_public?: boolean | null
          name?: string
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          height_cm: number | null
          id: string
          is_active: boolean
          onboarding_completed: boolean
          preferred_units: string
          role: Database["public"]["Enums"]["user_role"]
          sport_focus: string[] | null
          full_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          is_active?: boolean
          onboarding_completed?: boolean
          preferred_units?: string
          role?: Database["public"]["Enums"]["user_role"]
          sport_focus?: string[] | null
          full_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean
          onboarding_completed?: boolean
          preferred_units?: string
          role?: Database["public"]["Enums"]["user_role"]
          sport_focus?: string[] | null
          full_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_biofeedback: {
        Row: {
          created_at: string
          date: string
          energy_level: number | null
          id: string
          mood: number | null
          motivation: number | null
          muscle_soreness: number | null
          notes: string | null
          perceived_fatigue: number | null
          readiness_score: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          stress_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          energy_level?: number | null
          id?: string
          mood?: number | null
          motivation?: number | null
          muscle_soreness?: number | null
          notes?: string | null
          perceived_fatigue?: number | null
          readiness_score?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          energy_level?: number | null
          id?: string
          mood?: number | null
          motivation?: number | null
          muscle_soreness?: number | null
          notes?: string | null
          perceived_fatigue?: number | null
          readiness_score?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          active_calories_burned: number | null
          active_minutes: number | null
          created_at: string
          date: string
          distance_km: number | null
          floors_climbed: number | null
          id: string
          raw_sync_data: Json | null
          sedentary_minutes: number | null
          source: Database["public"]["Enums"]["wearable_provider"]
          steps: number | null
          total_calories_burned: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_calories_burned?: number | null
          active_minutes?: number | null
          created_at?: string
          date: string
          distance_km?: number | null
          floors_climbed?: number | null
          id?: string
          raw_sync_data?: Json | null
          sedentary_minutes?: number | null
          source?: Database["public"]["Enums"]["wearable_provider"]
          steps?: number | null
          total_calories_burned?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_calories_burned?: number | null
          active_minutes?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          floors_climbed?: number | null
          id?: string
          raw_sync_data?: Json | null
          sedentary_minutes?: number | null
          source?: Database["public"]["Enums"]["wearable_provider"]
          steps?: number | null
          total_calories_burned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vitals_log: {
        Row: {
          body_temperature_c: number | null
          created_at: string
          diastolic_bp: number | null
          hrv_ms: number | null
          id: string
          raw_sync_data: Json | null
          recorded_at: string
          respiratory_rate: number | null
          resting_heart_rate: number | null
          source: Database["public"]["Enums"]["wearable_provider"]
          spo2_percent: number | null
          systolic_bp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_temperature_c?: number | null
          created_at?: string
          diastolic_bp?: number | null
          hrv_ms?: number | null
          id?: string
          raw_sync_data?: Json | null
          recorded_at: string
          respiratory_rate?: number | null
          resting_heart_rate?: number | null
          source?: Database["public"]["Enums"]["wearable_provider"]
          spo2_percent?: number | null
          systolic_bp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_temperature_c?: number | null
          created_at?: string
          diastolic_bp?: number | null
          hrv_ms?: number | null
          id?: string
          raw_sync_data?: Json | null
          recorded_at?: string
          respiratory_rate?: number | null
          resting_heart_rate?: number | null
          source?: Database["public"]["Enums"]["wearable_provider"]
          spo2_percent?: number | null
          systolic_bp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_log: {
        Row: {
          awake_minutes: number | null
          created_at: string
          date: string
          deep_sleep_minutes: number | null
          id: string
          light_sleep_minutes: number | null
          raw_sync_data: Json | null
          rem_sleep_minutes: number | null
          sleep_end: string | null
          sleep_score: number | null
          sleep_start: string | null
          source: Database["public"]["Enums"]["wearable_provider"]
          total_duration_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          awake_minutes?: number | null
          created_at?: string
          date: string
          deep_sleep_minutes?: number | null
          id?: string
          light_sleep_minutes?: number | null
          raw_sync_data?: Json | null
          rem_sleep_minutes?: number | null
          sleep_end?: string | null
          sleep_score?: number | null
          sleep_start?: string | null
          source?: Database["public"]["Enums"]["wearable_provider"]
          total_duration_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          awake_minutes?: number | null
          created_at?: string
          date?: string
          deep_sleep_minutes?: number | null
          id?: string
          light_sleep_minutes?: number | null
          raw_sync_data?: Json | null
          rem_sleep_minutes?: number | null
          sleep_end?: string | null
          sleep_score?: number | null
          sleep_start?: string | null
          source?: Database["public"]["Enums"]["wearable_provider"]
          total_duration_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          adherence_rating: number | null
          carbs_g: number | null
          created_at: string
          date: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          notes: string | null
          protein_g: number | null
          sodium_mg: number | null
          sugar_g: number | null
          supplement_notes: string | null
          total_calories: number | null
          tracking_mode: Database["public"]["Enums"]["nutrition_tracking_mode"]
          updated_at: string
          user_id: string
          water_ml: number | null
        }
        Insert: {
          adherence_rating?: number | null
          carbs_g?: number | null
          created_at?: string
          date: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          notes?: string | null
          protein_g?: number | null
          sodium_mg?: number | null
          sugar_g?: number | null
          supplement_notes?: string | null
          total_calories?: number | null
          tracking_mode?: Database["public"]["Enums"]["nutrition_tracking_mode"]
          updated_at?: string
          user_id: string
          water_ml?: number | null
        }
        Update: {
          adherence_rating?: number | null
          carbs_g?: number | null
          created_at?: string
          date?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          notes?: string | null
          protein_g?: number | null
          sodium_mg?: number | null
          sugar_g?: number | null
          supplement_notes?: string | null
          total_calories?: number | null
          tracking_mode?: Database["public"]["Enums"]["nutrition_tracking_mode"]
          updated_at?: string
          user_id?: string
          water_ml?: number | null
        }
        Relationships: []
      }
      nutrition_meals: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food_description: string | null
          id: string
          log_id: string
          meal_time: string | null
          meal_type: string | null
          photo_url: string | null
          protein_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_description?: string | null
          id?: string
          log_id: string
          meal_time?: string | null
          meal_type?: string | null
          photo_url?: string | null
          protein_g?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_description?: string | null
          id?: string
          log_id?: string
          meal_time?: string | null
          meal_type?: string | null
          photo_url?: string | null
          protein_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_meals_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_checkins: {
        Row: {
          avg_energy: number | null
          avg_sleep_hours: number | null
          avg_soreness: number | null
          avg_steps: number | null
          review_feedback: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          id: string
          morning_weight_avg: number | null
          nutrition_adherence_days: number | null
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          status: Database["public"]["Enums"]["checkin_status"]
          updated_at: string
          user_id: string
          user_notes: string | null
          waist_cm: number | null
          week_start_date: string
          workouts_assigned: number | null
          workouts_completed: number | null
        }
        Insert: {
          avg_energy?: number | null
          avg_sleep_hours?: number | null
          avg_soreness?: number | null
          avg_steps?: number | null
          review_feedback?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          id?: string
          morning_weight_avg?: number | null
          nutrition_adherence_days?: number | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          status?: Database["public"]["Enums"]["checkin_status"]
          updated_at?: string
          user_id: string
          user_notes?: string | null
          waist_cm?: number | null
          week_start_date: string
          workouts_assigned?: number | null
          workouts_completed?: number | null
        }
        Update: {
          avg_energy?: number | null
          avg_sleep_hours?: number | null
          avg_soreness?: number | null
          avg_steps?: number | null
          review_feedback?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          id?: string
          morning_weight_avg?: number | null
          nutrition_adherence_days?: number | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          status?: Database["public"]["Enums"]["checkin_status"]
          updated_at?: string
          user_id?: string
          user_notes?: string | null
          waist_cm?: number | null
          week_start_date?: string
          workouts_assigned?: number | null
          workouts_completed?: number | null
        }
        Relationships: []
      }
      injuries: {
        Row: {
          affects_training: boolean
          body_part: string
          support_notes: string | null
          created_at: string
          description: string | null
          id: string
          injury_type: string | null
          is_active: boolean
          medical_clearance: boolean
          onset_date: string | null
          resolved_date: string | null
          severity: Database["public"]["Enums"]["injury_severity"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affects_training?: boolean
          body_part: string
          support_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          injury_type?: string | null
          is_active?: boolean
          medical_clearance?: boolean
          onset_date?: string | null
          resolved_date?: string | null
          severity?: Database["public"]["Enums"]["injury_severity"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affects_training?: boolean
          body_part?: string
          support_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          injury_type?: string | null
          is_active?: boolean
          medical_clearance?: boolean
          onset_date?: string | null
          resolved_date?: string | null
          severity?: Database["public"]["Enums"]["injury_severity"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wearable_integrations: {
        Row: {
          access_token_ref: string | null
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          metadata: Json | null
          provider: Database["public"]["Enums"]["wearable_provider"]
          refresh_token_ref: string | null
          sync_scope: string[] | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ref?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          metadata?: Json | null
          provider: Database["public"]["Enums"]["wearable_provider"]
          refresh_token_ref?: string | null
          sync_scope?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ref?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["wearable_provider"]
          refresh_token_ref?: string | null
          sync_scope?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assigned_programs: {
        Row: {
          assigned_by_id: string | null
          program_notes: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          meal_plan_id: string | null
          program_type: string | null
          start_date: string | null
          user_id: string
          training_plan_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_by_id?: string | null
          program_notes?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          meal_plan_id?: string | null
          program_type?: string | null
          start_date?: string | null
          user_id: string
          training_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by_id?: string | null
          program_notes?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          meal_plan_id?: string | null
          program_type?: string | null
          start_date?: string | null
          user_id?: string
          training_plan_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      training_plan_items: {
        Row: {
          created_at: string | null
          day_label: string | null
          id: string
          item_type: string
          nutrition_log_id: string | null
          order_index: number | null
          program_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_label?: string | null
          id?: string
          item_type: string
          nutrition_log_id?: string | null
          order_index?: number | null
          program_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_label?: string | null
          id?: string
          item_type?: string
          nutrition_log_id?: string | null
          order_index?: number | null
          program_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      strength_sets: {
        Row: {
          calculated_1rm: number | null
          created_at: string | null
          equipment_type: string | null
          exercise_id: string | null
          exercise_name: string
          form_video_url: string | null
          group_id: string | null
          id: string
          is_dropset: boolean | null
          is_warmup: boolean | null
          notes: string | null
          entry_sequence: number | null
          paused: boolean
          reps: number | null
          rest_seconds: number | null
          rir: number | null
          rpe: number | null
          set_number: number
          side: string | null
          tempo: string | null
          touch_and_go: boolean
          updated_at: string | null
          weight: number | null
          workout_id: string
        }
        Insert: {
          calculated_1rm?: number | null
          created_at?: string | null
          equipment_type?: string | null
          exercise_id?: string | null
          exercise_name: string
          form_video_url?: string | null
          group_id?: string | null
          id?: string
          is_dropset?: boolean | null
          is_warmup?: boolean | null
          notes?: string | null
          entry_sequence?: number | null
          paused?: boolean
          reps?: number | null
          rest_seconds?: number | null
          rir?: number | null
          rpe?: number | null
          set_number: number
          side?: string | null
          tempo?: string | null
          touch_and_go?: boolean
          updated_at?: string | null
          weight?: number | null
          workout_id: string
        }
        Update: {
          calculated_1rm?: number | null
          created_at?: string | null
          equipment_type?: string | null
          exercise_id?: string | null
          exercise_name?: string
          form_video_url?: string | null
          group_id?: string | null
          id?: string
          is_dropset?: boolean | null
          is_warmup?: boolean | null
          notes?: string | null
          entry_sequence?: number | null
          paused?: boolean
          reps?: number | null
          rest_seconds?: number | null
          rir?: number | null
          rpe?: number | null
          set_number?: number
          side?: string | null
          tempo?: string | null
          touch_and_go?: boolean
          updated_at?: string | null
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          description: string
          id: string
          is_public: boolean
          metadata: Json
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description: string
          id?: string
          is_public?: boolean
          metadata?: Json
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          metadata?: Json
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_upvotes: {
        Row: {
          created_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_upvotes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          assigned_by: string | null
          ai_feedback: string | null
          assigned_by_id: string | null
          created_at: string | null
          date: string
          duration_minutes: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          overall_rating: number | null
          perceived_exertion: number | null
          plan_id: string | null
          sport_type: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          ai_feedback?: string | null
          assigned_by_id?: string | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          overall_rating?: number | null
          perceived_exertion?: number | null
          plan_id?: string | null
          sport_type?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          ai_feedback?: string | null
          assigned_by_id?: string | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          overall_rating?: number | null
          perceived_exertion?: number | null
          plan_id?: string | null
          sport_type?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      weekly_training_volume: {
        Row: {
          user_id: string | null
          week_start: string | null
          total_volume_kg: number | null
          sessions_count: number | null
          total_sets: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      checkin_status: "pending_review" | "reviewed" | "actioned"
      injury_severity: "mild" | "moderate" | "severe"
      nutrition_tracking_mode: "macro" | "habit" | "intuitive"
      ticket_category: "exercise_request" | "feature_request" | "bug_report" | "other"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "sysadmin" | "user"
      wearable_provider:
        | "garmin"
        | "apple_health"
        | "google_fit"
        | "oura"
        | "whoop"
        | "polar"
        | "strava"
        | "fitbit"
        | "manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      checkin_status: ["pending_review", "reviewed", "actioned"],
      injury_severity: ["mild", "moderate", "severe"],
      nutrition_tracking_mode: ["macro", "habit", "intuitive"],
      ticket_category: ["exercise_request", "feature_request", "bug_report", "other"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["sysadmin", "user"],
      wearable_provider: [
        "garmin",
        "apple_health",
        "google_fit",
        "oura",
        "whoop",
        "polar",
        "strava",
        "fitbit",
        "manual",
      ],
    },
  },
} as const
