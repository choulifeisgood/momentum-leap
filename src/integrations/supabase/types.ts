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
      achievements: {
        Row: {
          badge_description: string | null
          badge_name: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          bug_report: string | null
          confusing: string | null
          created_at: string
          id: string
          rating: number | null
          return_reason: string | null
          useful: string | null
          user_id: string
        }
        Insert: {
          bug_report?: string | null
          confusing?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          return_reason?: string | null
          useful?: string | null
          user_id: string
        }
        Update: {
          bug_report?: string | null
          confusing?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          return_reason?: string | null
          useful?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          biggest_obstacle: string | null
          created_at: string
          date: string
          deep_work_minutes: number | null
          energy_level: number | null
          exercise_today: boolean | null
          focus_level: number | null
          healthy_eating_rating: number | null
          id: string
          main_task_completed: boolean | null
          main_win: string | null
          sleep_hours: number | null
          stress_level: number | null
          tomorrow_main_task: string | null
          user_id: string
        }
        Insert: {
          biggest_obstacle?: string | null
          created_at?: string
          date?: string
          deep_work_minutes?: number | null
          energy_level?: number | null
          exercise_today?: boolean | null
          focus_level?: number | null
          healthy_eating_rating?: number | null
          id?: string
          main_task_completed?: boolean | null
          main_win?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          tomorrow_main_task?: string | null
          user_id: string
        }
        Update: {
          biggest_obstacle?: string | null
          created_at?: string
          date?: string
          deep_work_minutes?: number | null
          energy_level?: number | null
          exercise_today?: boolean | null
          focus_level?: number | null
          healthy_eating_rating?: number | null
          id?: string
          main_task_completed?: boolean | null
          main_win?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          tomorrow_main_task?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          difficulty: string | null
          estimated_minutes: number | null
          id: string
          planned_time: string | null
          status: string
          task_date: string
          task_type: string | null
          title: string
          user_id: string
          weekly_goal_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          difficulty?: string | null
          estimated_minutes?: number | null
          id?: string
          planned_time?: string | null
          status?: string
          task_date?: string
          task_type?: string | null
          title: string
          user_id: string
          weekly_goal_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          difficulty?: string | null
          estimated_minutes?: number | null
          id?: string
          planned_time?: string | null
          status?: string
          task_date?: string
          task_type?: string | null
          title?: string
          user_id?: string
          weekly_goal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_weekly_goal_id_fkey"
            columns: ["weekly_goal_id"]
            isOneToOne: false
            referencedRelation: "weekly_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_intentions: {
        Row: {
          backup_plan: string | null
          created_at: string
          duration: string | null
          id: string
          if_context: string
          obstacle: string | null
          task_id: string | null
          then_action: string
          user_id: string
        }
        Insert: {
          backup_plan?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          if_context: string
          obstacle?: string | null
          task_id?: string | null
          then_action: string
          user_id: string
        }
        Update: {
          backup_plan?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          if_context?: string
          obstacle?: string | null
          task_id?: string | null
          then_action?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_intentions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          preferred_categories: string[] | null
          student_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_categories?: string[] | null
          student_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_categories?: string[] | null
          student_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_plans: {
        Row: {
          available_time: string | null
          created_at: string
          id: string
          missed_task: string
          most_important_to_save: string | null
          reason: string | null
          recovery_plan_text: string | null
          smallest_next_action: string | null
          user_id: string
        }
        Insert: {
          available_time?: string | null
          created_at?: string
          id?: string
          missed_task: string
          most_important_to_save?: string | null
          reason?: string | null
          recovery_plan_text?: string | null
          smallest_next_action?: string | null
          user_id: string
        }
        Update: {
          available_time?: string | null
          created_at?: string
          id?: string
          missed_task?: string
          most_important_to_save?: string | null
          reason?: string | null
          recovery_plan_text?: string | null
          smallest_next_action?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          id: string
          priority: string
          smallest_next_action: string | null
          status: string
          target_date: string | null
          title: string
          user_id: string
          why_it_matters: string | null
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          smallest_next_action?: string | null
          status?: string
          target_date?: string | null
          title: string
          user_id: string
          why_it_matters?: string | null
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          smallest_next_action?: string | null
          status?: string
          target_date?: string | null
          title?: string
          user_id?: string
          why_it_matters?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
