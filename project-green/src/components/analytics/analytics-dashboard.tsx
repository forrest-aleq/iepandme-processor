"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  PieChart,
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  Download,
  Calendar,
  Target,
  DollarSign,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ReportGenerator } from "./report-generator"
import { AnalyticsChart } from "./analytics-chart"

interface AnalyticsDashboardProps {
  initialData?: any
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  })
  const [showReportGenerator, setShowReportGenerator] = useState(false)
  const { toast } = useToast()

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      })

      const response = await fetch(`/api/analytics/dashboard?${params}`)
      if (!response.ok) throw new Error("Failed to fetch dashboard data")

      const data = await response.json()
      setDashboardData(data.dashboard)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load analytics dashboard",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData) {
      fetchDashboardData()
    }
  }, [dateRange])

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Unable to load analytics dashboard data.</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  const { overview, student_progress, document_analytics, usage_trends, charts } = dashboardData

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into your IEP management system</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateRangeChange(e.target.value, dateRange.end)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange(dateRange.start, e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <Button onClick={() => setShowReportGenerator(true)}>
            <Download className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_students}</div>
            <p className="text-xs text-muted-foreground">Active student profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_documents}</div>
            <p className="text-xs text-muted-foreground">
              {overview.avg_confidence_score
                ? `${Math.round(overview.avg_confidence_score)}% avg confidence`
                : "All time"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student_progress.compliance_overview.compliance_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {student_progress.compliance_overview.compliant_students} of{" "}
              {student_progress.compliance_overview.total_students} students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(usage_trends.total_cost || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total processing costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly Upload Trends
                </CardTitle>
                <CardDescription>Document uploads over time</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  type="line"
                  data={{
                    labels: charts.monthly_uploads.labels,
                    datasets: [
                      {
                        label: "Uploads",
                        data: charts.monthly_uploads.data,
                        borderColor: "#3B82F6",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        borderWidth: 2,
                        fill: true,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Document Types
                </CardTitle>
                <CardDescription>Distribution of document types</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  type="doughnut"
                  data={{
                    labels: charts.document_types.labels.map((label) => label.toUpperCase()),
                    datasets: [
                      {
                        data: charts.document_types.data,
                        backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: "bottom",
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Processing Success Rates
                </CardTitle>
                <CardDescription>Success rate by document type</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  type="bar"
                  data={{
                    labels: charts.success_rates.labels.map((label) => label.toUpperCase()),
                    datasets: [
                      {
                        label: "Success Rate (%)",
                        data: charts.success_rates.data,
                        backgroundColor: charts.success_rates.data.map((rate) =>
                          rate >= 90 ? "#10B981" : rate >= 70 ? "#F59E0B" : "#EF4444",
                        ),
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Compliance Distribution
                </CardTitle>
                <CardDescription>Student compliance levels</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  type="doughnut"
                  data={{
                    labels: charts.compliance_distribution.labels,
                    datasets: [
                      {
                        data: charts.compliance_distribution.data,
                        backgroundColor: ["#10B981", "#F59E0B", "#EF4444"],
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: "bottom",
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Student Progress Summary</CardTitle>
                <CardDescription>Overview of all students and their progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {student_progress.summary.slice(0, 10).map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {student.first_name} {student.last_name}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>{student.grade_level || "N/A"}</span>
                          <span>{student.school || "N/A"}</span>
                          <span>{student.total_documents} documents</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            student.compliance_score >= 80
                              ? "default"
                              : student.compliance_score >= 60
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {student.compliance_score}% Compliant
                        </Badge>
                        {student.overdue_dates > 0 && (
                          <Badge variant="destructive">{student.overdue_dates} Overdue</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Summary</CardTitle>
                <CardDescription>Overall compliance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {student_progress.compliance_overview.compliance_rate}%
                  </div>
                  <p className="text-sm text-gray-600">Overall Compliance Rate</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Compliant Students</span>
                    <Badge className="bg-green-100 text-green-800">
                      {student_progress.compliance_overview.compliant_students}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">At-Risk Students</span>
                    <Badge variant="destructive">{student_progress.compliance_overview.at_risk_students}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Score</span>
                    <Badge variant="secondary">{student_progress.compliance_overview.avg_compliance_score}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Processing Statistics</CardTitle>
                <CardDescription>Processing performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {document_analytics.processing_stats.total_processed}
                    </div>
                    <p className="text-sm text-blue-600">Total Processed</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {document_analytics.processing_stats.success_rate}%
                    </div>
                    <p className="text-sm text-green-600">Success Rate</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(document_analytics.processing_stats.documents_by_type).map(([type, stats]) => (
                    <div key={type} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <span className="font-medium">{type.toUpperCase()}</span>
                        <p className="text-sm text-gray-600">{stats.count} documents</p>
                      </div>
                      <Badge
                        variant={
                          stats.success_rate >= 90 ? "default" : stats.success_rate >= 70 ? "secondary" : "destructive"
                        }
                      >
                        {stats.success_rate}% Success
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Processing Trends</CardTitle>
                <CardDescription>Document processing over time</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  type="line"
                  data={{
                    labels: usage_trends.monthly_stats.map((m) =>
                      new Date(m.month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                    ),
                    datasets: [
                      {
                        label: "Total Uploads",
                        data: usage_trends.monthly_stats.map((m) => m.total_uploads),
                        borderColor: "#3B82F6",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        borderWidth: 2,
                      },
                      {
                        label: "Successful",
                        data: usage_trends.monthly_stats.map((m) => m.successful_uploads),
                        borderColor: "#10B981",
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>At-Risk Students</CardTitle>
                <CardDescription>Students requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {student_progress.summary
                    .filter((s) => s.compliance_score < 60)
                    .slice(0, 8)
                    .map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900">
                            {student.first_name} {student.last_name}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-red-700 mt-1">
                            <span>{student.grade_level || "N/A"}</span>
                            <span>{student.overdue_dates} overdue dates</span>
                            <span>{student.pending_documents} pending docs</span>
                          </div>
                        </div>
                        <Badge variant="destructive">{student.compliance_score}%</Badge>
                      </div>
                    ))}

                  {student_progress.summary.filter((s) => s.compliance_score < 60).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No at-risk students found. Great job!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Recommended next steps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {student_progress.compliance_overview.at_risk_students > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-900">High Priority</span>
                      </div>
                      <p className="text-sm text-red-700">
                        {student_progress.compliance_overview.at_risk_students} students need immediate attention
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-900">Upcoming Deadlines</span>
                    </div>
                    <p className="text-sm text-yellow-700">Review important dates for the next 30 days</p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Document Review</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {document_analytics.processing_stats.total_processed -
                        (document_analytics.processing_stats.success_rate / 100) *
                          document_analytics.processing_stats.total_processed}{" "}
                      documents need review
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Report Generator Modal */}
      {showReportGenerator && (
        <ReportGenerator open={showReportGenerator} onOpenChange={setShowReportGenerator} dateRange={dateRange} />
      )}
    </div>
  )
}
