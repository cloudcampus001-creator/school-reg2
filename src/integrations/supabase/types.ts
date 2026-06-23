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
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          segmented_registration_fee: number | null
          segmented_tuition_fee: number | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          segmented_registration_fee?: number | null
          segmented_tuition_fee?: number | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          segmented_registration_fee?: number | null
          segmented_tuition_fee?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          payment_phone: string | null
          reference: string | null
          school_id: string
          status: Database["public"]["Enums"]["transaction_status"]
          student_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          payment_phone?: string | null
          reference?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["transaction_status"]
          student_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_phone?: string | null
          reference?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          student_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          content: string
          created_at: string
          id: string
          school_id: string
          status: Database["public"]["Enums"]["print_job_status"]
          transaction_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          school_id: string
          status?: Database["public"]["Enums"]["print_job_status"]
          transaction_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["print_job_status"]
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      school_configs: {
        Row: {
          created_at: string
          currency: string
          fee_structure: Database["public"]["Enums"]["fee_structure"]
          id: string
          school_id: string
          settlement_account: string | null
          uniform_registration_fee: number
          uniform_tuition_fee: number
        }
        Insert: {
          created_at?: string
          currency?: string
          fee_structure?: Database["public"]["Enums"]["fee_structure"]
          id?: string
          school_id: string
          settlement_account?: string | null
          uniform_registration_fee?: number
          uniform_tuition_fee?: number
        }
        Update: {
          created_at?: string
          currency?: string
          fee_structure?: Database["public"]["Enums"]["fee_structure"]
          id?: string
          school_id?: string
          settlement_account?: string | null
          uniform_registration_fee?: number
          uniform_tuition_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_configs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          application_status: Database["public"]["Enums"]["application_status"]
          class_id: string | null
          created_at: string
          date_of_birth: string
          full_name: string
          gender: string
          id: string
          is_registered: boolean
          matricule: string | null
          parent_phone: string
          place_of_birth: string | null
          school_id: string
          tuition_paid: number
          updated_at: string
        }
        Insert: {
          application_status?: Database["public"]["Enums"]["application_status"]
          class_id?: string | null
          created_at?: string
          date_of_birth: string
          full_name: string
          gender: string
          id?: string
          is_registered?: boolean
          matricule?: string | null
          parent_phone: string
          place_of_birth?: string | null
          school_id: string
          tuition_paid?: number
          updated_at?: string
        }
        Update: {
          application_status?: Database["public"]["Enums"]["application_status"]
          class_id?: string | null
          created_at?: string
          date_of_birth?: string
          full_name?: string
          gender?: string
          id?: string
          is_registered?: boolean
          matricule?: string | null
          parent_phone?: string
          place_of_birth?: string | null
          school_id?: string
          tuition_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_matricule: { Args: { _school_slug: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "bursar"
      application_status: "PENDING_REVIEW" | "APPROVED" | "REJECTED"
      fee_structure: "UNIFORM" | "SEGMENTED"
      print_job_status: "PENDING" | "PRINTED" | "FAILED"
      transaction_status: "PENDING" | "SUCCESS" | "FAILED"
      transaction_type: "REGISTRATION" | "TUITION"
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
      app_role: ["admin", "bursar"],
      application_status: ["PENDING_REVIEW", "APPROVED", "REJECTED"],
      fee_structure: ["UNIFORM", "SEGMENTED"],
      print_job_status: ["PENDING", "PRINTED", "FAILED"],
      transaction_status: ["PENDING", "SUCCESS", "FAILED"],
      transaction_type: ["REGISTRATION", "TUITION"],
    },
  },
} as const
