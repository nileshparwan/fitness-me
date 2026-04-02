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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
      billing_plans: {
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
            foreignKeyName: "client_billing_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      checkin_sleep: {
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
          subject_client_id: string | null
          subject_user_id: string | null
          total_duration_minutes: number | null
          updated_at: string
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
          subject_client_id?: string | null
          subject_user_id?: string | null
          total_duration_minutes?: number | null
          updated_at?: string
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
          subject_client_id?: string | null
          subject_user_id?: string | null
          total_duration_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_log_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_log_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      checkin_vitals: {
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
          subject_client_id: string | null
          subject_user_id: string | null
          systolic_bp: number | null
          updated_at: string
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
          subject_client_id?: string | null
          subject_user_id?: string | null
          systolic_bp?: number | null
          updated_at?: string
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
          subject_client_id?: string | null
          subject_user_id?: string | null
          systolic_bp?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vitals_log_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_log_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      checkins: {
        Row: {
          active_calories_burned: number | null
          active_minutes: number | null
          created_at: string
          date: string
          distance_km: number | null
          energy_level: number | null
          floors_climbed: number | null
          id: string
          raw_sync_data: Json | null
          sedentary_minutes: number | null
          sleep_hours: number | null
          source: Database["public"]["Enums"]["wearable_provider"]
          steps: number | null
          subject_client_id: string | null
          subject_user_id: string | null
          total_calories_burned: number | null
          updated_at: string
          water_intake_ml: number | null
        }
        Insert: {
          active_calories_burned?: number | null
          active_minutes?: number | null
          created_at?: string
          date: string
          distance_km?: number | null
          energy_level?: number | null
          floors_climbed?: number | null
          id?: string
          raw_sync_data?: Json | null
          sedentary_minutes?: number | null
          sleep_hours?: number | null
          source?: Database["public"]["Enums"]["wearable_provider"]
          steps?: number | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          total_calories_burned?: number | null
          updated_at?: string
          water_intake_ml?: number | null
        }
        Update: {
          active_calories_burned?: number | null
          active_minutes?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          energy_level?: number | null
          floors_climbed?: number | null
          id?: string
          raw_sync_data?: Json | null
          sedentary_minutes?: number | null
          sleep_hours?: number | null
          source?: Database["public"]["Enums"]["wearable_provider"]
          steps?: number | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          total_calories_burned?: number | null
          updated_at?: string
          water_intake_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_activity_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      client_activity: {
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
            foreignKeyName: "client_steps_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_steps_logs_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_steps_logs_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      client_auth_sessions: {
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
          {
            foreignKeyName: "client_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      client_credentials: {
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
            foreignKeyName: "client_auth_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      client_notes: {
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
            foreignKeyName: "coach_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      client_reviews: {
        Row: {
          actioned_at: string | null
          checkin_data: Json
          created_at: string
          created_by_client_id: string | null
          created_by_user_id: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["client_review_status"]
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
          status?: Database["public"]["Enums"]["client_review_status"]
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
          status?: Database["public"]["Enums"]["client_review_status"]
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
            foreignKeyName: "client_checkins_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
            foreignKeyName: "client_checkins_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      clients: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by_user_id: string
          date_of_birth: string | null
          display_name: string | null
          due_date: string | null
          email: string | null
          first_name: string
          fitness_level: Database["public"]["Enums"]["fitness_level"] | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          goals: string | null
          height: number | null
          id: string
          is_archived: boolean
          is_postpartum: boolean
          is_pregnant: boolean
          last_name: string | null
          linked_user_id: string | null
          medical_flags: string | null
          notes: string | null
          phone: string | null
          postpartum_since: string | null
          primary_coach_id: string
          sex: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          weight: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by_user_id: string
          date_of_birth?: string | null
          display_name?: string | null
          due_date?: string | null
          email?: string | null
          first_name: string
          fitness_level?: Database["public"]["Enums"]["fitness_level"] | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          goals?: string | null
          height?: number | null
          id?: string
          is_archived?: boolean
          is_postpartum?: boolean
          is_pregnant?: boolean
          last_name?: string | null
          linked_user_id?: string | null
          medical_flags?: string | null
          notes?: string | null
          phone?: string | null
          postpartum_since?: string | null
          primary_coach_id: string
          sex?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          weight?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by_user_id?: string
          date_of_birth?: string | null
          display_name?: string | null
          due_date?: string | null
          email?: string | null
          first_name?: string
          fitness_level?: Database["public"]["Enums"]["fitness_level"] | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          goals?: string | null
          height?: number | null
          id?: string
          is_archived?: boolean
          is_postpartum?: boolean
          is_pregnant?: boolean
          last_name?: string | null
          linked_user_id?: string | null
          medical_flags?: string | null
          notes?: string | null
          phone?: string | null
          postpartum_since?: string | null
          primary_coach_id?: string
          sex?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          weight?: number | null
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
      cycle_entries: {
        Row: {
          bloating: number | null
          cramps: number | null
          created_at: string
          cycle_length_days: number | null
          energy_level: number | null
          headache: boolean | null
          id: string
          logged_by_user_id: string | null
          mood: number | null
          notes: string | null
          period_end_date: string | null
          period_length_days: number | null
          period_start_date: string
          phase: Database["public"]["Enums"]["menstrual_cycle_phase"] | null
          subject_client_id: string | null
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          bloating?: number | null
          cramps?: number | null
          created_at?: string
          cycle_length_days?: number | null
          energy_level?: number | null
          headache?: boolean | null
          id?: string
          logged_by_user_id?: string | null
          mood?: number | null
          notes?: string | null
          period_end_date?: string | null
          period_length_days?: number | null
          period_start_date: string
          phase?: Database["public"]["Enums"]["menstrual_cycle_phase"] | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          bloating?: number | null
          cramps?: number | null
          created_at?: string
          cycle_length_days?: number | null
          energy_level?: number | null
          headache?: boolean | null
          id?: string
          logged_by_user_id?: string | null
          mood?: number | null
          notes?: string | null
          period_end_date?: string | null
          period_length_days?: number | null
          period_start_date?: string
          phase?: Database["public"]["Enums"]["menstrual_cycle_phase"] | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menstrual_cycles_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_cycles_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      deletion_requests: {
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
      device_tokens: {
        Row: {
          auth_secret: string
          created_at: string
          endpoint: string
          id: string
          public_key: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_secret: string
          created_at?: string
          endpoint: string
          id?: string
          public_key: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_secret?: string
          created_at?: string
          endpoint?: string
          id?: string
          public_key?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      diary_compliance: {
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
            foreignKeyName: "daily_macro_compliance_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          created_at: string
          created_by_client_id: string | null
          created_by_user_id: string | null
          id: string
          meal_type: Database["public"]["Enums"]["diary_entry_type"]
          notes: string | null
          nutrition_plan_id: string | null
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
          meal_type: Database["public"]["Enums"]["diary_entry_type"]
          notes?: string | null
          nutrition_plan_id?: string | null
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
          meal_type?: Database["public"]["Enums"]["diary_entry_type"]
          notes?: string | null
          nutrition_plan_id?: string | null
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
            foreignKeyName: "meal_logs_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
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
            foreignKeyName: "meal_logs_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      diary_favorites: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          item_name: string
          last_used_at: string | null
          meal_type: Database["public"]["Enums"]["diary_entry_type"] | null
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
          meal_type?: Database["public"]["Enums"]["diary_entry_type"] | null
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
          meal_type?: Database["public"]["Enums"]["diary_entry_type"] | null
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
      diary_items: {
        Row: {
          calories: number | null
          carbs_g: number | null
          consumed_time: string | null
          created_at: string
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
            foreignKeyName: "meal_log_items_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_sections: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          meal_type: Database["public"]["Enums"]["diary_entry_type"]
          nutrition_plan_id: string
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
          meal_type: Database["public"]["Enums"]["diary_entry_type"]
          nutrition_plan_id: string
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
          meal_type?: Database["public"]["Enums"]["diary_entry_type"]
          nutrition_plan_id?: string
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
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
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
            foreignKeyName: "meal_log_sections_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      exercises: {
        Row: {
          aliases: string[] | null
          category: Database["public"]["Enums"]["exercise_category"] | null
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
          category?: Database["public"]["Enums"]["exercise_category"] | null
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
          category?: Database["public"]["Enums"]["exercise_category"] | null
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
      feature_access: {
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
            foreignKeyName: "client_feature_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      goal_history: {
        Row: {
          current_value: number | null
          current_weight: number | null
          goal_id: string
          id: string
          progress_percent: number
          recorded_by_user_id: string | null
          snapshot_at: string
          source: string
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
          source?: string
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
          source?: string
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
            referencedRelation: "goals"
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
      goals: {
        Row: {
          assigned_by_id: string | null
          carbs_target: number | null
          check_in_interval_days: number | null
          created_at: string | null
          created_by_user_id: string
          current_value: number | null
          current_weight: number | null
          custom_description: string | null
          daily_calories: number | null
          fat_target: number | null
          goal_direction: string
          goal_type: string
          id: string
          is_personal_goal: boolean
          linked_exercise_id: string | null
          linked_program_id: string | null
          notes: string | null
          priority: number
          protein_target: number | null
          start_date: string
          start_value: number | null
          start_weight: number | null
          status: string
          target_date: string | null
          target_value: number | null
          target_weight: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by_id?: string | null
          carbs_target?: number | null
          check_in_interval_days?: number | null
          created_at?: string | null
          created_by_user_id: string
          current_value?: number | null
          current_weight?: number | null
          custom_description?: string | null
          daily_calories?: number | null
          fat_target?: number | null
          goal_direction?: string
          goal_type: string
          id?: string
          is_personal_goal?: boolean
          linked_exercise_id?: string | null
          linked_program_id?: string | null
          notes?: string | null
          priority?: number
          protein_target?: number | null
          start_date?: string
          start_value?: number | null
          start_weight?: number | null
          status?: string
          target_date?: string | null
          target_value?: number | null
          target_weight?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by_id?: string | null
          carbs_target?: number | null
          check_in_interval_days?: number | null
          created_at?: string | null
          created_by_user_id?: string
          current_value?: number | null
          current_weight?: number | null
          custom_description?: string | null
          daily_calories?: number | null
          fat_target?: number | null
          goal_direction?: string
          goal_type?: string
          id?: string
          is_personal_goal?: boolean
          linked_exercise_id?: string | null
          linked_program_id?: string | null
          notes?: string | null
          priority?: number
          protein_target?: number | null
          start_date?: string
          start_value?: number | null
          start_weight?: number | null
          status?: string
          target_date?: string | null
          target_value?: number | null
          target_weight?: number | null
          unit?: string | null
          updated_at?: string | null
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
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_goals_linked_program_id_fkey"
            columns: ["linked_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_goals_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          ankle_cm: number | null
          bicep_left: number | null
          bicep_right: number | null
          bmi: number | null
          body_fat_percent: number | null
          calf: number | null
          chest: number | null
          created_at: string | null
          date: string
          forearms_cm: number | null
          height_cm: number | null
          hips: number | null
          id: string
          muscle_mass_kg: number | null
          neck: number | null
          notes: string | null
          shoulder_cm: number | null
          skinfold_abdomen_mm: number | null
          skinfold_chest_mm: number | null
          skinfold_thigh_mm: number | null
          subject_client_id: string | null
          subject_user_id: string | null
          thigh_left: number | null
          thigh_right: number | null
          updated_at: string | null
          waist: number | null
          weight: number | null
          wrist_cm: number | null
        }
        Insert: {
          ankle_cm?: number | null
          bicep_left?: number | null
          bicep_right?: number | null
          bmi?: number | null
          body_fat_percent?: number | null
          calf?: number | null
          chest?: number | null
          created_at?: string | null
          date: string
          forearms_cm?: number | null
          height_cm?: number | null
          hips?: number | null
          id?: string
          muscle_mass_kg?: number | null
          neck?: number | null
          notes?: string | null
          shoulder_cm?: number | null
          skinfold_abdomen_mm?: number | null
          skinfold_chest_mm?: number | null
          skinfold_thigh_mm?: number | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          thigh_left?: number | null
          thigh_right?: number | null
          updated_at?: string | null
          waist?: number | null
          weight?: number | null
          wrist_cm?: number | null
        }
        Update: {
          ankle_cm?: number | null
          bicep_left?: number | null
          bicep_right?: number | null
          bmi?: number | null
          body_fat_percent?: number | null
          calf?: number | null
          chest?: number | null
          created_at?: string | null
          date?: string
          forearms_cm?: number | null
          height_cm?: number | null
          hips?: number | null
          id?: string
          muscle_mass_kg?: number | null
          neck?: number | null
          notes?: string | null
          shoulder_cm?: number | null
          skinfold_abdomen_mm?: number | null
          skinfold_chest_mm?: number | null
          skinfold_thigh_mm?: number | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          thigh_left?: number | null
          thigh_right?: number | null
          updated_at?: string | null
          waist?: number | null
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
            foreignKeyName: "body_measurements_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          checkin_bell_enabled: boolean
          checkin_push_enabled: boolean
          checkin_reminder_time: string
          created_at: string
          cycle_bell_enabled: boolean
          cycle_push_enabled: boolean
          cycle_reminder_days: number
          goal_bell_enabled: boolean
          goal_push_enabled: boolean
          goal_reminder_time: string
          meal_bell_enabled: boolean
          meal_push_enabled: boolean
          meal_reminder_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin_bell_enabled?: boolean
          checkin_push_enabled?: boolean
          checkin_reminder_time?: string
          created_at?: string
          cycle_bell_enabled?: boolean
          cycle_push_enabled?: boolean
          cycle_reminder_days?: number
          goal_bell_enabled?: boolean
          goal_push_enabled?: boolean
          goal_reminder_time?: string
          meal_bell_enabled?: boolean
          meal_push_enabled?: boolean
          meal_reminder_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checkin_bell_enabled?: boolean
          checkin_push_enabled?: boolean
          checkin_reminder_time?: string
          created_at?: string
          cycle_bell_enabled?: boolean
          cycle_push_enabled?: boolean
          cycle_reminder_days?: number
          goal_bell_enabled?: boolean
          goal_push_enabled?: boolean
          goal_reminder_time?: string
          meal_bell_enabled?: boolean
          meal_push_enabled?: boolean
          meal_reminder_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_plan_assignments: {
        Row: {
          assigned_by_user_id: string
          created_at: string
          end_date: string
          id: string
          notes: string | null
          nutrition_plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["nutrition_plan_assignment_status"]
          subject_client_id: string | null
          subject_user_id: string | null
          template_plan_id: string
          updated_at: string
        }
        Insert: {
          assigned_by_user_id: string
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          nutrition_plan_id: string
          start_date: string
          status?: Database["public"]["Enums"]["nutrition_plan_assignment_status"]
          subject_client_id?: string | null
          subject_user_id?: string | null
          template_plan_id: string
          updated_at?: string
        }
        Update: {
          assigned_by_user_id?: string
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          nutrition_plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["nutrition_plan_assignment_status"]
          subject_client_id?: string | null
          subject_user_id?: string | null
          template_plan_id?: string
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
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
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
            foreignKeyName: "meal_group_assignments_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
            columns: ["template_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plan_days: {
        Row: {
          created_at: string
          created_by_user_id: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          id: string
          label: string
          notes: string | null
          nutrition_plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          id?: string
          label: string
          notes?: string | null
          nutrition_plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          id?: string
          label?: string
          notes?: string | null
          nutrition_plan_id?: string
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
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plan_items: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          created_by_user_id: string
          fat_g: number
          id: string
          notes: string | null
          plan_day_id: string
          planned_date: string | null
          planned_time: string | null
          position: number
          protein_g: number
          quantity: number | null
          title: string
          type: Database["public"]["Enums"]["nutrition_plan_item_type"]
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
          notes?: string | null
          plan_day_id: string
          planned_date?: string | null
          planned_time?: string | null
          position?: number
          protein_g?: number
          quantity?: number | null
          title: string
          type: Database["public"]["Enums"]["nutrition_plan_item_type"]
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
          notes?: string | null
          plan_day_id?: string
          planned_date?: string | null
          planned_time?: string | null
          position?: number
          protein_g?: number
          quantity?: number | null
          title?: string
          type?: Database["public"]["Enums"]["nutrition_plan_item_type"]
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
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plan_types: {
        Row: {
          created_at: string
          created_by_user_id: string
          id: string
          plan_day_id: string
          position: number
          type: Database["public"]["Enums"]["nutrition_plan_item_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          plan_day_id: string
          position: number
          type: Database["public"]["Enums"]["nutrition_plan_item_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          plan_day_id?: string
          position?: number
          type?: Database["public"]["Enums"]["nutrition_plan_item_type"]
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
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          end_date: string | null
          id: string
          is_public: boolean
          is_snapshot: boolean
          name: string
          notes: string | null
          public_share_token: string
          source_plan_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["nutrition_plan_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean
          is_snapshot?: boolean
          name: string
          notes?: string | null
          public_share_token?: string
          source_plan_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["nutrition_plan_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean
          is_snapshot?: boolean
          name?: string
          notes?: string | null
          public_share_token?: string
          source_plan_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["nutrition_plan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_groups_owner_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_groups_source_group_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_targets: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          effective_from: string
          effective_to: string | null
          fat_g: number | null
          id: string
          protein_g: number | null
          source_id: string | null
          source_type: string
          subject_client_id: string | null
          subject_user_id: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          effective_from: string
          effective_to?: string | null
          fat_g?: number | null
          id?: string
          protein_g?: number | null
          source_id?: string | null
          source_type: string
          subject_client_id?: string | null
          subject_user_id?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          fat_g?: number | null
          id?: string
          protein_g?: number | null
          source_id?: string | null
          source_type?: string
          subject_client_id?: string | null
          subject_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_target_history_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_target_history_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      payment_events: {
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
            referencedRelation: "billing_plans"
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
            foreignKeyName: "payment_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      payments: {
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
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      personal_records: {
        Row: {
          best_estimated_1rm_kg: number
          best_reps: number | null
          best_set_at: string | null
          best_set_date: string | null
          best_weight_kg: number | null
          created_at: string
          exercise_id: string | null
          exercise_key: string | null
          exercise_name: string
          id: string
          source_execution_id: string | null
          source_set_id: string | null
          subject_client_id: string | null
          subject_key: string | null
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          best_estimated_1rm_kg: number
          best_reps?: number | null
          best_set_at?: string | null
          best_set_date?: string | null
          best_weight_kg?: number | null
          created_at?: string
          exercise_id?: string | null
          exercise_key?: string | null
          exercise_name: string
          id?: string
          source_execution_id?: string | null
          source_set_id?: string | null
          subject_client_id?: string | null
          subject_key?: string | null
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          best_estimated_1rm_kg?: number
          best_reps?: number | null
          best_set_at?: string | null
          best_set_date?: string | null
          best_weight_kg?: number | null
          created_at?: string
          exercise_id?: string | null
          exercise_key?: string | null
          exercise_name?: string
          id?: string
          source_execution_id?: string | null
          source_set_id?: string | null
          subject_client_id?: string | null
          subject_key?: string | null
          subject_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_prs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prs_source_execution_id_fkey"
            columns: ["source_execution_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prs_source_set_id_fkey"
            columns: ["source_set_id"]
            isOneToOne: false
            referencedRelation: "workout_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prs_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prs_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "exercise_prs_subject_user_id_fkey"
            columns: ["subject_user_id"]
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
          coach_specialty: Database["public"]["Enums"]["coach_specialty"] | null
          compact_mode: boolean
          created_at: string
          date_of_birth: string | null
          default_calories: number | null
          default_carbs: number | null
          default_fat: number | null
          default_nutrition_plan_id: string | null
          default_protein: number | null
          deleted_at: string | null
          deletion_reason: string | null
          due_date: string | null
          fitness_level: Database["public"]["Enums"]["fitness_level"] | null
          full_name: string | null
          gender: string | null
          has_password: boolean
          height: number | null
          id: string
          is_active: boolean
          is_blocked: boolean
          is_deleted: boolean
          is_onboarding_completed: boolean
          is_postpartum: boolean
          is_pregnant: boolean
          password_configured_at: string | null
          phone: string | null
          postpartum_since: string | null
          preferred_units: string
          recoverable_until: string | null
          restored_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          coach_specialty?:
            | Database["public"]["Enums"]["coach_specialty"]
            | null
          compact_mode?: boolean
          created_at?: string
          date_of_birth?: string | null
          default_calories?: number | null
          default_carbs?: number | null
          default_fat?: number | null
          default_nutrition_plan_id?: string | null
          default_protein?: number | null
          deleted_at?: string | null
          deletion_reason?: string | null
          due_date?: string | null
          fitness_level?: Database["public"]["Enums"]["fitness_level"] | null
          full_name?: string | null
          gender?: string | null
          has_password?: boolean
          height?: number | null
          id: string
          is_active?: boolean
          is_blocked?: boolean
          is_deleted?: boolean
          is_onboarding_completed?: boolean
          is_postpartum?: boolean
          is_pregnant?: boolean
          password_configured_at?: string | null
          phone?: string | null
          postpartum_since?: string | null
          preferred_units?: string
          recoverable_until?: string | null
          restored_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          coach_specialty?:
            | Database["public"]["Enums"]["coach_specialty"]
            | null
          compact_mode?: boolean
          created_at?: string
          date_of_birth?: string | null
          default_calories?: number | null
          default_carbs?: number | null
          default_fat?: number | null
          default_nutrition_plan_id?: string | null
          default_protein?: number | null
          deleted_at?: string | null
          deletion_reason?: string | null
          due_date?: string | null
          fitness_level?: Database["public"]["Enums"]["fitness_level"] | null
          full_name?: string | null
          gender?: string | null
          has_password?: boolean
          height?: number | null
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          is_deleted?: boolean
          is_onboarding_completed?: boolean
          is_postpartum?: boolean
          is_pregnant?: boolean
          password_configured_at?: string | null
          phone?: string | null
          postpartum_since?: string | null
          preferred_units?: string
          recoverable_until?: string | null
          restored_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_nutrition_plan_id_fkey"
            columns: ["default_nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      program_assignment_workouts: {
        Row: {
          assignment_id: string
          completed_at: string | null
          created_at: string
          default_slot: Database["public"]["Enums"]["workout_slot"]
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
          default_slot?: Database["public"]["Enums"]["workout_slot"]
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
          default_slot?: Database["public"]["Enums"]["workout_slot"]
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
            referencedRelation: "program_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_assignment_sessions_template_session_id_fkey"
            columns: ["template_session_id"]
            isOneToOne: false
            referencedRelation: "program_template_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      program_assignments: {
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
            foreignKeyName: "client_plan_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      program_template_workouts: {
        Row: {
          created_at: string
          default_slot: Database["public"]["Enums"]["workout_slot"]
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
          default_slot?: Database["public"]["Enums"]["workout_slot"]
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
          default_slot?: Database["public"]["Enums"]["workout_slot"]
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
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      program_templates: {
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
      program_workouts: {
        Row: {
          created_at: string | null
          day_label: string | null
          id: string
          item_type: string
          order_index: number | null
          program_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_label?: string | null
          id?: string
          item_type: string
          order_index?: number | null
          program_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_label?: string | null
          id?: string
          item_type?: string
          order_index?: number | null
          program_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
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
            foreignKeyName: "training_plans_assigned_client_id_fkey"
            columns: ["assigned_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      supplement_prescriptions: {
        Row: {
          assigned_by: string | null
          created_at: string
          default_servings: number
          id: string
          is_active: boolean
          subject_client_id: string | null
          subject_profile_id: string
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
          subject_client_id?: string | null
          subject_profile_id: string
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
          subject_client_id?: string | null
          subject_profile_id?: string
          subject_user_id?: string | null
          supplement_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_assignments_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_assignments_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "supplement_assignments_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "supplement_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_assignments_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "supplements"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_profiles: {
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
            foreignKeyName: "supplement_subject_profiles_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
        ]
      }
      supplements: {
        Row: {
          categories: string[] | null
          created_at: string
          created_by_user_id: string | null
          id: string
          is_global: boolean
          name: string
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_global?: boolean
          name: string
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_global?: boolean
          name?: string
        }
        Relationships: []
      }
      support_replies: {
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
            referencedRelation: "support_tickets"
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
      support_subscriptions: {
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
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
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
      support_votes: {
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
            referencedRelation: "support_tickets"
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
      tasks: {
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
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_tasks_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
      workout_cardio: {
        Row: {
          activity_type: string
          average_heart_rate: number | null
          average_pace: string | null
          avg_cadence_rpm: number | null
          avg_power_watts: number | null
          avg_speed: number | null
          calories_burned: number | null
          created_at: string | null
          date: string
          device_source: string | null
          distance: number | null
          duration_minutes: number
          elevation_gain_m: number | null
          entry_sequence: number | null
          execution_id: string | null
          id: string
          indoor_outdoor: string | null
          max_heart_rate: number | null
          max_speed_kmh: number | null
          notes: string | null
          reps: number | null
          sport_type: string | null
          training_load_score: number | null
          updated_at: string | null
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
          avg_speed?: number | null
          calories_burned?: number | null
          created_at?: string | null
          date?: string
          device_source?: string | null
          distance?: number | null
          duration_minutes: number
          elevation_gain_m?: number | null
          entry_sequence?: number | null
          execution_id?: string | null
          id?: string
          indoor_outdoor?: string | null
          max_heart_rate?: number | null
          max_speed_kmh?: number | null
          notes?: string | null
          reps?: number | null
          sport_type?: string | null
          training_load_score?: number | null
          updated_at?: string | null
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
          avg_speed?: number | null
          calories_burned?: number | null
          created_at?: string | null
          date?: string
          device_source?: string | null
          distance?: number | null
          duration_minutes?: number
          elevation_gain_m?: number | null
          entry_sequence?: number | null
          execution_id?: string | null
          id?: string
          indoor_outdoor?: string | null
          max_heart_rate?: number | null
          max_speed_kmh?: number | null
          notes?: string | null
          reps?: number | null
          sport_type?: string | null
          training_load_score?: number | null
          updated_at?: string | null
          vo2max_estimate?: number | null
          weather_conditions?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cardio_sessions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cardio_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_log_exercises: {
        Row: {
          created_at: string
          distance_km: number | null
          duration_minutes: number | null
          execution_id: string
          exercise_id: string | null
          exercise_name: string
          exercise_type: string
          id: string
          volume_kg: number | null
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          execution_id: string
          exercise_id?: string | null
          exercise_name: string
          exercise_type: string
          id?: string
          volume_kg?: number | null
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          execution_id?: string
          exercise_id?: string | null
          exercise_name?: string
          exercise_type?: string
          id?: string
          volume_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_execution_exercises_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_execution_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          actor_user_id: string
          created_at: string
          id: string
          logged_at: string
          notes: string | null
          performed_on: string
          source: string
          subject_client_id: string | null
          subject_key: string | null
          subject_user_id: string | null
          template_workout_id: string | null
          updated_at: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          performed_on: string
          source?: string
          subject_client_id?: string | null
          subject_key?: string | null
          subject_user_id?: string | null
          template_workout_id?: string | null
          updated_at?: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          performed_on?: string
          source?: string
          subject_client_id?: string | null
          subject_key?: string | null
          subject_user_id?: string | null
          template_workout_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_executions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_executions_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_executions_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "workout_executions_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_executions_template_workout_id_fkey"
            columns: ["template_workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          calculated_1rm: number | null
          created_at: string | null
          entry_sequence: number | null
          equipment_type: string | null
          execution_id: string | null
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
          execution_id?: string | null
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
          execution_id?: string | null
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
            foreignKeyName: "strength_sets_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
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
          location_type: Database["public"]["Enums"]["workout_location"] | null
          name: string
          notes: string | null
          overall_rating: number | null
          perceived_exertion: number | null
          performed_on: string
          plan_assignment_id: string | null
          plan_session_id: string | null
          session_label: string | null
          session_slot: Database["public"]["Enums"]["workout_slot"]
          sport_type: string | null
          started_at: string | null
          status: string | null
          subject_client_id: string | null
          subject_user_id: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
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
          location_type?: Database["public"]["Enums"]["workout_location"] | null
          name: string
          notes?: string | null
          overall_rating?: number | null
          perceived_exertion?: number | null
          performed_on?: string
          plan_assignment_id?: string | null
          plan_session_id?: string | null
          session_label?: string | null
          session_slot?: Database["public"]["Enums"]["workout_slot"]
          sport_type?: string | null
          started_at?: string | null
          status?: string | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
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
          location_type?: Database["public"]["Enums"]["workout_location"] | null
          name?: string
          notes?: string | null
          overall_rating?: number | null
          perceived_exertion?: number | null
          performed_on?: string
          plan_assignment_id?: string | null
          plan_session_id?: string | null
          session_label?: string | null
          session_slot?: Database["public"]["Enums"]["workout_slot"]
          sport_type?: string | null
          started_at?: string | null
          status?: string | null
          subject_client_id?: string | null
          subject_user_id?: string | null
          template_id?: string | null
          updated_at?: string | null
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
            foreignKeyName: "training_sessions_created_by_client_id_fkey"
            columns: ["created_by_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
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
            referencedRelation: "program_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_plan_session_id_fkey"
            columns: ["plan_session_id"]
            isOneToOne: false
            referencedRelation: "program_assignment_workouts"
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
            foreignKeyName: "training_sessions_subject_client_id_fkey"
            columns: ["subject_client_id"]
            isOneToOne: false
            referencedRelation: "coach_client_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "training_sessions_subject_user_id_fkey"
            columns: ["subject_user_id"]
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
        }
        Relationships: [
          {
            foreignKeyName: "clients_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _normalize_exercise_muscle_groups: {
        Args: { input_category: string; input_muscles: string[] }
        Returns: string[]
      }
      can_access_nutrition_plan: {
        Args: { target_group_id: string }
        Returns: boolean
      }
      can_manage_nutrition_plan: {
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
      get_coach_goal_history: {
        Args: { p_coach_id: string; p_limit?: number }
        Returns: {
          goal_id: string
          progress_percent: number
          snapshot_at: string
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
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
      is_active_or_historical_coach_for_student: {
        Args: { p_coach_id: string; p_student_id: string }
        Returns: boolean
      }
      is_client_primary_coach: {
        Args: { target_client_id: string }
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
      client_module_access_level: "disabled" | "read_only" | "enabled"
      client_module_key:
        | "workouts"
        | "program"
        | "nutrition_plan"
        | "diary"
        | "steps_tracking"
        | "goals"
        | "check_ins"
        | "coach_notes"
        | "tasks"
      client_note_visibility: "private" | "visible_to_client"
      client_portal_auth_status: "active" | "blocked" | "removed"
      client_review_status: "pending_review" | "reviewed" | "actioned"
      client_status: "active" | "paused" | "blocked" | "archived"
      client_task_status: "pending" | "completed" | "overdue"
      coach_note_tag:
        | "injury"
        | "nutrition"
        | "psychology"
        | "form"
        | "milestone"
        | "general"
      coach_specialty:
        | "general_fitness"
        | "strength_and_conditioning"
        | "weight_management"
        | "womens_health"
        | "prenatal_and_postnatal"
        | "yoga_and_pilates"
        | "endurance_and_running"
        | "sport_specific"
        | "rehabilitation"
      day_of_week: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
      diary_entry_type:
        | "breakfast"
        | "lunch"
        | "dinner"
        | "other"
        | "snack"
        | "pre_workout_meal"
        | "post_workout_meal"
        | "protein_drink"
        | "water"
      exercise_category: "strength" | "cardio" | "mind_body" | "mobility"
      fitness_level: "beginner" | "intermediate" | "advanced" | "athlete"
      gender_type: "male" | "female" | "non_binary" | "prefer_not_to_say"
      injury_severity: "mild" | "moderate" | "severe"
      menstrual_cycle_phase: "menstrual" | "follicular" | "ovulatory" | "luteal"
      nutrition_plan_assignment_status:
        | "active"
        | "paused"
        | "completed"
        | "archived"
      nutrition_plan_item_type:
        | "water"
        | "breakfast"
        | "snack"
        | "lunch"
        | "pre_workout_meal"
        | "post_workout_meal"
        | "dinner"
        | "protein_drink"
      nutrition_plan_status: "draft" | "active" | "archived"
      nutrition_tracking_mode: "macro" | "habit" | "intuitive"
      payment_method: "cash" | "bank_transfer" | "card" | "other"
      payment_status: "pending" | "paid"
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
      workout_location: "gym" | "home" | "outdoor" | "travel" | "other"
      workout_slot: "morning" | "afternoon" | "evening" | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_type: [
        "per_session",
        "session_package",
        "monthly",
        "program",
        "hourly",
      ],
      client_module_access_level: ["disabled", "read_only", "enabled"],
      client_module_key: [
        "workouts",
        "program",
        "nutrition_plan",
        "diary",
        "steps_tracking",
        "goals",
        "check_ins",
        "coach_notes",
        "tasks",
      ],
      client_note_visibility: ["private", "visible_to_client"],
      client_portal_auth_status: ["active", "blocked", "removed"],
      client_review_status: ["pending_review", "reviewed", "actioned"],
      client_status: ["active", "paused", "blocked", "archived"],
      client_task_status: ["pending", "completed", "overdue"],
      coach_note_tag: [
        "injury",
        "nutrition",
        "psychology",
        "form",
        "milestone",
        "general",
      ],
      coach_specialty: [
        "general_fitness",
        "strength_and_conditioning",
        "weight_management",
        "womens_health",
        "prenatal_and_postnatal",
        "yoga_and_pilates",
        "endurance_and_running",
        "sport_specific",
        "rehabilitation",
      ],
      day_of_week: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      diary_entry_type: [
        "breakfast",
        "lunch",
        "dinner",
        "other",
        "snack",
        "pre_workout_meal",
        "post_workout_meal",
        "protein_drink",
        "water",
      ],
      exercise_category: ["strength", "cardio", "mind_body", "mobility"],
      fitness_level: ["beginner", "intermediate", "advanced", "athlete"],
      gender_type: ["male", "female", "non_binary", "prefer_not_to_say"],
      injury_severity: ["mild", "moderate", "severe"],
      menstrual_cycle_phase: ["menstrual", "follicular", "ovulatory", "luteal"],
      nutrition_plan_assignment_status: [
        "active",
        "paused",
        "completed",
        "archived",
      ],
      nutrition_plan_item_type: [
        "water",
        "breakfast",
        "snack",
        "lunch",
        "pre_workout_meal",
        "post_workout_meal",
        "dinner",
        "protein_drink",
      ],
      nutrition_plan_status: ["draft", "active", "archived"],
      nutrition_tracking_mode: ["macro", "habit", "intuitive"],
      payment_method: ["cash", "bank_transfer", "card", "other"],
      payment_status: ["pending", "paid"],
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
      workout_location: ["gym", "home", "outdoor", "travel", "other"],
      workout_slot: ["morning", "afternoon", "evening", "other"],
    },
  },
} as const
