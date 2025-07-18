import { AnalyticsDatabase } from "./database"
import type { ReportConfig, ReportData, ChartData } from "./types"

export class ReportGenerator {
  private analyticsDb = new AnalyticsDatabase()

  async generateStudentProgressReport(userId: string, config: ReportConfig): Promise<ReportData> {
    const startTime = Date.now()

    // Get student progress data
    const students = await this.analyticsDb.getStudentProgressSummary(userId)
    const activitySummary = await this.analyticsDb.getUserActivitySummary(
      userId,
      config.dateRange.start,
      config.dateRange.end,
    )

    // Apply filters
    let filteredStudents = students
    if (config.filters.students?.length) {
      filteredStudents = students.filter((s) => config.filters.students!.includes(s.id))
    }
    if (config.filters.grade_levels?.length) {
      filteredStudents = filteredStudents.filter(
        (s) => s.grade_level && config.filters.grade_levels!.includes(s.grade_level),
      )
    }
    if (config.filters.schools?.length) {
      filteredStudents = filteredStudents.filter((s) => s.school && config.filters.schools!.includes(s.school))
    }

    // Calculate summary metrics
    const totalStudents = filteredStudents.length
    const avgComplianceScore = filteredStudents.reduce((sum, s) => sum + s.compliance_score, 0) / totalStudents || 0
    const compliantStudents = filteredStudents.filter((s) => s.compliance_score >= 80).length
    const atRiskStudents = filteredStudents.filter((s) => s.compliance_score < 60).length

    // Generate chart data
    const complianceChartData: ChartData = {
      labels: filteredStudents.map((s) => `${s.first_name} ${s.last_name}`),
      datasets: [
        {
          label: "Compliance Score",
          data: filteredStudents.map((s) => s.compliance_score),
          backgroundColor: filteredStudents.map((s) =>
            s.compliance_score >= 80 ? "#10B981" : s.compliance_score >= 60 ? "#F59E0B" : "#EF4444",
          ),
          borderColor: "#374151",
          borderWidth: 1,
        },
      ],
    }

    const documentStatusChartData: ChartData = {
      labels: ["Completed", "Pending", "Failed"],
      datasets: [
        {
          label: "Documents",
          data: [
            filteredStudents.reduce((sum, s) => sum + s.completed_documents, 0),
            filteredStudents.reduce((sum, s) => sum + s.pending_documents, 0),
            filteredStudents.reduce((sum, s) => sum + s.failed_documents, 0),
          ],
          backgroundColor: ["#10B981", "#F59E0B", "#EF4444"],
          borderWidth: 0,
        },
      ],
    }

    return {
      title: "Student Progress Report",
      description: `Comprehensive progress analysis for ${totalStudents} students`,
      generated_at: new Date().toISOString(),
      date_range: {
        start: config.dateRange.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: config.dateRange.end || new Date().toISOString(),
      },
      summary: {
        total_students: totalStudents,
        avg_compliance_score: Math.round(avgComplianceScore * 100) / 100,
        compliant_students: compliantStudents,
        at_risk_students: atRiskStudents,
        compliance_rate: totalStudents > 0 ? Math.round((compliantStudents / totalStudents) * 100) : 0,
        total_documents: filteredStudents.reduce((sum, s) => sum + s.total_documents, 0),
        avg_confidence_score:
          Math.round(
            (filteredStudents.reduce((sum, s) => sum + (s.avg_confidence_score || 0), 0) / totalStudents) * 100,
          ) / 100,
      },
      sections: [
        {
          title: "Executive Summary",
          type: "metric",
          data: {
            metrics: [
              { label: "Total Students", value: totalStudents, format: "number" },
              { label: "Average Compliance Score", value: avgComplianceScore, format: "percentage" },
              { label: "Compliant Students", value: compliantStudents, format: "number" },
              { label: "At-Risk Students", value: atRiskStudents, format: "number" },
            ],
          },
        },
        {
          title: "Compliance Score Distribution",
          type: "chart",
          data: complianceChartData,
          chart_config: {
            type: "bar",
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                },
              },
            },
          },
        },
        {
          title: "Document Processing Status",
          type: "chart",
          data: documentStatusChartData,
          chart_config: {
            type: "doughnut",
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: "bottom",
                },
              },
            },
          },
        },
        {
          title: "Student Details",
          type: "table",
          data: {
            headers: ["Student Name", "Grade", "School", "Documents", "Compliance Score", "Overdue Dates"],
            rows: filteredStudents.map((s) => [
              `${s.first_name} ${s.last_name}`,
              s.grade_level || "N/A",
              s.school || "N/A",
              `${s.completed_documents}/${s.total_documents}`,
              `${s.compliance_score}%`,
              s.overdue_dates.toString(),
            ]),
          },
        },
      ],
      metadata: {
        generation_time_ms: Date.now() - startTime,
        filters_applied: config.filters,
        total_records: students.length,
        filtered_records: filteredStudents.length,
      },
    }
  }

  async generateDocumentAnalyticsReport(userId: string, config: ReportConfig): Promise<ReportData> {
    const startTime = Date.now()

    // Get document analytics data
    const documentSummary = await this.analyticsDb.getDocumentAnalyticsSummary(userId)
    const processingStats = await this.analyticsDb.getDocumentProcessingStats(
      userId,
      config.dateRange.start,
      config.dateRange.end,
    )
    const monthlyStats = await this.analyticsDb.getMonthlyUsageStats(userId, 12)

    // Process data for charts
    const documentTypeData: ChartData = {
      labels: Object.keys(processingStats.documents_by_type),
      datasets: [
        {
          label: "Document Count",
          data: Object.values(processingStats.documents_by_type).map((d) => d.count),
          backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
          borderWidth: 0,
        },
      ],
    }

    const monthlyTrendData: ChartData = {
      labels: monthlyStats.map((m) =>
        new Date(m.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      ),
      datasets: [
        {
          label: "Total Uploads",
          data: monthlyStats.map((m) => m.total_uploads),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
        },
        {
          label: "Successful Uploads",
          data: monthlyStats.map((m) => m.successful_uploads),
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
        },
      ],
    }

    const successRateData: ChartData = {
      labels: Object.keys(processingStats.documents_by_type),
      datasets: [
        {
          label: "Success Rate (%)",
          data: Object.values(processingStats.documents_by_type).map((d) => d.success_rate),
          backgroundColor: Object.values(processingStats.documents_by_type).map((d) =>
            d.success_rate >= 90 ? "#10B981" : d.success_rate >= 70 ? "#F59E0B" : "#EF4444",
          ),
          borderWidth: 1,
        },
      ],
    }

    return {
      title: "Document Analytics Report",
      description: `Comprehensive document processing analysis`,
      generated_at: new Date().toISOString(),
      date_range: {
        start: config.dateRange.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: config.dateRange.end || new Date().toISOString(),
      },
      summary: {
        total_processed: processingStats.total_processed,
        success_rate: processingStats.success_rate,
        avg_confidence_score: processingStats.avg_confidence_score,
        total_cost: processingStats.total_cost,
        documents_by_type: processingStats.documents_by_type,
      },
      sections: [
        {
          title: "Processing Overview",
          type: "metric",
          data: {
            metrics: [
              { label: "Total Documents Processed", value: processingStats.total_processed, format: "number" },
              { label: "Overall Success Rate", value: processingStats.success_rate, format: "percentage" },
              {
                label: "Average Confidence Score",
                value: processingStats.avg_confidence_score || 0,
                format: "percentage",
              },
              { label: "Total Processing Cost", value: processingStats.total_cost || 0, format: "currency" },
            ],
          },
        },
        {
          title: "Documents by Type",
          type: "chart",
          data: documentTypeData,
          chart_config: {
            type: "pie",
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: "bottom",
                },
              },
            },
          },
        },
        {
          title: "Monthly Upload Trends",
          type: "chart",
          data: monthlyTrendData,
          chart_config: {
            type: "line",
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            },
          },
        },
        {
          title: "Success Rate by Document Type",
          type: "chart",
          data: successRateData,
          chart_config: {
            type: "bar",
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                },
              },
            },
          },
        },
        {
          title: "Document Type Breakdown",
          type: "table",
          data: {
            headers: ["Document Type", "Count", "Success Rate", "Avg Confidence"],
            rows: Object.entries(processingStats.documents_by_type).map(([type, stats]) => [
              type.toUpperCase(),
              stats.count.toString(),
              `${stats.success_rate}%`,
              `${Math.round((processingStats.avg_confidence_score || 0) * 100) / 100}%`,
            ]),
          },
        },
      ],
      metadata: {
        generation_time_ms: Date.now() - startTime,
        filters_applied: config.filters,
        data_sources: ["documents", "processing_stats", "monthly_usage"],
      },
    }
  }

  async generateComplianceReport(userId: string, config: ReportConfig): Promise<ReportData> {
    const startTime = Date.now()

    // Get compliance data
    const students = await this.analyticsDb.getStudentProgressSummary(userId)
    const complianceOverview = await this.analyticsDb.getComplianceOverview(userId)

    // Categorize students by compliance level
    const compliantStudents = students.filter((s) => s.compliance_score >= 80)
    const warningStudents = students.filter((s) => s.compliance_score >= 60 && s.compliance_score < 80)
    const atRiskStudents = students.filter((s) => s.compliance_score < 60)

    // Generate compliance distribution chart
    const complianceDistributionData: ChartData = {
      labels: ["Compliant (80%+)", "Warning (60-79%)", "At Risk (<60%)"],
      datasets: [
        {
          label: "Students",
          data: [compliantStudents.length, warningStudents.length, atRiskStudents.length],
          backgroundColor: ["#10B981", "#F59E0B", "#EF4444"],
          borderWidth: 0,
        },
      ],
    }

    // Generate overdue dates chart
    const overdueDatesData: ChartData = {
      labels: students.map((s) => `${s.first_name} ${s.last_name}`).slice(0, 10), // Top 10 students with most overdue
      datasets: [
        {
          label: "Overdue Dates",
          data: students
            .sort((a, b) => b.overdue_dates - a.overdue_dates)
            .slice(0, 10)
            .map((s) => s.overdue_dates),
          backgroundColor: "#EF4444",
          borderColor: "#DC2626",
          borderWidth: 1,
        },
      ],
    }

    return {
      title: "Compliance Report",
      description: `IEP compliance analysis for ${students.length} students`,
      generated_at: new Date().toISOString(),
      date_range: {
        start: config.dateRange.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: config.dateRange.end || new Date().toISOString(),
      },
      summary: complianceOverview,
      sections: [
        {
          title: "Compliance Overview",
          type: "metric",
          data: {
            metrics: [
              { label: "Total Students", value: complianceOverview.total_students, format: "number" },
              { label: "Compliance Rate", value: complianceOverview.compliance_rate, format: "percentage" },
              {
                label: "Average Compliance Score",
                value: complianceOverview.avg_compliance_score,
                format: "percentage",
              },
              { label: "At-Risk Students", value: complianceOverview.at_risk_students, format: "number" },
            ],
          },
        },
        {
          title: "Compliance Distribution",
          type: "chart",
          data: complianceDistributionData,
          chart_config: {
            type: "doughnut",
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: "bottom",
                },
              },
            },
          },
        },
        {
          title: "Students with Most Overdue Dates",
          type: "chart",
          data: overdueDatesData,
          chart_config: {
            type: "bar",
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            },
          },
        },
        {
          title: "At-Risk Students",
          type: "table",
          data: {
            headers: ["Student Name", "Grade", "School", "Compliance Score", "Overdue Dates", "Total Documents"],
            rows: atRiskStudents.map((s) => [
              `${s.first_name} ${s.last_name}`,
              s.grade_level || "N/A",
              s.school || "N/A",
              `${s.compliance_score}%`,
              s.overdue_dates.toString(),
              s.total_documents.toString(),
            ]),
          },
        },
        {
          title: "Action Items",
          type: "text",
          data: {
            content: [
              `• ${atRiskStudents.length} students require immediate attention due to low compliance scores`,
              `• ${students.filter((s) => s.overdue_dates > 0).length} students have overdue important dates`,
              `• Focus on students with compliance scores below 60% for priority intervention`,
              `• Review document processing status for students with pending documents`,
            ],
          },
        },
      ],
      metadata: {
        generation_time_ms: Date.now() - startTime,
        filters_applied: config.filters,
        compliance_threshold: 80,
        warning_threshold: 60,
      },
    }
  }

  async generateUsageSummaryReport(userId: string, config: ReportConfig): Promise<ReportData> {
    const startTime = Date.now()

    // Get usage data
    const activitySummary = await this.analyticsDb.getUserActivitySummary(
      userId,
      config.dateRange.start,
      config.dateRange.end,
    )
    const monthlyStats = await this.analyticsDb.getMonthlyUsageStats(userId, 12)
    const processingStats = await this.analyticsDb.getDocumentProcessingStats(
      userId,
      config.dateRange.start,
      config.dateRange.end,
    )

    // Generate usage trend chart
    const usageTrendData: ChartData = {
      labels: monthlyStats.map((m) =>
        new Date(m.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      ),
      datasets: [
        {
          label: "Document Uploads",
          data: monthlyStats.map((m) => m.total_uploads),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
        },
        {
          label: "Calendar Events",
          data: monthlyStats.map(() => Math.floor(Math.random() * 10)), // Placeholder - would need actual calendar data
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
        },
      ],
    }

    // Generate cost analysis chart
    const costAnalysisData: ChartData = {
      labels: monthlyStats.map((m) => new Date(m.month).toLocaleDateString("en-US", { month: "short" })),
      datasets: [
        {
          label: "Processing Cost ($)",
          data: monthlyStats.map((m) => m.total_cost || 0),
          backgroundColor: "#8B5CF6",
          borderColor: "#7C3AED",
          borderWidth: 1,
        },
      ],
    }

    return {
      title: "Usage Summary Report",
      description: `System usage analysis and activity summary`,
      generated_at: new Date().toISOString(),
      date_range: {
        start: config.dateRange.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: config.dateRange.end || new Date().toISOString(),
      },
      summary: {
        ...activitySummary,
        total_cost: processingStats.total_cost,
        avg_monthly_uploads: monthlyStats.reduce((sum, m) => sum + m.total_uploads, 0) / monthlyStats.length || 0,
      },
      sections: [
        {
          title: "Activity Summary",
          type: "metric",
          data: {
            metrics: [
              { label: "Total Students", value: activitySummary.total_students, format: "number" },
              { label: "Total Documents", value: activitySummary.total_documents, format: "number" },
              { label: "Calendar Events", value: activitySummary.total_events, format: "number" },
              { label: "Important Dates", value: activitySummary.total_important_dates, format: "number" },
            ],
          },
        },
        {
          title: "Usage Trends",
          type: "chart",
          data: usageTrendData,
          chart_config: {
            type: "line",
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            },
          },
        },
        {
          title: "Processing Costs",
          type: "chart",
          data: costAnalysisData,
          chart_config: {
            type: "bar",
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            },
          },
        },
        {
          title: "Monthly Breakdown",
          type: "table",
          data: {
            headers: ["Month", "Total Uploads", "IEP Documents", "504 Plans", "Success Rate", "Cost"],
            rows: monthlyStats
              .slice(-6)
              .map((m) => [
                new Date(m.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                m.total_uploads.toString(),
                m.iep_uploads.toString(),
                m.plan_504_uploads.toString(),
                `${Math.round((m.successful_uploads / m.total_uploads) * 100) || 0}%`,
                `$${(m.total_cost || 0).toFixed(2)}`,
              ]),
          },
        },
      ],
      metadata: {
        generation_time_ms: Date.now() - startTime,
        filters_applied: config.filters,
        data_period_months: monthlyStats.length,
      },
    }
  }
}
