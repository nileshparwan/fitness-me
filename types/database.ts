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
      analytics_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          metadata: Json | null
          page_path: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
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
      cardio_sessions: {
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
          entry_sequence: number | null
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
          entry_sequence?: number | null
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
          entry_sequence?: number | null
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
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_catalog: {
        Row: {
          aliases: string[] | null
          category: string | null
          created_at: string | null
          description: string | null
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
          equipment?: string | null
          id?: string
          muscle_groups?: string[] | null
          name?: string
          video_url?: string | null
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          carbs_target: number | null
          created_at: string | null
          current_weight: number | null
          custom_description: string | null
          daily_calories: number | null
          fat_target: number | null
          goal_type: string
          id: string
          protein_target: number | null
          status: string | null
          target_body_fat_percent: number | null
          target_date: string | null
          target_weight: number | null
          updated_at: string | null
          user_id: string
          weekly_workouts: number | null
        }
        Insert: {
          carbs_target?: number | null
          created_at?: string | null
          current_weight?: number | null
          custom_description?: string | null
          daily_calories?: number | null
          fat_target?: number | null
          goal_type: string
          id?: string
          protein_target?: number | null
          status?: string | null
          target_body_fat_percent?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string | null
          user_id: string
          weekly_workouts?: number | null
        }
        Update: {
          carbs_target?: number | null
          created_at?: string | null
          current_weight?: number | null
          custom_description?: string | null
          daily_calories?: number | null
          fat_target?: number | null
          goal_type?: string
          id?: string
          protein_target?: number | null
          status?: string | null
          target_body_fat_percent?: number | null
          target_date?: string | null
          target_weight?: number | null
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
          user_id?: string
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
      strength_sets: {
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
          entry_sequence: number | null
          reps: number | null
          rest_seconds: number | null
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
          entry_sequence?: number | null
          reps?: number | null
          rest_seconds?: number | null
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
          entry_sequence?: number | null
          reps?: number | null
          rest_seconds?: number | null
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
      training_sessions: {
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
