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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          client_user_id: string | null
          created_at: string
          email: string | null
          goal: string
          id: string
          level: Database["public"]["Enums"]["client_level"]
          name: string
          notes: string | null
          started_at: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_user_id?: string | null
          created_at?: string
          email?: string | null
          goal?: string
          id?: string
          level?: Database["public"]["Enums"]["client_level"]
          name: string
          notes?: string | null
          started_at?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_user_id?: string | null
          created_at?: string
          email?: string | null
          goal?: string
          id?: string
          level?: Database["public"]["Enums"]["client_level"]
          name?: string
          notes?: string | null
          started_at?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          muscle_group: Database["public"]["Enums"]["muscle_group"]
          name: string
          trainer_id: string | null
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          muscle_group: Database["public"]["Enums"]["muscle_group"]
          name: string
          trainer_id?: string | null
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          muscle_group?: Database["public"]["Enums"]["muscle_group"]
          name?: string
          trainer_id?: string | null
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      tabata_favorite_exercises: {
        Row: {
          created_at: string
          id: string
          name: string
          rest_seconds: number
          trainer_id: string
          work_seconds: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          rest_seconds?: number
          trainer_id: string
          work_seconds?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          rest_seconds?: number
          trainer_id?: string
          work_seconds?: number
        }
        Relationships: []
      }
      tabata_routine_items: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          rest_seconds: number
          routine_id: string
          work_seconds: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          rest_seconds?: number
          routine_id: string
          work_seconds?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          rest_seconds?: number
          routine_id?: string
          work_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "tabata_routine_items_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "tabata_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      tabata_routines: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          name?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tabata_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          routine_id: string
          status: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          routine_id: string
          status?: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          routine_id?: string
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabata_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "tabata_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_items: {
        Row: {
          client_id: string
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps: string
          rest: string
          sets: number
          workout_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          reps?: string
          rest?: string
          sets?: number
          workout_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps?: string
          rest?: string
          sets?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          client_id: string
          completed: boolean
          created_at: string
          id: string
          log_date: string
          notes: string | null
          updated_at: string
          weight: string | null
          workout_item_id: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          updated_at?: string
          weight?: string | null
          workout_item_id: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          updated_at?: string
          weight?: string | null
          workout_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_workout_item_id_fkey"
            columns: ["workout_item_id"]
            isOneToOne: false
            referencedRelation: "workout_items"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          client_id: string
          created_at: string
          duration_weeks: number
          expires_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_weeks?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_weeks?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_tabata_session: { Args: { p_session_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_of: { Args: { _client_id: string }; Returns: boolean }
      is_trainer_of: { Args: { _client_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "trainer"
      client_level: "Principiante" | "Intermedio" | "Avanzato"
      muscle_group:
        | "Petto"
        | "Schiena"
        | "Spalle"
        | "Bicipiti"
        | "Tricipiti"
        | "Gambe"
        | "Glutei"
        | "Core"
        | "Cardio"
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
      app_role: ["admin", "trainer"],
      client_level: ["Principiante", "Intermedio", "Avanzato"],
      muscle_group: [
        "Petto",
        "Schiena",
        "Spalle",
        "Bicipiti",
        "Tricipiti",
        "Gambe",
        "Glutei",
        "Core",
        "Cardio",
      ],
    },
  },
} as const
