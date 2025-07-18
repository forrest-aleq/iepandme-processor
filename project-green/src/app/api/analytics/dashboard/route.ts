import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { AnalyticsDatabase } from "@/lib/analytics/database"
import { getSubscription } from "@/lib/supabase/database"

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is Pro
    const subscription = await getSubscription(session.user.id)
    const isProUser = subscription?.status === "active" || subscription?.status === "trialing"

    if (!isProUser) {
      return NextResponse.json({ error: "Pro subscription required" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    const analyticsDb = new AnalyticsDatabase()

    // Fetch all dashboard data in parallel
    const [studentProgress, documentAnalytics, processingStats, monthlyStats, activitySummary, complianceOverview] =
      await Promise.all([
        analyticsDb.getStudentProgressSummary(session.user.id),
        analyticsDb.getDocumentAnalyticsSummary(session.user.id),
        analyticsDb.getDocumentProcessingStats(session.user.id, startDate || undefined, endDate || undefined),
        analyticsDb.getMonthlyUsageStats(session.user.id, 12),
        analyticsDb.getUserActivitySummary(session.user.id, startDate || undefined, endDate || undefined),
        analyticsDb.getComplianceOverview(session.user.id),
      ])

    // Generate chart data
    const charts = {
      monthly_uploads: {
        labels: monthlyStats.map((m) =>
          new Date(m.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        ),
        data: monthlyStats.map((m) => m.total_uploads),
      },
      document_types: {
        labels: Object.keys(processingStats.documents_by_type),
        data: Object.values(processingStats.documents_by_type).map((d) => d.count),
      },
      success_rates: {
        labels: Object.keys(processingStats.documents_by_type),
        data: Object.values(processingStats.documents_by_type).map((d) => d.success_rate),
      },
      compliance_distribution: {
        labels: ["Compliant (80%+)", "Warning (60-79%)", "At Risk (<60%)"],
        data: [
          studentProgress.filter((s) => s.compliance_score >= 80).length,
          studentProgress.filter((s) => s.compliance_score >= 60 && s.compliance_score < 80).length,
          studentProgress.filter((s) => s.compliance_score < 60).length,
        ],
      },
    }

    const dashboard = {
      overview: {
        total_students: activitySummary.total_students,
        total_documents: activitySummary.total_documents,
        total_events: activitySummary.total_events,
        avg_confidence_score: activitySummary.avg_confidence_score,
        last_activity: activitySummary.last_activity_date,
      },
      student_progress: {
        summary: studentProgress,
        compliance_overview: complianceOverview,
      },
      document_analytics: {
        summary: documentAnalytics,
        processing_stats: processingStats,
      },
      usage_trends: {
        monthly_stats: monthlyStats,
        activity_summary: activitySummary,
        total_cost: processingStats.total_cost,
      },
      charts,
    }

    // Track analytics event
    await analyticsDb.trackEvent({
      user_id: session.user.id,
      event_type: "dashboard_viewed",
      event_category: "analytics",
      event_data: {
        date_range: { start_date: startDate, end_date: endDate },
      },
    })

    return NextResponse.json({ dashboard })
  } catch (error) {
    console.error("Analytics dashboard API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
