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
      agent_actions: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          reversed_at: string | null
          summary: string | null
          tool: string
          undo_payload: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          reversed_at?: string | null
          summary?: string | null
          tool: string
          undo_payload?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          reversed_at?: string | null
          summary?: string | null
          tool?: string
          undo_payload?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          available_capacity: number | null
          created_at: string
          date: string
          energy: number | null
          id: string
          main_commitment: string | null
          obstacle: string | null
          raw_voice: string | null
          sleep_hours: number | null
          sleep_quality: number | null
          stress: number | null
          unexpected_event: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_capacity?: number | null
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          main_commitment?: string | null
          obstacle?: string | null
          raw_voice?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress?: number | null
          unexpected_event?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_capacity?: number | null
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          main_commitment?: string | null
          obstacle?: string | null
          raw_voice?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress?: number | null
          unexpected_event?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
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
      intentions: {
        Row: {
          backup_plan: string | null
          created_at: string
          deleted_at: string | null
          id: string
          if_context: string
          obstacle: string | null
          task_id: string | null
          then_action: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_plan?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          if_context: string
          obstacle?: string | null
          task_id?: string | null
          then_action: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_plan?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          if_context?: string
          obstacle?: string | null
          task_id?: string | null
          then_action?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intentions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          category: string | null
          description: string | null
          id: string
          name: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          name: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          name?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outcomes: {
        Row: {
          completed_at: string | null
          constraints: string | null
          created_at: string
          deadline: string | null
          deleted_at: string | null
          id: string
          non_goals: string | null
          priority: string
          status: string
          strategic_area_id: string | null
          success_metric: string | null
          title: string
          updated_at: string
          user_id: string
          why_it_matters: string | null
        }
        Insert: {
          completed_at?: string | null
          constraints?: string | null
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          non_goals?: string | null
          priority?: string
          status?: string
          strategic_area_id?: string | null
          success_metric?: string | null
          title: string
          updated_at?: string
          user_id: string
          why_it_matters?: string | null
        }
        Update: {
          completed_at?: string | null
          constraints?: string | null
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          non_goals?: string | null
          priority?: string
          status?: string
          strategic_area_id?: string | null
          success_metric?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_strategic_area_id_fkey"
            columns: ["strategic_area_id"]
            isOneToOne: false
            referencedRelation: "strategic_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          health_priorities: string[] | null
          id: string
          onboarded_at: string | null
          preferred_focus_windows: Json | null
          profession: string | null
          role: string | null
          timezone: string | null
          tone: string | null
          top_objectives: string | null
          updated_at: string
          user_id: string
          work_style: string | null
          working_hours: Json | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          health_priorities?: string[] | null
          id?: string
          onboarded_at?: string | null
          preferred_focus_windows?: Json | null
          profession?: string | null
          role?: string | null
          timezone?: string | null
          tone?: string | null
          top_objectives?: string | null
          updated_at?: string
          user_id: string
          work_style?: string | null
          working_hours?: Json | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          health_priorities?: string[] | null
          id?: string
          onboarded_at?: string | null
          preferred_focus_windows?: Json | null
          profession?: string | null
          role?: string | null
          timezone?: string | null
          tone?: string | null
          top_objectives?: string | null
          updated_at?: string
          user_id?: string
          work_style?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      recovery_plans: {
        Row: {
          created_at: string
          defer_list: string | null
          deleted_at: string | null
          id: string
          must_save: string | null
          plan_text: string | null
          remaining_capacity: string | null
          smallest_action: string | null
          trigger: string | null
          updated_at: string
          user_id: string
          what_changed: string | null
        }
        Insert: {
          created_at?: string
          defer_list?: string | null
          deleted_at?: string | null
          id?: string
          must_save?: string | null
          plan_text?: string | null
          remaining_capacity?: string | null
          smallest_action?: string | null
          trigger?: string | null
          updated_at?: string
          user_id: string
          what_changed?: string | null
        }
        Update: {
          created_at?: string
          defer_list?: string | null
          deleted_at?: string | null
          id?: string
          must_save?: string | null
          plan_text?: string | null
          remaining_capacity?: string | null
          smallest_action?: string | null
          trigger?: string | null
          updated_at?: string
          user_id?: string
          what_changed?: string | null
        }
        Relationships: []
      }
      strategic_areas: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          energy_required: string | null
          estimated_minutes: number | null
          id: string
          outcome_id: string | null
          planned_time: string | null
          status: string
          task_date: string | null
          task_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          energy_required?: string | null
          estimated_minutes?: number | null
          id?: string
          outcome_id?: string | null
          planned_time?: string | null
          status?: string
          task_date?: string | null
          task_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          energy_required?: string | null
          estimated_minutes?: number | null
          id?: string
          outcome_id?: string | null
          planned_time?: string | null
          status?: string
          task_date?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "outcomes"
            referencedColumns: ["id"]
          },
        ]
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
