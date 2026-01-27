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
          user_id?: string
        }
        Relationships: []
      }
      ai_processing_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          input_image_url: string | null
          input_text: string | null
          processed_at: string | null
          result_json: Json | null
          status: string | null
          task_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_image_url?: string | null
          input_text?: string | null
          processed_at?: string | null
          result_json?: Json | null
          status?: string | null
          task_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_image_url?: string | null
          input_text?: string | null
          processed_at?: string | null
          result_json?: Json | null
          status?: string | null
          task_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          ai_analysis: string | null
          arms_cm: number | null
          body_fat_percent: number | null
          chest_cm: number | null
          created_at: string | null
          date: string
          id: string
          muscle_mass_kg: number | null
          notes: string | null
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          thighs_cm: number | null
          user_id: string
          waist_cm: number | null
          weight: number | null
        }
        Insert: {
          ai_analysis?: string | null
          arms_cm?: number | null
          body_fat_percent?: number | null
          chest_cm?: number | null
          created_at?: string | null
          date: string
          id?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          thighs_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight?: number | null
        }
        Update: {
          ai_analysis?: string | null
          arms_cm?: number | null
          body_fat_percent?: number | null
          chest_cm?: number | null
          created_at?: string | null
          date?: string
          id?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          thighs_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      cardio_logs: {
        Row: {
          activity_type: string
          average_heart_rate: number | null
          average_pace: string | null
          calories_burned: number | null
          created_at: string | null
          date: string
          distance_km: number | null
          duration_minutes: number
          elevation_gain_m: number | null
          id: string
          max_heart_rate: number | null
          notes: string | null
          reps: number | null
          updated_at: string | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          activity_type: string
          average_heart_rate?: number | null
          average_pace?: string | null
          calories_burned?: number | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes: number
          elevation_gain_m?: number | null
          id?: string
          max_heart_rate?: number | null
          notes?: string | null
          reps?: number | null
          updated_at?: string | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          activity_type?: string
          average_heart_rate?: number | null
          average_pace?: string | null
          calories_burned?: number | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes?: number
          elevation_gain_m?: number | null
          id?: string
          max_heart_rate?: number | null
          notes?: string | null
          reps?: number | null
          updated_at?: string | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cardio_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "user_workout_summary"
            referencedColumns: ["workout_id"]
          },
          {
            foreignKeyName: "cardio_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          aliases: string[] | null
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          equipment: string | null
          id: string
          muscle_groups: string[] | null
          name: string
          video_url: string | null
        }
        Insert: {
          aliases?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          muscle_groups?: string[] | null
          name: string
          video_url?: string | null
        }
        Update: {
          aliases?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          muscle_groups?: string[] | null
          name?: string
          video_url?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string | null
          custom_description: string | null
          goal_type: string
          id: string
          status: string | null
          target_body_fat_percent: number | null
          target_date: string | null
          target_weight: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_description?: string | null
          goal_type: string
          id?: string
          status?: string | null
          target_body_fat_percent?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_description?: string | null
          goal_type?: string
          id?: string
          status?: string | null
          target_body_fat_percent?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          date: string
          fats_g: number | null
          fiber_g: number | null
          food_name: string | null
          id: string
          meal_type: string | null
          notes: string | null
          photo_url: string | null
          protein_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          date: string
          fats_g?: number | null
          fiber_g?: number | null
          food_name?: string | null
          id?: string
          meal_type?: string | null
          notes?: string | null
          photo_url?: string | null
          protein_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          date?: string
          fats_g?: number | null
          fiber_g?: number | null
          food_name?: string | null
          id?: string
          meal_type?: string | null
          notes?: string | null
          photo_url?: string | null
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          birth_date: string | null
          created_at: string | null
          display_name: string | null
          gender: string | null
          height: number | null
          id: string
          preferred_units: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          gender?: string | null
          height?: number | null
          id: string
          preferred_units?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          preferred_units?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      program_items: {
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
            foreignKeyName: "program_items_nutrition_log_id_fkey"
            columns: ["nutrition_log_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "user_workout_summary"
            referencedColumns: ["workout_id"]
          },
          {
            foreignKeyName: "program_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          created_at: string | null
          default_reps: number | null
          default_sets: number | null
          exercise_id: string | null
          id: string
          order_index: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          default_reps?: number | null
          default_sets?: number | null
          exercise_id?: string | null
          id?: string
          order_index: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          default_reps?: number | null
          default_sets?: number | null
          exercise_id?: string | null
          id?: string
          order_index?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          calculated_1rm: number | null
          created_at: string | null
          exercise_id: string | null
          exercise_name: string
          form_video_url: string | null
          group_id: string | null
          id: string
          is_dropset: boolean | null
          is_warmup: boolean | null
          notes: string | null
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          set_number: number
          tempo: string | null
          updated_at: string | null
          weight: number | null
          workout_id: string
        }
        Insert: {
          calculated_1rm?: number | null
          created_at?: string | null
          exercise_id?: string | null
          exercise_name: string
          form_video_url?: string | null
          group_id?: string | null
          id?: string
          is_dropset?: boolean | null
          is_warmup?: boolean | null
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_number: number
          tempo?: string | null
          updated_at?: string | null
          weight?: number | null
          workout_id: string
        }
        Update: {
          calculated_1rm?: number | null
          created_at?: string | null
          exercise_id?: string | null
          exercise_name?: string
          form_video_url?: string | null
          group_id?: string | null
          id?: string
          is_dropset?: boolean | null
          is_warmup?: boolean | null
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_number?: number
          tempo?: string | null
          updated_at?: string | null
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "user_workout_summary"
            referencedColumns: ["workout_id"]
          },
          {
            foreignKeyName: "workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string | null
          description: string | null
          frequency_per_week: number | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          frequency_per_week?: number | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          frequency_per_week?: number | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          ai_feedback: string | null
          created_at: string | null
          date: string
          duration_minutes: number | null
          id: string
          name: string
          notes: string | null
          overall_rating: number | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          name: string
          notes?: string | null
          overall_rating?: number | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          name?: string
          notes?: string | null
          overall_rating?: number | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      exercise_progress: {
        Row: {
          avg_rpe: number | null
          date: string | null
          exercise_name: string | null
          max_estimated_1rm: number | null
          max_reps: number | null
          max_weight: number | null
          user_id: string | null
          workout_count: number | null
        }
        Relationships: []
      }
      user_workout_summary: {
        Row: {
          average_rpe: number | null
          best_estimated_1rm: number | null
          date: string | null
          duration_minutes: number | null
          status: string | null
          total_sets: number | null
          total_volume: number | null
          user_id: string | null
          workout_id: string | null
          workout_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
