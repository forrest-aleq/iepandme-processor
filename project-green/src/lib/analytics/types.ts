export interface AnalyticsEvent {
  id: string
  user_id: string
  event_type: string
  event_category: string
  event_data: Record<string, any>
  session_id?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface ReportTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  report_type: "student_progress" | "document_analytics" | "usage_summary" | "compliance"
  configuration: ReportConfig
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ScheduledReport {
  id: string
  user_id: string
  template_id: string
  name: string
  schedule_cron: string
  email_recipients: string[]
  last_run_at?: string
  next_run_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ReportExecution {
  id: string
  user_id: string
  template_id?: string
  scheduled_report_id?: string
  report_type: string
  status: "pending" | "running" | "completed" | "failed"
  file_path?: string
  file_size?: number
  execution_time_ms?: number
  error_message?: string
  metadata: Record<string, any>
  created_at: string
  completed_at?: string
}

export interface StudentProgressSummary {
  id: string
  user_id: string
  first_name: string
  last_name: string
  grade_level?: string
  school?: string
  total_documents: number
  completed_documents: number
  pending_documents: number
  failed_documents: number
  avg_confidence_score?: number
  total_important_dates: number
  overdue_dates: number
  completed_dates: number
  compliance_score: number
  created_at: string
  updated_at: string
}

export interface DocumentAnalyticsSummary {
  user_id: string
  document_type?: string
  processing_status: string
  document_count: number
  avg_confidence_score?: number
  avg_processing_cost?: number
  total_processing_cost?: number
  avg_file_size?: number
  first_upload?: string
  last_upload?: string
}

export interface MonthlyUsageStats {
  user_id: string
  month: string
  total_uploads: number
  iep_uploads: number
  plan_504_uploads: number
  other_uploads: number
  successful_uploads: number
  failed_uploads: number
  avg_confidence_score?: number
  total_cost?: number
}

export interface UserActivitySummary {
  total_students: number
  total_documents: number
  total_events: number
  total_important_dates: number
  avg_confidence_score?: number
  compliance_score?: number
  last_activity_date?: string
}

export interface DocumentProcessingStats {
  total_processed: number
  success_rate: number
  avg_confidence_score?: number
  avg_processing_time_estimate?: number
  total_cost?: number
  documents_by_type: Record<
    string,
    {
      count: number
      success_rate: number
    }
  >
}

export interface ReportConfig {
  dateRange: {
    start: string
    end: string
    preset?: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom"
  }
  filters: {
    students?: string[]
    document_types?: string[]
    processing_status?: string[]
    grade_levels?: string[]
    schools?: string[]
  }
  groupBy?: "student" | "document_type" | "month" | "school" | "grade_level"
  metrics: string[]
  format: "pdf" | "csv" | "json"
  includeCharts: boolean
}

export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string
    borderWidth?: number
    fill?: boolean
  }>
}

export interface ReportSection {
  title: string
  type: "metric" | "chart" | "table" | "text"
  data: any
  chart_config?: {
    type: "line" | "bar" | "pie" | "doughnut"
    options: any
  }
}

export interface ReportData {
  title: string
  description: string
  generated_at: string
  date_range: {
    start: string
    end: string
  }
  summary: Record<string, any>
  sections: ReportSection[]
  metadata: Record<string, any>
}
