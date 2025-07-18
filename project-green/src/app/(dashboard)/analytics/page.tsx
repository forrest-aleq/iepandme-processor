import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSubscription } from "@/lib/supabase/database"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { AnalyticsDatabase } from "@/lib/analytics/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Crown } from "lucide-react"
import Link from "next/link"

export default async function AnalyticsPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  // Check if user is Pro
  const subscription = await getSubscription(session.user.id)
  const isProUser = subscription?.status === "active" || subscription?.status === "trialing"

  if (!isProUser) {
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto text-center">
          <Card>
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl">Analytics & Reporting</CardTitle>
              <CardDescription className="text-lg">
                Unlock powerful insights with comprehensive analytics and reporting features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Student Progress Reports
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Track individual student progress, compliance scores, and document completion rates
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Document Analytics
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Analyze processing statistics, success rates, and document type breakdowns
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Compliance Tracking
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Monitor IEP compliance, deadline management, and risk assessment
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Usage Insights
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Understand system usage patterns, activity trends, and cost analysis
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button asChild size="lg" className="w-full">
                  <Link href="/billing">
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Start your free trial today and unlock all analytics features
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Fetch initial dashboard data for Pro users
  const analyticsDb = new AnalyticsDatabase()
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const endDate = new Date().toISOString().split("T")[0]

  try {
    const [studentProgress, documentAnalytics, processingStats, monthlyStats, activitySummary, complianceOverview] =
      await Promise.all([
        analyticsDb.getStudentProgressSummary(session.user.id),
        analyticsDb.getDocumentAnalyticsSummary(session.user.id),
        analyticsDb.getDocumentProcessingStats(session.user.id, startDate, endDate),
        analyticsDb.getMonthlyUsageStats(session.user.id, 12),
        analyticsDb.getUserActivitySummary(session.user.id, startDate, endDate),
        analyticsDb.getComplianceOverview(session.user.id),
      ])

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

    const initialData = {
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

    return <AnalyticsDashboard initialData={initialData} />
  } catch (error) {
    console.error("Failed to load analytics data:", error)
    return <AnalyticsDashboard />
  }
}
