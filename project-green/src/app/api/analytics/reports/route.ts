import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { AnalyticsDatabase } from "@/lib/analytics/database"
import { ReportGenerator } from "@/lib/analytics/report-generator"
import { ReportExporter } from "@/lib/analytics/export"
import { getSubscription } from "@/lib/supabase/database"
import type { ReportConfig } from "@/lib/analytics/types"

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const {
      report_type,
      config,
      format = "json",
    } = body as {
      report_type: "student_progress" | "document_analytics" | "usage_summary" | "compliance"
      config: ReportConfig
      format: "json" | "pdf" | "csv"
    }

    if (!report_type || !config) {
      return NextResponse.json({ error: "report_type and config are required" }, { status: 400 })
    }

    const analyticsDb = new AnalyticsDatabase()
    const reportGenerator = new ReportGenerator()
    const reportExporter = new ReportExporter()

    // Create report execution record
    const execution = await analyticsDb.createReportExecution({
      user_id: session.user.id,
      report_type,
      status: "running",
      metadata: { config, format },
    })

    try {
      // Generate report based on type
      let reportData
      switch (report_type) {
        case "student_progress":
          reportData = await reportGenerator.generateStudentProgressReport(session.user.id, config)
          break
        case "document_analytics":
          reportData = await reportGenerator.generateDocumentAnalyticsReport(session.user.id, config)
          break
        case "usage_summary":
          reportData = await reportGenerator.generateUsageSummaryReport(session.user.id, config)
          break
        case "compliance":
          reportData = await reportGenerator.generateComplianceReport(session.user.id, config)
          break
        default:
          throw new Error(`Unsupported report type: ${report_type}`)
      }

      // Export in requested format
      let exportedData
      let contentType
      let filename

      switch (format) {
        case "pdf":
          exportedData = await reportExporter.exportToPDF(reportData)
          contentType = "application/pdf"
          filename = `${report_type}_report_${new Date().toISOString().split("T")[0]}.pdf`
          break
        case "csv":
          exportedData = await reportExporter.exportToCSV(reportData)
          contentType = "text/csv"
          filename = `${report_type}_report_${new Date().toISOString().split("T")[0]}.csv`
          break
        default:
          exportedData = await reportExporter.exportToJSON(reportData)
          contentType = "application/json"
          filename = `${report_type}_report_${new Date().toISOString().split("T")[0]}.json`
      }

      // Update execution record
      await analyticsDb.updateReportExecution(execution.id, {
        status: "completed",
        execution_time_ms: Date.now() - new Date(execution.created_at).getTime(),
        file_size: Buffer.isBuffer(exportedData) ? exportedData.length : exportedData.length,
        completed_at: new Date().toISOString(),
      })

      // Track analytics event
      await analyticsDb.trackEvent({
        user_id: session.user.id,
        event_type: "report_generated",
        event_category: "analytics",
        event_data: {
          report_type,
          format,
          execution_time_ms: Date.now() - new Date(execution.created_at).getTime(),
        },
      })

      if (format === "json") {
        return NextResponse.json({ report: reportData, execution_id: execution.id })
      } else {
        return new NextResponse(exportedData, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        })
      }
    } catch (error) {
      // Update execution record with error
      await analyticsDb.updateReportExecution(execution.id, {
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })

      throw error
    }
  } catch (error) {
    console.error("Report generation API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const analyticsDb = new AnalyticsDatabase()
    const executions = await analyticsDb.getReportExecutions(session.user.id)

    return NextResponse.json({ executions })
  } catch (error) {
    console.error("Report executions fetch API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
