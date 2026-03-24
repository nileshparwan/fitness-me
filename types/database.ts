export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type NotificationType =
  | "goal_achieved"
  | "checkin_submitted"
  | "support_ticket_created"
  | "support_ticket_updated"
  | "support_ticket_comment_added"
  | "support_ticket_comment_edited"
  | "support_ticket_comment_deleted"
  | "support_ticket_status_changed"
  | "support_ticket_closed"
  | "support_ticket_reopened"

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          deleted_at: string
          finalized_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
          recoverable_until: string
          requested_at: string
          restored_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          finalized_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          recoverable_until: string
          requested_at?: string
          restored_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          finalized_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          recoverable_until?: string
          requested_at?: string
          restored_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: [
          {
            foreignKeyName: "ai_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          ai_analysis: string | null
          ankle_cm: number | null
          arms_cm: number | null
          bicep_left_cm: number | null
          bicep_right_cm: number | null
          bmi: number | null
          body_fat_percent: number | null
          bone_density_score: number | null
          calf_cm: number | null
          calves_cm: number | null
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
          subject_client_id: string | null
          subject_user_id: string | null
          thigh_left_cm: number | null
          thigh_right_cm: number | null
          thighs_cm: number | null
          updated_at: string | null
          user_id: string | null
          visceral_fat_level: number | null
          waist_cm: number | null
          weight: number | null
          wrist_cm: number | null
        }
        Insert: {
          ai_analysis?: string | null
          ankle_cm?: number | null
          arms_cm?: number | null
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          bmi?: number | null
          body_fat_percent?: number | null
          bone_density_score?: number | null
          calf_cm?: number | null
          calves_cm?: number | null
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
          subject_client_id?: string | null
          subject_user_id?: string | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          thighs_cm?: number | null
          updated_at?: string | null
          user_id?: string | null
          visceral_fat_level?: number | null
          waist_cm?: number | null
          weight?: number | null
          wrist_cm?: number | null
        }
        Update: {
          ai_analysis?: string | null
          ankle_cm?: number | null
          arms_cm?: number | null
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          bmi?: number | null
          body_fat_percent?: number | null
          bone_density_score?: number | null
          calf_cm?: number | null
          calves_cm?: number | null
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
          subject_client_id?: string | null
          subject_user_id?: string | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          thighs_cm?: number | null
          updated_at?: string | null
          user_id?: string | null
          visceral_fat_level?: number | null
          waist_cm?: number | null
          weight?: number | null
          wrist_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_measurements_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cardio_sessions: {
        Row: {
          activity_type: string
          average_heart_rate: number | null
          average_pace: string | null
          avg_cadence_rpm: number | null
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
          id: string
          indoor_outdoor: string | null
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
          average_pace?: string | null
          avg_cadence_rpm?: number | null
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
          id?: string
          indoor_outdoor?: string | null
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
          average_pace?: string | null
          avg_cadence_rpm?: number | null
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
          id?: string
          indoor_outdoor?: string | null
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
            foreignKeyName: "cardio_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cardio_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_auth: {
        Row: {
          client_id: string
          created_at: string
          created_by_user_id: string | null
          failed_attempts: number
          is_portal_enabled: boolean
          last_failed_at: string | null
          last_login_at: string | null
          locked_until: string | null
          password_hash: string
          password_updated_at: string
          status: Database["public"]["Enums"]["client_portal_auth_status"]
          updated_at: string
          updated_by_user_id: string | null
          username: string
          username_updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          failed_attempts?: number
          is_portal_enabled?: boolean
          last_failed_at?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          password_hash: string
          password_updated_at?: string
          status?: Database["public"]["Enums"]["client_portal_auth_status"]
          updated_at?: string
          updated_by_user_id?: string | null
          username: string
          username_updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          failed_attempts?: number
          is_portal_enabled?: boolean
          last_failed_at?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          password_hash?: string
          password_updated_at?: string
          status?: Database["public"]["Enums"]["client_portal_auth_status"]
          updated_at?: string
          updated_by_user_id?: string | null
          username?: string
          username_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_auth_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_auth_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_auth_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_checkins: {
        Row: {
          actioned_at: string | null
          checkin_data: Json
          created_at: string
          created_by_client_id: string | null
          created_by_user_id: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["client_checkin_status"]
          subject_client_id: string | null
          subject_user_id: string | null
          submitted_at: string
          updated_at: string
          urgent: boolean
        }
        Insert: {
          actioned_at?: string | null
          checkin_data?: Json
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["client_checkin_status"]
          subject_client_id?: string | null
          subject_user_id?: string | null
          submitted_at?: string
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          actioned_at?: string | null
          checkin_data?: Json
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["client_checkin_status"]
          subject_client_id?: string | null
          subject_user_id?: string | null
          submitted_at?: string
          updated_at?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_checkins_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_checkins_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_checkins_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_checkins_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feature_access: {
        Row: {
          access_level: Database["public"]["Enums"]["client_module_access_level"]
          client_id: string
          configured_by_user_id: string | null
          created_at: string
          module_key: Database["public"]["Enums"]["client_module_key"]
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["client_module_access_level"]
          client_id: string
          configured_by_user_id?: string | null
          created_at?: string
          module_key: Database["public"]["Enums"]["client_module_key"]
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["client_module_access_level"]
          client_id?: string
          configured_by_user_id?: string | null
          created_at?: string
          module_key?: Database["public"]["Enums"]["client_module_key"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_feature_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feature_access_configured_by_user_id_fkey"
            columns: ["configured_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meal_item_favorites: {
        Row: {
          calories: number | null
          carbs_g: number | null
          client_id: string
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          item_name: string
          last_used_at: string
          notes: string | null
          protein_g: number | null
          quantity: number | null
          unit: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          client_id: string
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          item_name: string
          last_used_at?: string
          notes?: string | null
          protein_g?: number | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          client_id?: string
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          item_name?: string
          last_used_at?: string
          notes?: string | null
          protein_g?: number | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_meal_item_favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_billing_plans: {
        Row: {
          billing_cycle_day: number | null
          billing_type: Database["public"]["Enums"]["billing_type"]
          client_id: string
          coach_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          monthly_amount: number | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          program_end_date: string | null
          program_start_date: string | null
          session_rate: number
          sessions_purchased: number
          sessions_used: number
          updated_at: string
        }
        Insert: {
          billing_cycle_day?: number | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          client_id: string
          coach_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          monthly_amount?: number | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          program_end_date?: string | null
          program_start_date?: string | null
          session_rate: number
          sessions_purchased?: number
          sessions_used?: number
          updated_at?: string
        }
        Update: {
          billing_cycle_day?: number | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          client_id?: string
          coach_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          monthly_amount?: number | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          program_end_date?: string | null
          program_start_date?: string | null
          session_rate?: number
          sessions_purchased?: number
          sessions_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_billing_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_billing_plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount: number
          client_id: string
          coach_id: string
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_date: string
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          coach_id: string
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          coach_id?: string
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          title: string
          type: NotificationType
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          title: string
          type: NotificationType
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          title?: string
          type?: NotificationType
          user_id?: string
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          amount: number | null
          billing_plan_id: string | null
          billing_type_snapshot: Database["public"]["Enums"]["billing_type"]
          client_id: string
          coach_id: string
          created_at: string
          id: string
          notes: string | null
          session_date: string
          session_rate_snapshot: number
          sessions_remaining_after: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          billing_plan_id?: string | null
          billing_type_snapshot: Database["public"]["Enums"]["billing_type"]
          client_id: string
          coach_id: string
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string
          session_rate_snapshot: number
          sessions_remaining_after?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          billing_plan_id?: string | null
          billing_type_snapshot?: Database["public"]["Enums"]["billing_type"]
          client_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string
          session_rate_snapshot?: number
          sessions_remaining_after?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "client_billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_logs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_plan_assignment_sessions: {
        Row: {
          assignment_id: string
          completed_at: string | null
          created_at: string
          default_slot: Database["public"]["Enums"]["session_slot"]
          estimated_duration_minutes: number | null
          id: string
          is_skipped: boolean
          metadata: Json
          notes: string | null
          sequence_no: number
          session_type: string
          template_session_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          default_slot?: Database["public"]["Enums"]["session_slot"]
          estimated_duration_minutes?: number | null
          id?: string
          is_skipped?: boolean
          metadata?: Json
          notes?: string | null
          sequence_no: number
          session_type?: string
          template_session_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          default_slot?: Database["public"]["Enums"]["session_slot"]
          estimated_duration_minutes?: number | null
          id?: string
          is_skipped?: boolean
          metadata?: Json
          notes?: string | null
          sequence_no?: number
          session_type?: string
          template_session_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_plan_assignment_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "client_plan_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_assignment_sessions_template_session_id_fkey"
            columns: ["template_session_id"]
            isOneToOne: false
            referencedRelation: "coach_plan_template_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_plan_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          coach_id: string
          created_at: string
          ended_on: string | null
          id: string
          name: string
          notes: string | null
          started_on: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          coach_id: string
          created_at?: string
          ended_on?: string | null
          id?: string
          name: string
          notes?: string | null
          started_on?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          coach_id?: string
          created_at?: string
          ended_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          started_on?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_plan_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coach_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sessions: {
        Row: {
          client_id: string
          created_at: string
          created_ip: string | null
          expires_at: string
          id: string
          last_seen_at: string | null
          revoked_at: string | null
          token_hash: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_ip?: string | null
          expires_at: string
          id?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_ip?: string | null
          expires_at?: string
          id?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_steps_logs: {
        Row: {
          client_id: string
          created_at: string
          created_by_client_id: string | null
          created_by_user_id: string | null
          id: string
          notes: string | null
          performed_on: string
          steps: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          performed_on: string
          steps: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          performed_on?: string
          steps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_steps_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_steps_logs_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_steps_logs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          archived_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by_client_id: string | null
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["client_task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["client_task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["client_task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by_user_id: string
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          first_name: string
          goals: string | null
          height_cm: number | null
          id: string
          is_archived: boolean
          last_name: string | null
          linked_user_id: string | null
          medical_flags: string | null
          notes: string | null
          phone: string | null
          primary_coach_id: string
          sex: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          first_name: string
          goals?: string | null
          height_cm?: number | null
          id?: string
          is_archived?: boolean
          last_name?: string | null
          linked_user_id?: string | null
          medical_flags?: string | null
          notes?: string | null
          phone?: string | null
          primary_coach_id: string
          sex?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string
          goals?: string | null
          height_cm?: number | null
          id?: string
          is_archived?: boolean
          last_name?: string | null
          linked_user_id?: string | null
          medical_flags?: string | null
          notes?: string | null
          phone?: string | null
          primary_coach_id?: string
          sex?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_coach_id_fkey"
            columns: ["primary_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notes: {
        Row: {
          archived_at: string | null
          client_id: string
          coach_id: string
          content: string
          created_at: string
          id: string
          is_shared_with_linked_user: boolean
          tag: Database["public"]["Enums"]["coach_note_tag"]
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["client_note_visibility"]
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          coach_id: string
          content: string
          created_at?: string
          id?: string
          is_shared_with_linked_user?: boolean
          tag?: Database["public"]["Enums"]["coach_note_tag"]
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["client_note_visibility"]
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          is_shared_with_linked_user?: boolean
          tag?: Database["public"]["Enums"]["coach_note_tag"]
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["client_note_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_plan_template_sessions: {
        Row: {
          created_at: string
          default_slot: Database["public"]["Enums"]["session_slot"]
          estimated_duration_minutes: number | null
          id: string
          metadata: Json
          notes: string | null
          sequence_no: number
          session_type: string
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_slot?: Database["public"]["Enums"]["session_slot"]
          estimated_duration_minutes?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          sequence_no: number
          session_type?: string
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_slot?: Database["public"]["Enums"]["session_slot"]
          estimated_duration_minutes?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          sequence_no?: number
          session_type?: string
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_plan_template_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coach_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_plan_templates: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_plan_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_macro_compliance: {
        Row: {
          actual_calories: number
          actual_carbs_g: number
          actual_fat_g: number
          actual_protein_g: number
          basis: string
          calories_compliant: boolean | null
          carbs_compliant: boolean | null
          fat_compliant: boolean | null
          id: string
          overall_compliant: boolean | null
          performed_on: string
          protein_compliant: boolean | null
          subject_client_id: string | null
          subject_user_id: string | null
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          target_source: string
          updated_at: string
        }
        Insert: {
          actual_calories?: number
          actual_carbs_g?: number
          actual_fat_g?: number
          actual_protein_g?: number
          basis: string
          calories_compliant?: boolean | null
          carbs_compliant?: boolean | null
          fat_compliant?: boolean | null
          id?: string
          overall_compliant?: boolean | null
          performed_on: string
          protein_compliant?: boolean | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          target_source: string
          updated_at?: string
        }
        Update: {
          actual_calories?: number
          actual_carbs_g?: number
          actual_fat_g?: number
          actual_protein_g?: number
          basis?: string
          calories_compliant?: boolean | null
          carbs_compliant?: boolean | null
          fat_compliant?: boolean | null
          id?: string
          overall_compliant?: boolean | null
          performed_on?: string
          protein_compliant?: boolean | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          target_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_macro_compliance_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_macro_compliance_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "exercise_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_goals: {
        Row: {
          assigned_by_id: string | null
          carbs_target: number | null
          created_at: string | null
          current_value: number | null
          current_weight: number | null
          custom_description: string | null
          daily_calories: number | null
          fat_target: number | null
          goal_direction: string
          goal_type: string
          check_in_interval_days: number | null
          id: string
          is_personal_goal: boolean
          linked_exercise_id: string | null
          linked_program_id: string | null
          notes: string | null
          priority: number
          protein_target: number | null
          review_date: string | null
          start_date: string
          start_value: number | null
          start_weight: number | null
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
          created_at?: string | null
          current_value?: number | null
          current_weight?: number | null
          custom_description?: string | null
          daily_calories?: number | null
          fat_target?: number | null
          goal_direction?: string
          goal_type: string
          check_in_interval_days?: number | null
          id?: string
          is_personal_goal?: boolean
          linked_exercise_id?: string | null
          linked_program_id?: string | null
          notes?: string | null
          priority?: number
          protein_target?: number | null
          review_date?: string | null
          start_date?: string
          start_value?: number | null
          start_weight?: number | null
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
          created_at?: string | null
          current_value?: number | null
          current_weight?: number | null
          custom_description?: string | null
          daily_calories?: number | null
          fat_target?: number | null
          goal_direction?: string
          goal_type?: string
          check_in_interval_days?: number | null
          id?: string
          is_personal_goal?: boolean
          linked_exercise_id?: string | null
          linked_program_id?: string | null
          notes?: string | null
          priority?: number
          protein_target?: number | null
          review_date?: string | null
          start_date?: string
          start_value?: number | null
          start_weight?: number | null
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
        Relationships: [
          {
            foreignKeyName: "fitness_goals_assigned_by_coach_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_goals_linked_exercise_id_fkey"
            columns: ["linked_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_goals_linked_program_id_fkey"
            columns: ["linked_program_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress_history: {
        Row: {
          current_value: number | null
          current_weight: number | null
          goal_id: string
          id: string
          progress_percent: number
          recorded_by_user_id: string | null
          snapshot_at: string
          source: "auto_sync" | "manual"
          status: string
          target_value: number | null
          target_weight: number | null
          user_id: string
        }
        Insert: {
          current_value?: number | null
          current_weight?: number | null
          goal_id: string
          id?: string
          progress_percent: number
          recorded_by_user_id?: string | null
          snapshot_at?: string
          source?: "auto_sync" | "manual"
          status?: string
          target_value?: number | null
          target_weight?: number | null
          user_id: string
        }
        Update: {
          current_value?: number | null
          current_weight?: number | null
          goal_id?: string
          id?: string
          progress_percent?: number
          recorded_by_user_id?: string | null
          snapshot_at?: string
          source?: "auto_sync" | "manual"
          status?: string
          target_value?: number | null
          target_weight?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "fitness_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_progress_history_recorded_by_user_id_fkey"
            columns: ["recorded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_progress_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_group_assignments: {
        Row: {
          assigned_by_user_id: string
          created_at: string
          end_date: string
          id: string
          meal_group_id: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["meal_group_assignment_status"]
          subject_client_id: string | null
          subject_user_id: string | null
          template_group_id: string
          updated_at: string
        }
        Insert: {
          assigned_by_user_id: string
          created_at?: string
          end_date: string
          id?: string
          meal_group_id: string
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["meal_group_assignment_status"]
          subject_client_id?: string | null
          subject_user_id?: string | null
          template_group_id: string
          updated_at?: string
        }
        Update: {
          assigned_by_user_id?: string
          created_at?: string
          end_date?: string
          id?: string
          meal_group_id?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["meal_group_assignment_status"]
          subject_client_id?: string | null
          subject_user_id?: string | null
          template_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_group_assignments_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_group_assignments_meal_group_id_fkey"
            columns: ["meal_group_id"]
            isOneToOne: false
            referencedRelation: "meal_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_group_assignments_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_group_assignments_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_group_assignments_template_group_id_fkey"
            columns: ["template_group_id"]
            isOneToOne: false
            referencedRelation: "meal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_group_items: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          created_by_user_id: string
          fat_g: number
          id: string
          meal_plan_id: string
          notes: string | null
          quantity: number | null
          planned_date: string | null
          planned_time: string | null
          position: number
          protein_g: number
          title: string
          type: Database["public"]["Enums"]["meal_item_type"]
          unit: string | null
          updated_at: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          created_by_user_id: string
          fat_g?: number
          id?: string
          meal_plan_id: string
          notes?: string | null
          quantity?: number | null
          planned_date?: string | null
          planned_time?: string | null
          position?: number
          protein_g?: number
          title: string
          type: Database["public"]["Enums"]["meal_item_type"]
          unit?: string | null
          updated_at?: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          created_by_user_id?: string
          fat_g?: number
          id?: string
          meal_plan_id?: string
          notes?: string | null
          quantity?: number | null
          planned_date?: string | null
          planned_time?: string | null
          position?: number
          protein_g?: number
          title?: string
          type?: Database["public"]["Enums"]["meal_item_type"]
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_group_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_group_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_group_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_group_plans: {
        Row: {
          created_at: string
          created_by_user_id: string
          day_of_week: Database["public"]["Enums"]["meal_day_of_week"]
          id: string
          label: string
          meal_group_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          day_of_week: Database["public"]["Enums"]["meal_day_of_week"]
          id?: string
          label: string
          meal_group_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          day_of_week?: Database["public"]["Enums"]["meal_day_of_week"]
          id?: string
          label?: string
          meal_group_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_group_plans_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_group_plans_meal_group_id_fkey"
            columns: ["meal_group_id"]
            isOneToOne: false
            referencedRelation: "meal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_group_plan_types: {
        Row: {
          created_at: string
          created_by_user_id: string
          id: string
          meal_plan_id: string
          position: number
          type: Database["public"]["Enums"]["meal_item_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          meal_plan_id: string
          position: number
          type: Database["public"]["Enums"]["meal_item_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          meal_plan_id?: string
          position?: number
          type?: Database["public"]["Enums"]["meal_item_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_group_plan_types_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_group_plan_types_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_group_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_groups: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_snapshot: boolean
          name: string
          notes: string | null
          owner_user_id: string
          source_group_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["meal_group_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_snapshot?: boolean
          name: string
          notes?: string | null
          owner_user_id: string
          source_group_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["meal_group_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_snapshot?: boolean
          name?: string
          notes?: string | null
          owner_user_id?: string
          source_group_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["meal_group_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_groups_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_groups_source_group_id_fkey"
            columns: ["source_group_id"]
            isOneToOne: false
            referencedRelation: "meal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_item_favorites: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          item_name: string
          last_used_at: string | null
          meal_type: Database["public"]["Enums"]["meal_log_type"] | null
          notes: string | null
          protein_g: number | null
          quantity: number | null
          subject_user_id: string
          unit: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          item_name: string
          last_used_at?: string | null
          meal_type?: Database["public"]["Enums"]["meal_log_type"] | null
          notes?: string | null
          protein_g?: number | null
          quantity?: number | null
          subject_user_id: string
          unit?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          item_name?: string
          last_used_at?: string | null
          meal_type?: Database["public"]["Enums"]["meal_log_type"] | null
          notes?: string | null
          protein_g?: number | null
          quantity?: number | null
          subject_user_id?: string
          unit?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_item_favorites_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_log_items: {
        Row: {
          calories: number | null
          carbs_g: number | null
          consumed_time: string | null
          created_at: string
          created_by_client_id: string | null
          created_by_user_id: string | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          is_quick_add: boolean
          item_name: string
          meal_log_id: string
          notes: string | null
          position: number
          protein_g: number | null
          quantity: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          consumed_time?: string | null
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          is_quick_add?: boolean
          item_name: string
          meal_log_id: string
          notes?: string | null
          position?: number
          protein_g?: number | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          consumed_time?: string | null
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          is_quick_add?: boolean
          item_name?: string
          meal_log_id?: string
          notes?: string | null
          position?: number
          protein_g?: number | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_items_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_items_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_log_sections: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          meal_group_id: string
          meal_type: Database["public"]["Enums"]["meal_log_type"]
          performed_on: string
          position: number
          subject_client_id: string | null
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          meal_group_id: string
          meal_type: Database["public"]["Enums"]["meal_log_type"]
          performed_on: string
          position: number
          subject_client_id?: string | null
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          meal_group_id?: string
          meal_type?: Database["public"]["Enums"]["meal_log_type"]
          performed_on?: string
          position?: number
          subject_client_id?: string | null
          subject_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_sections_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_sections_meal_group_id_fkey"
            columns: ["meal_group_id"]
            isOneToOne: false
            referencedRelation: "meal_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_sections_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_sections_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          created_at: string
          created_by_client_id: string | null
          created_by_user_id: string | null
          id: string
          meal_group_id: string | null
          meal_type: Database["public"]["Enums"]["meal_log_type"]
          notes: string | null
          performed_on: string
          subject_client_id: string | null
          subject_user_id: string | null
          total_calories: number
          total_carbs_g: number
          total_fat_g: number
          total_fiber_g: number
          total_protein_g: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          id?: string
          meal_group_id?: string | null
          meal_type: Database["public"]["Enums"]["meal_log_type"]
          notes?: string | null
          performed_on: string
          subject_client_id?: string | null
          subject_user_id?: string | null
          total_calories?: number
          total_carbs_g?: number
          total_fat_g?: number
          total_fiber_g?: number
          total_protein_g?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          id?: string
          meal_group_id?: string | null
          meal_type?: Database["public"]["Enums"]["meal_log_type"]
          notes?: string | null
          performed_on?: string
          subject_client_id?: string | null
          subject_user_id?: string | null
          total_calories?: number
          total_carbs_g?: number
          total_fat_g?: number
          total_fiber_g?: number
          total_protein_g?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_meal_group_id_fkey"
            columns: ["meal_group_id"]
            isOneToOne: false
            referencedRelation: "meal_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_assignment_meals: {
        Row: {
          assignment_id: string
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          item_name: string
          meal_type: Database["public"]["Enums"]["meal_log_type"]
          notes: string | null
          position: number
          protein_g: number | null
          quantity: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          item_name: string
          meal_type: Database["public"]["Enums"]["meal_log_type"]
          notes?: string | null
          position?: number
          protein_g?: number | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          item_name?: string
          meal_type?: Database["public"]["Enums"]["meal_log_type"]
          notes?: string | null
          position?: number
          protein_g?: number | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_assignment_meals_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_assignments: {
        Row: {
          archived_at: string | null
          assigned_by_user_id: string
          created_at: string
          daily_calorie_target: number | null
          daily_carbs_target_g: number | null
          daily_fat_target_g: number | null
          daily_protein_target_g: number | null
          end_date: string
          id: string
          meal_targets_json: Json
          name: string
          notes: string | null
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["meal_assignment_status"]
          subject_client_id: string | null
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_by_user_id: string
          created_at?: string
          daily_calorie_target?: number | null
          daily_carbs_target_g?: number | null
          daily_fat_target_g?: number | null
          daily_protein_target_g?: number | null
          end_date: string
          id?: string
          meal_targets_json?: Json
          name: string
          notes?: string | null
          plan_id: string
          start_date: string
          status?: Database["public"]["Enums"]["meal_assignment_status"]
          subject_client_id?: string | null
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_by_user_id?: string
          created_at?: string
          daily_calorie_target?: number | null
          daily_carbs_target_g?: number | null
          daily_fat_target_g?: number | null
          daily_protein_target_g?: number | null
          end_date?: string
          id?: string
          meal_targets_json?: Json
          name?: string
          notes?: string | null
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["meal_assignment_status"]
          subject_client_id?: string | null
          subject_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_assignments_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_assignments_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_assignments_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "meal_plan_meals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          archived_at: string | null
          created_at: string | null
          daily_calorie_target: number | null
          daily_carbs_target_g: number | null
          daily_fat_target_g: number | null
          daily_protein_target_g: number | null
          description: string | null
          end_date: string
          id: string
          is_public: boolean | null
          meal_targets_json: Json
          name: string
          notes: string | null
          start_date: string
          status: string
          subject_client_id: string | null
          subject_user_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          daily_calorie_target?: number | null
          daily_carbs_target_g?: number | null
          daily_fat_target_g?: number | null
          daily_protein_target_g?: number | null
          description?: string | null
          end_date: string
          id?: string
          is_public?: boolean | null
          meal_targets_json?: Json
          name: string
          notes?: string | null
          start_date: string
          status?: string
          subject_client_id?: string | null
          subject_user_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          daily_calorie_target?: number | null
          daily_carbs_target_g?: number | null
          daily_fat_target_g?: number | null
          daily_protein_target_g?: number | null
          description?: string | null
          end_date?: string
          id?: string
          is_public?: boolean | null
          meal_targets_json?: Json
          name?: string
          notes?: string | null
          start_date?: string
          status?: string
          subject_client_id?: string | null
          subject_user_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          compact_mode: boolean
          created_at: string
          default_calories: number | null
          default_carbs: number | null
          default_fat: number | null
          default_protein: number | null
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          height_cm: number | null
          id: string
          is_active: boolean
          onboarding_completed: boolean
          phone: string | null
          preferred_units: string
          role: Database["public"]["Enums"]["user_role"]
          sport_focus: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          compact_mode?: boolean
          created_at?: string
          default_calories?: number | null
          default_carbs?: number | null
          default_fat?: number | null
          default_protein?: number | null
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          is_active?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          preferred_units?: string
          role?: Database["public"]["Enums"]["user_role"]
          sport_focus?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          compact_mode?: boolean
          created_at?: string
          default_calories?: number | null
          default_carbs?: number | null
          default_fat?: number | null
          default_protein?: number | null
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          preferred_units?: string
          role?: Database["public"]["Enums"]["user_role"]
          sport_focus?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      strength_sets: {
        Row: {
          calculated_1rm: number | null
          created_at: string | null
          entry_sequence: number | null
          equipment_type: string | null
          exercise_id: string | null
          exercise_name: string
          form_video_url: string | null
          group_id: string | null
          id: string
          is_dropset: boolean | null
          is_warmup: boolean | null
          notes: string | null
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
          entry_sequence?: number | null
          equipment_type?: string | null
          exercise_id?: string | null
          exercise_name: string
          form_video_url?: string | null
          group_id?: string | null
          id?: string
          is_dropset?: boolean | null
          is_warmup?: boolean | null
          notes?: string | null
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
          entry_sequence?: number | null
          equipment_type?: string | null
          exercise_id?: string | null
          exercise_name?: string
          form_video_url?: string | null
          group_id?: string | null
          id?: string
          is_dropset?: boolean | null
          is_warmup?: boolean | null
          notes?: string | null
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
            foreignKeyName: "strength_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_catalog: {
        Row: {
          brand: string | null
          category: string
          categories: string[]
          created_at: string
          id: string
          is_global: boolean
          name: string
          nutrients: Json
          owner_user_id: string | null
          serving_label: string
        }
        Insert: {
          brand?: string | null
          category: string
          categories?: string[]
          created_at?: string
          id?: string
          is_global?: boolean
          name: string
          nutrients?: Json
          owner_user_id?: string | null
          serving_label: string
        }
        Update: {
          brand?: string | null
          category?: string
          categories?: string[]
          created_at?: string
          id?: string
          is_global?: boolean
          name?: string
          nutrients?: Json
          owner_user_id?: string | null
          serving_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_catalog_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          default_servings: number
          id: string
          is_active: boolean
          subject_profile_id: string
          subject_client_id: string | null
          subject_user_id: string | null
          supplement_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          default_servings?: number
          id?: string
          is_active?: boolean
          subject_profile_id: string
          subject_client_id?: string | null
          subject_user_id?: string | null
          supplement_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          default_servings?: number
          id?: string
          is_active?: boolean
          subject_profile_id?: string
          subject_client_id?: string | null
          subject_user_id?: string | null
          supplement_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_assignments_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_assignments_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "supplement_subject_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_assignments_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_assignments_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "supplement_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_subject_profiles: {
        Row: {
          created_at: string
          id: string
          nutrition_program: string | null
          status: string
          subject_client_id: string | null
          subject_user_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          workout_program: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nutrition_program?: string | null
          status?: string
          subject_client_id?: string | null
          subject_user_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          workout_program?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nutrition_program?: string | null
          status?: string
          subject_client_id?: string | null
          subject_user_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          workout_program?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplement_subject_profiles_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_subject_profiles_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_subject_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_subscriptions: {
        Row: {
          subscribed_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          subscribed_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          subscribed_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_subscriptions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "ticket_upvotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "training_plan_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          assigned_client_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_assigned_client_id_fkey"
            columns: ["assigned_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          ai_feedback: string | null
          assigned_by: string | null
          assigned_by_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by_client_id: string | null
          created_by_user_id: string | null
          date: string
          duration_minutes: number | null
          id: string
          location: string | null
          location_address: string | null
          location_label: string | null
          location_notes: string | null
          location_type:
            | Database["public"]["Enums"]["session_location_type"]
            | null
          name: string
          notes: string | null
          overall_rating: number | null
          perceived_exertion: number | null
          performed_on: string
          plan_assignment_id: string | null
          plan_id: string | null
          plan_session_id: string | null
          session_label: string | null
          session_slot: Database["public"]["Enums"]["session_slot"]
          sport_type: string | null
          started_at: string | null
          status: string | null
          subject_client_id: string | null
          subject_user_id: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          assigned_by?: string | null
          assigned_by_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          location_address?: string | null
          location_label?: string | null
          location_notes?: string | null
          location_type?:
            | Database["public"]["Enums"]["session_location_type"]
            | null
          name: string
          notes?: string | null
          overall_rating?: number | null
          perceived_exertion?: number | null
          performed_on?: string
          plan_assignment_id?: string | null
          plan_id?: string | null
          plan_session_id?: string | null
          session_label?: string | null
          session_slot?: Database["public"]["Enums"]["session_slot"]
          sport_type?: string | null
          started_at?: string | null
          status?: string | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          assigned_by?: string | null
          assigned_by_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_client_id?: string | null
          created_by_user_id?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          location_address?: string | null
          location_label?: string | null
          location_notes?: string | null
          location_type?:
            | Database["public"]["Enums"]["session_location_type"]
            | null
          name?: string
          notes?: string | null
          overall_rating?: number | null
          perceived_exertion?: number | null
          performed_on?: string
          plan_assignment_id?: string | null
          plan_id?: string | null
          plan_session_id?: string | null
          session_label?: string | null
          session_slot?: Database["public"]["Enums"]["session_slot"]
          sport_type?: string | null
          started_at?: string | null
          status?: string | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_coach_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_plan_assignment_id_fkey"
            columns: ["plan_assignment_id"]
            isOneToOne: false
            referencedRelation: "client_plan_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_plan_session_id_fkey"
            columns: ["plan_session_id"]
            isOneToOne: false
            referencedRelation: "client_plan_assignment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      coach_client_summary: {
        Row: {
          active_goals_count: number | null
          at_risk_goals_count: number | null
          checkins_last_30d: number | null
          client_id: string | null
          client_since: string | null
          client_status: Database["public"]["Enums"]["client_status"] | null
          coach_id: string | null
          completed_goals_count: number | null
          email: string | null
          full_name: string | null
          last_goal_update: string | null
          last_note_at: string | null
          last_payment_date: string | null
          last_pending_payment_date: string | null
          last_session_date: string | null
          linked_user_id: string | null
          mtd_revenue: number | null
          notes_last_30d: number | null
          pending_checkins: number | null
          pending_payments_count: number | null
          sessions_last_30d: number | null
          sessions_today_count: number | null
          sessions_today_pending_count: number | null
          urgent_checkins: number | null
          avatar_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_meal_group: {
        Args: { target_group_id: string }
        Returns: boolean
      }
      can_manage_meal_group: {
        Args: { target_group_id: string }
        Returns: boolean
      }
      can_read_user_data: {
        Args: { _subject: string; _viewer: string }
        Returns: boolean
      }
      compute_weekly_adherence: {
        Args: { _week_start?: string }
        Returns: undefined
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_coach_goal_history: {
        Args: { p_coach_id: string; p_limit?: number }
        Returns: {
          goal_id: string
          progress_percent: number
          snapshot_at: string
        }[]
      }
      has_client_coach_access: {
        Args: { target_client_id: string }
        Returns: boolean
      }
      has_nutrition_subject_access: {
        Args: {
          target_subject_client_id: string
          target_subject_user_id: string
        }
        Returns: boolean
      }
      is_linked_client_user: {
        Args: { target_client_id: string }
        Returns: boolean
      }
      is_sysadmin:
        | { Args: never; Returns: boolean }
        | { Args: { _uid: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      billing_type:
        | "per_session"
        | "session_package"
        | "monthly"
        | "program"
        | "hourly"
      checkin_status: "pending_review" | "reviewed" | "actioned"
      client_checkin_status: "pending" | "reviewed" | "actioned"
      client_module_access_level: "disabled" | "read_only" | "enabled"
      client_module_key:
        | "workouts"
        | "training_plan"
        | "meal_plan"
        | "meal_logging"
        | "steps_tracking"
        | "goals"
        | "check_ins"
        | "coach_notes"
        | "tasks"
      client_note_visibility: "private" | "visible_to_client"
      client_portal_auth_status: "active" | "blocked" | "removed"
      client_status: "active" | "paused" | "blocked" | "archived"
      client_task_status: "pending" | "completed" | "overdue"
      coach_note_tag:
        | "general"
        | "injury"
        | "nutrition"
        | "psychology"
        | "milestone"
      injury_severity: "mild" | "moderate" | "severe"
      meal_assignment_status: "draft" | "active" | "archived"
      meal_day_of_week: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
      meal_group_assignment_status:
        | "active"
        | "paused"
        | "completed"
        | "archived"
      meal_group_status: "draft" | "active" | "archived"
      meal_item_type:
        | "water"
        | "breakfast"
        | "snack"
        | "lunch"
        | "pre_workout_meal"
        | "post_workout_meal"
        | "dinner"
        | "protein_drink"
      meal_log_type:
        | "breakfast"
        | "snack"
        | "lunch"
        | "pre_workout_meal"
        | "post_workout_meal"
        | "dinner"
        | "protein_drink"
        | "water"
        | "snacks"
        | "other"
      nutrition_tracking_mode: "macro" | "habit" | "intuitive"
      payment_method: "cash" | "bank_transfer" | "card" | "other"
      payment_status: "pending" | "paid"
      session_location_type: "gym" | "home" | "outdoor" | "travel" | "other"
      session_slot: "morning" | "afternoon" | "evening" | "other"
      ticket_category:
        | "exercise_request"
        | "feature_request"
        | "bug_report"
        | "other"
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
      billing_type: [
        "per_session",
        "session_package",
        "monthly",
        "program",
        "hourly",
      ],
      checkin_status: ["pending_review", "reviewed", "actioned"],
      client_checkin_status: ["pending", "reviewed", "actioned"],
      client_module_access_level: ["disabled", "read_only", "enabled"],
      client_module_key: [
        "workouts",
        "training_plan",
        "meal_plan",
        "meal_logging",
        "steps_tracking",
        "goals",
        "check_ins",
        "coach_notes",
        "tasks",
      ],
      client_note_visibility: ["private", "visible_to_client"],
      client_portal_auth_status: ["active", "blocked", "removed"],
      client_status: ["active", "paused", "blocked", "archived"],
      client_task_status: ["pending", "completed", "overdue"],
      coach_note_tag: [
        "general",
        "injury",
        "nutrition",
        "psychology",
        "milestone",
      ],
      injury_severity: ["mild", "moderate", "severe"],
      meal_assignment_status: ["draft", "active", "archived"],
      meal_day_of_week: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      meal_group_assignment_status: [
        "active",
        "paused",
        "completed",
        "archived",
      ],
      meal_group_status: ["draft", "active", "archived"],
      meal_item_type: [
        "water",
        "breakfast",
        "snack",
        "lunch",
        "pre_workout_meal",
        "post_workout_meal",
        "dinner",
        "protein_drink",
      ],
      meal_log_type: [
        "breakfast",
        "snack",
        "lunch",
        "pre_workout_meal",
        "post_workout_meal",
        "dinner",
        "protein_drink",
        "water",
        "snacks",
        "other",
      ],
      nutrition_tracking_mode: ["macro", "habit", "intuitive"],
      payment_method: ["cash", "bank_transfer", "card", "other"],
      payment_status: ["pending", "paid"],
      session_location_type: ["gym", "home", "outdoor", "travel", "other"],
      session_slot: ["morning", "afternoon", "evening", "other"],
      ticket_category: [
        "exercise_request",
        "feature_request",
        "bug_report",
        "other",
      ],
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
