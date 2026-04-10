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
      organizer_payment_accounts: {
        Row: {
          id: string
          organizer_user_id: string
          club_id: string
          razorpay_account_id: string
          account_status: string | null
          linked_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organizer_user_id: string
          club_id: string
          razorpay_account_id: string
          account_status?: string | null
          linked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organizer_user_id?: string
          club_id?: string
          razorpay_account_id?: string
          account_status?: string | null
          linked_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizer_payment_accounts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          }
        ]
      }
      event_payments: {
        Row: {
          id: string
          event_id: string
          organizer_user_id: string
          participant_user_id: string
          participant_name: string | null
          participant_usn: string | null
          amount: number
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string | null
          paid_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          organizer_user_id: string
          participant_user_id: string
          participant_name?: string | null
          participant_usn?: string | null
          amount: number
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          paid_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          organizer_user_id?: string
          participant_user_id?: string
          participant_name?: string | null
          participant_usn?: string | null
          amount?: number
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          paid_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      colleges: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          id: string
          name: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          created_at?: string
        }
        Relationships: []
      }
      admin_requests: {
        Row: {
          id: string
          user_id: string
          club_id: string
          proof_url: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          club_id: string
          proof_url: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          club_id?: string
          proof_url?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_transfer_requests: {
        Row: {
          id: string
          club_id: string
          current_admin_id: string
          new_admin_id: string
          status: Database["public"]["Enums"]["transfer_status"]
          admin_confirmed: boolean
          new_admin_accepted: boolean
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          club_id: string
          current_admin_id: string
          new_admin_id: string
          status?: Database["public"]["Enums"]["transfer_status"]
          admin_confirmed?: boolean
          new_admin_accepted?: boolean
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          current_admin_id?: string
          new_admin_id?: string
          status?: Database["public"]["Enums"]["transfer_status"]
          admin_confirmed?: boolean
          new_admin_accepted?: boolean
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_transfer_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_transfer_requests_current_admin_id_fkey"
            columns: ["current_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "club_transfer_requests_new_admin_id_fkey"
            columns: ["new_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      club_transfer_history: {
        Row: {
          id: string
          club_id: string | null
          old_admin_id: string | null
          new_admin_id: string | null
          transferred_at: string
        }
        Insert: {
          id?: string
          club_id?: string | null
          old_admin_id?: string | null
          new_admin_id?: string | null
          transferred_at?: string
        }
        Update: {
          id?: string
          club_id?: string | null
          old_admin_id?: string | null
          new_admin_id?: string | null
          transferred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_transfer_history_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          }
        ]
      }
      event_categories: {
        Row: {
          color: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          user_id: string
          student_name: string | null
          usn: string | null
          college_email: string | null
          registration_status: string | null
          payment_status: string | null
          payment_reference: string | null
          department: string | null
          semester: string | null
          qr_token: string | null
          attendance_marked: boolean | null
          scanned_at: string | null
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          user_id: string
          student_name?: string | null
          usn?: string | null
          college_email?: string | null
          registration_status?: string | null
          payment_status?: string | null
          payment_reference?: string | null
          department?: string | null
          semester?: string | null
          qr_token?: string | null
          attendance_marked?: boolean | null
          scanned_at?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          user_id?: string
          student_name?: string | null
          usn?: string | null
          college_email?: string | null
          registration_status?: string | null
          payment_status?: string | null
          payment_reference?: string | null
          department?: string | null
          semester?: string | null
          qr_token?: string | null
          attendance_marked?: boolean | null
          scanned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_volunteers: {
        Row: {
          id: string
          event_id: string
          user_id: string
          full_name: string | null
          college_email: string | null
          usn: string | null
          status: string | null
          created_at: string
          department: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          full_name?: string | null
          college_email?: string | null
          usn?: string | null
          status?: string | null
          created_at?: string
          department?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          full_name?: string | null
          college_email?: string | null
          usn?: string | null
          status?: string | null
          created_at?: string
          department?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_volunteers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          category_id: string | null
          college_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          cover_image_url: string | null
          is_published: boolean
          location: string | null
          max_participants: number | null
          registration_fee: number | null
          start_date: string
          title: string
          updated_at: string
          venue: string | null
          activity_points: number | null
          event_type: Database["public"]["Enums"]["event_reg_type"]
          team_size: number | null
          registrations_open: boolean
          archived: boolean
          club_id: string | null
          audience_type: Database["public"]["Enums"]["audience_type"]
        }
        Insert: {
          category_id?: string | null
          college_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          cover_image_url?: string | null
          is_published?: boolean
          location?: string | null
          max_participants?: number | null
          registration_fee?: number | null
          start_date: string
          title: string
          updated_at?: string
          venue?: string | null
          activity_points?: number | null
          event_type?: Database["public"]["Enums"]["event_reg_type"]
          team_size?: number | null
          registrations_open?: boolean
          archived?: boolean
          audience_type?: Database["public"]["Enums"]["audience_type"]
        }
        Update: {
          category_id?: string | null
          college_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          cover_image_url?: string | null
          is_published?: boolean
          location?: string | null
          max_participants?: number | null
          registration_fee?: number | null
          start_date?: string
          title?: string
          updated_at?: string
          venue?: string | null
          activity_points?: number | null
          event_type?: Database["public"]["Enums"]["event_reg_type"]
          team_size?: number | null
          registrations_open?: boolean
          archived?: boolean
          audience_type?: Database["public"]["Enums"]["audience_type"]
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_points: {
        Row: {
          id: string
          user_id: string
          event_id: string
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          points?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          points?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_points_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      event_attendance: {
        Row: {
          id: string
          event_id: string
          user_id: string
          registration_id: string | null
          student_name: string | null
          usn: string | null
          college_email: string | null
          marked_by: string
          marked_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          registration_id?: string | null
          student_name?: string | null
          usn?: string | null
          college_email?: string | null
          marked_by: string
          marked_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          registration_id?: string | null
          student_name?: string | null
          usn?: string | null
          college_email?: string | null
          marked_by?: string
          marked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          id: string
          event_id: string
          template_image_url: string
          name_x: number
          name_y: number
          name_font_size: number
          name_font_color: string
          include_usn: boolean
          usn_x: number
          usn_y: number
          include_email: boolean
          email_x: number
          email_y: number
          field_font_size: number
          field_font_color: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          template_image_url: string
          name_x?: number
          name_y?: number
          name_font_size?: number
          name_font_color?: string
          include_usn?: boolean
          usn_x?: number
          usn_y?: number
          include_email?: boolean
          email_x?: number
          email_y?: number
          field_font_size?: number
          field_font_color?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          template_image_url?: string
          name_x?: number
          name_y?: number
          name_font_size?: number
          name_font_color?: string
          include_usn?: boolean
          usn_x?: number
          usn_y?: number
          include_email?: boolean
          email_x?: number
          email_y?: number
          field_font_size?: number
          field_font_color?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      issued_certificates: {
        Row: {
          id: string
          event_id: string
          user_id: string
          student_name: string | null
          usn: string | null
          college_email: string | null
          certificate_url: string | null
          issued_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          student_name?: string | null
          usn?: string | null
          college_email?: string | null
          certificate_url?: string | null
          issued_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          student_name?: string | null
          usn?: string | null
          college_email?: string | null
          certificate_url?: string | null
          issued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issued_certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_teams: {
        Row: {
          id: string
          event_id: string
          leader_user_id: string
          payment_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          leader_user_id: string
          payment_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          leader_user_id?: string
          payment_status?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          name: string
          usn: string
          college_email: string
          department: string | null
          semester: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          usn: string
          college_email: string
          department?: string | null
          semester?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          usn?: string
          college_email?: string
          department?: string | null
          semester?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "registration_teams"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          avatar_url: string | null
          club_role: string | null
          college_id: string | null
          created_at: string
          full_name: string
          id: string
          role: string
          club_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          club_role?: string | null
          college_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          role?: string
          club_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          club_role?: string | null
          college_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          club_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          college_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          college_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          college_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      step_down_admin: {
        Args: { p_club_id: string }
        Returns: undefined
      }
      approve_admin_request: {
        Args: { _request_id: string; _approved: boolean }
        Returns: undefined
      }
      handle_admin_signup: {
        Args: { _club_role: string; _user_id: string }
        Returns: string
      }
      handle_student_college: {
        Args: { _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_college_member: {
        Args: { _college_id: string; _user_id: string }
        Returns: boolean
      }
      initiate_club_transfer: {
        Args: { _new_admin_id: string }
        Returns: string
      }
      confirm_transfer_departure: {
        Args: { _request_id: string }
        Returns: undefined
      }
      accept_transfer_takeover: {
        Args: { _request_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "college_admin" | "admin" | "student"
      transfer_status: "pending" | "completed" | "cancelled" | "expired"
      event_reg_type: "individual" | "group"
      audience_type: "college_only" | "public"
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
      app_role: ["super_admin", "college_admin", "admin", "student"],
      audience_type: ["college_only", "public"],
    },
  },
} as const
