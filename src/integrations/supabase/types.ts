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
      admission_applications: {
        Row: {
          birth_cert_path: string
          birth_cert_size: number | null
          birth_cert_type: string | null
          class_applied: string
          created_at: string
          currency: string
          documents_verified_at: string | null
          email_attempts: number
          email_locked_until: string | null
          extra_documents: Json
          fee_amount_kobo: number
          form_data: Json
          form_version: number
          id: string
          last_email_error: string | null
          paid_amount_kobo: number | null
          paid_at: string | null
          parent_email: string
          parent_email_sent_at: string | null
          parent_name: string
          passport_path: string
          passport_size: number | null
          passport_type: string | null
          payment_reference: string | null
          receipt_number: string | null
          reference: string
          school_email_sent_at: string | null
          school_section: "nursery-primary" | "secondary" | null
          status: Database["public"]["Enums"]["admission_status"]
          student_name: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          birth_cert_path: string
          birth_cert_size?: number | null
          birth_cert_type?: string | null
          class_applied: string
          created_at?: string
          currency?: string
          documents_verified_at?: string | null
          email_attempts?: number
          email_locked_until?: string | null
          extra_documents?: Json
          fee_amount_kobo: number
          form_data: Json
          form_version: number
          id?: string
          last_email_error?: string | null
          paid_amount_kobo?: number | null
          paid_at?: string | null
          parent_email: string
          parent_email_sent_at?: string | null
          parent_name: string
          passport_path: string
          passport_size?: number | null
          passport_type?: string | null
          payment_reference?: string | null
          receipt_number?: string | null
          reference: string
          school_email_sent_at?: string | null
          school_section?: "nursery-primary" | "secondary" | null
          status?: Database["public"]["Enums"]["admission_status"]
          student_name: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["admission_applications"]["Insert"]>
        Relationships: []
      }
      admission_payment_attempts: {
        Row: {
          amount_kobo: number
          application_id: string
          created_at: string
          currency: string
          duplicate_notified_at: string | null
          duplicate_payment: boolean
          gateway_response: string | null
          id: string
          paid_at: string | null
          provider: string
          provider_transaction_id: string | null
          reference: string
          status: "initialized" | "success" | "failed" | "abandoned"
          subaccount: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount_kobo: number
          application_id: string
          created_at?: string
          currency?: string
          duplicate_notified_at?: string | null
          duplicate_payment?: boolean
          gateway_response?: string | null
          id?: string
          paid_at?: string | null
          provider: string
          provider_transaction_id?: string | null
          reference: string
          status?: "initialized" | "success" | "failed" | "abandoned"
          subaccount?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["admission_payment_attempts"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "admission_payment_attempts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_rate_limits: {
        Row: { bucket: string; hits: number; window_start: string }
        Insert: { bucket: string; hits?: number; window_start?: string }
        Update: { bucket?: string; hits?: number; window_start?: string }
        Relationships: []
      }
      gallery_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          sort_order: number
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
          title?: string | null
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          body: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          position: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          position: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          position?: string
          sort_order?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admission_rate_limit_hit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      finalize_admission_payment: {
        Args: {
          p_amount_kobo: number
          p_attempt_reference: string
          p_currency: string
          p_paid_at: string
          p_transaction_id: string
        }
        Returns: {
          application_id: string
          duplicate_payment: boolean
          newly_submitted: boolean
          receipt_number: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      admission_status: "PENDING_PAYMENT" | "PAYMENT_FAILED" | "SUBMITTED"
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      admission_status: ["PENDING_PAYMENT", "PAYMENT_FAILED", "SUBMITTED"],
      app_role: ["admin"],
    },
  },
} as const
