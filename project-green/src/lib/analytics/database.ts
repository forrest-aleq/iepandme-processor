import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  AnalyticsEvent,
  ReportTemplate,
  ReportExecution,
  StudentProgressSummary,
  DocumentAnalyticsSummary,
  MonthlyUsageStats,
  UserActivitySummary,
  DocumentProcessingStats,
} from "./types"

export class AnalyticsDatabase {
  private supabase = createServerSupabaseClient()

  // Analytics Events
  async trackEvent(event: Omit<AnalyticsEvent, "id" | "created_at">): Promise<void> {
    try {
      const { error } = await this.supabase.from("analytics_events").insert(event)

      if (error) {
        console.error("Failed to track analytics event:", error)
      }
    } catch (error) {
      console.error("Unexpected error tracking analytics event:", error)
    }
  }

  async getAnalyticsEvents(
    userId: string,
    startDate?: string,
    endDate?: string,
    eventType?: string,
  ): Promise<AnalyticsEvent[]> {
    let query = this.supabase
      .from("analytics_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (startDate) {
      query = query.gte("created_at", startDate)
    }

    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    if (eventType) {
      query = query.eq("event_type", eventType)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch analytics events: ${error.message}`)
    }

    return data || []
  }

  // Student Progress Analytics
  async getStudentProgressSummary(userId: string): Promise<StudentProgressSummary[]> {
    const { data, error } = await this.supabase
      .from("student_progress_summary")
      .select("*")
      .eq("user_id", userId)
      .order("compliance_score", { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch student progress summary: ${error.message}`)
    }

    return data || []
  }

  async getStudentProgressHistory(studentId: string, days = 90): Promise<any[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await this.supabase
      .from("student_progress_snapshots")
      .select("*")
      .eq("student_id", studentId)
      .gte("snapshot_date", startDate.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch student progress history: ${error.message}`)
    }

    return data || []
  }

  // Document Analytics
  async getDocumentAnalyticsSummary(userId: string): Promise<DocumentAnalyticsSummary[]> {
    const { data, error } = await this.supabase
      .from("document_analytics_summary")
      .select("*")
      .eq("user_id", userId)
      .order("document_count", { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch document analytics summary: ${error.message}`)
    }

    return data || []
  }

  async getDocumentProcessingStats(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DocumentProcessingStats> {
    const { data, error } = await this.supabase.rpc("get_document_processing_stats", {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      throw new Error(`Failed to fetch document processing stats: ${error.message}`)
    }

    return (
      data?.[0] || {
        total_processed: 0,
        success_rate: 0,
        avg_confidence_score: 0,
        avg_processing_time_estimate: 0,
        total_cost: 0,
        documents_by_type: {},
      }
    )
  }

  // Usage Analytics
  async getMonthlyUsageStats(userId: string, months = 12): Promise<MonthlyUsageStats[]> {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const { data, error } = await this.supabase
      .from("monthly_usage_stats")
      .select("*")
      .eq("user_id", userId)
      .gte("month", startDate.toISOString())
      .order("month", { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch monthly usage stats: ${error.message}`)
    }

    return data || []
  }

  async getUserActivitySummary(userId: string, startDate?: string, endDate?: string): Promise<UserActivitySummary> {
    const { data, error } = await this.supabase.rpc("get_user_activity_summary", {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      throw new Error(`Failed to fetch user activity summary: ${error.message}`)
    }

    return (
      data?.[0] || {
        total_students: 0,
        total_documents: 0,
        total_events: 0,
        total_important_dates: 0,
        avg_confidence_score: 0,
        compliance_score: 0,
      }
    )
  }

  // Report Templates
  async getReportTemplates(userId: string): Promise<ReportTemplate[]> {
    const { data, error } = await this.supabase
      .from("report_templates")
      .select("*")
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch report templates: ${error.message}`)
    }

    return data || []
  }

  async createReportTemplate(
    template: Omit<ReportTemplate, "id" | "created_at" | "updated_at">,
  ): Promise<ReportTemplate> {
    const { data, error } = await this.supabase.from("report_templates").insert(template).select().single()

    if (error) {
      throw new Error(`Failed to create report template: ${error.message}`)
    }

    return data
  }

  async updateReportTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const { data, error } = await this.supabase
      .from("report_templates")
      .update(updates)
      .eq("id", templateId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update report template: ${error.message}`)
    }

    return data
  }

  async deleteReportTemplate(templateId: string): Promise<void> {
    const { error } = await this.supabase.from("report_templates").delete().eq("id", templateId)

    if (error) {
      throw new Error(`Failed to delete report template: ${error.message}`)
    }
  }

  // Report Executions
  async createReportExecution(execution: Omit<ReportExecution, "id" | "created_at">): Promise<ReportExecution> {
    const { data, error } = await this.supabase.from("report_executions").insert(execution).select().single()

    if (error) {
      throw new Error(`Failed to create report execution: ${error.message}`)
    }

    return data
  }

  async updateReportExecution(executionId: string, updates: Partial<ReportExecution>): Promise<ReportExecution> {
    const { data, error } = await this.supabase
      .from("report_executions")
      .update(updates)
      .eq("id", executionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update report execution: ${error.message}`)
    }

    return data
  }

  async getReportExecutions(userId: string, limit = 50): Promise<ReportExecution[]> {
    const { data, error } = await this.supabase
      .from("report_executions")
      .select(`
        *,
        report_templates (
          name,
          report_type
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch report executions: ${error.message}`)
    }

    return data || []
  }

  // Compliance Analytics
  async getComplianceOverview(userId: string): Promise<any> {
    const { data: students, error: studentsError } = await this.supabase
      .from("student_progress_summary")
      .select("*")
      .eq("user_id", userId)

    if (studentsError) {
      throw new Error(`Failed to fetch compliance overview: ${studentsError.message}`)
    }

    const totalStudents = students?.length || 0
    const compliantStudents = students?.filter((s) => s.compliance_score >= 80).length || 0
    const atRiskStudents = students?.filter((s) => s.compliance_score < 60).length || 0
    const avgComplianceScore = students?.reduce((sum, s) => sum + s.compliance_score, 0) / totalStudents || 0

    return {
      total_students: totalStudents,
      compliant_students: compliantStudents,
      at_risk_students: atRiskStudents,
      avg_compliance_score: Math.round(avgComplianceScore * 100) / 100,
      compliance_rate: totalStudents > 0 ? Math.round((compliantStudents / totalStudents) * 100) : 0,
    }
  }
}
