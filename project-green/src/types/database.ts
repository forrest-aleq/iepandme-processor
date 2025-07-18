export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          price_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status: string
          price_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          price_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          date_of_birth: string | null
          grade_level: string | null
          school: string | null
          disability_category: string | null
          iep_date: string | null
          next_review_date: string | null
          case_manager: string | null
          parent_guardian: string | null
          contact_email: string | null
          contact_phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          date_of_birth?: string | null
          grade_level?: string | null
          school?: string | null
          disability_category?: string | null
          iep_date?: string | null
          next_review_date?: string | null
          case_manager?: string | null
          parent_guardian?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string | null
          grade_level?: string | null
          school?: string | null
          disability_category?: string | null
          iep_date?: string | null
          next_review_date?: string | null
          case_manager?: string | null
          parent_guardian?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          student_id: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          document_type: string | null
          processing_status: string
          extracted_data: Json | null
          confidence_score: number | null
          processing_cost: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          student_id?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          document_type?: string | null
          processing_status?: string
          extracted_data?: Json | null
          confidence_score?: number | null
          processing_cost?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          student_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          document_type?: string | null
          processing_status?: string
          extracted_data?: Json | null
          confidence_score?: number | null
          processing_cost?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          user_id: string
          student_id: string | null
          title: string
          description: string | null
          start_date: string
          end_date: string | null
          all_day: boolean
          event_type: string
          location: string | null
          attendees: string[] | null
          reminder_minutes: number | null
          google_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          student_id?: string | null
          title: string
          description?: string | null
          start_date: string
          end_date?: string | null
          all_day?: boolean
          event_type?: string
          location?: string | null
          attendees?: string[] | null
          reminder_minutes?: number | null
          google_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          student_id?: string | null
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          all_day?: boolean
          event_type?: string
          location?: string | null
          attendees?: string[] | null
          reminder_minutes?: number | null
          google_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      important_dates: {
        Row: {
          id: string
          student_id: string
          title: string
          description: string | null
          due_date: string
          date_type: string
          completed: boolean
          completion_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          title: string
          description?: string | null
          due_date: string
          date_type: string
          completed?: boolean
          completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          title?: string
          description?: string | null
          due_date?: string
          date_type?: string
          completed?: boolean
          completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_category: string
          event_data: Json
          session_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_category: string
          event_data?: Json
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_category?: string
          event_data?: Json
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      report_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          report_type: string
          configuration: Json
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          report_type: string
          configuration: Json
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          report_type?: string
          configuration?: Json
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      report_executions: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          scheduled_report_id: string | null
          report_type: string
          status: string
          file_path: string | null
          file_size: number | null
          execution_time_ms: number | null
          error_message: string | null
          metadata: Json
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          scheduled_report_id?: string | null
          report_type: string
          status?: string
          file_path?: string | null
          file_size?: number | null
          execution_time_ms?: number | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          scheduled_report_id?: string | null
          report_type?: string
          status?: string
          file_path?: string | null
          file_size?: number | null
          execution_time_ms?: number | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
          completed_at?: string | null
        }
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
