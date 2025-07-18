"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Users, BarChart3, Shield, Settings, Calendar, Filter } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { ReportConfig } from "@/lib/analytics/types"

interface ReportGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateRange: {
    start: string
    end: string
  }
}

export function ReportGenerator({ open, onOpenChange, dateRange }: ReportGeneratorProps) {
  const [selectedReportType, setSelectedReportType] = useState<string>("student_progress")
  const [config, setConfig] = useState<ReportConfig>({
    dateRange: {
      start: dateRange.start,
      end: dateRange.end,
      preset: "custom",
    },
    filters: {
      students: [],
      document_types: [],
      processing_status: [],
      grade_levels: [],
      schools: [],
    },
    groupBy: undefined,
    metrics: [],
    format: "pdf",
    includeCharts: true,
  })
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  const reportTypes = [
    {
      id: "student_progress",
      title: "Student Progress Report",
      description: "Comprehensive analysis of student progress, compliance scores, and document completion rates",
      icon: Users,
      metrics: ["compliance_score", "document_completion", "overdue_dates", "progress_trends"],
    },
    {
      id: "document_analytics",
      title: "Document Analytics Report",
      description: "Processing statistics, success rates, and document type analysis",
      icon: FileText,
      metrics: ["processing_stats", "success_rates", "document_types", "confidence_scores"],
    },
    {
      id: "usage_summary",
      title: "Usage Summary Report",
      description: "System usage patterns, activity trends, and cost analysis",
      icon: BarChart3,
      metrics: ["usage_trends", "activity_summary", "cost_analysis", "monthly_stats"],
    },
    {
      id: "compliance",
      title: "Compliance Report",
      description: "IEP compliance tracking, deadline management, and risk assessment",
      icon: Shield,
      metrics: ["compliance_overview", "deadline_tracking", "risk_assessment", "action_items"],
    },
  ]

  const handleGenerateReport = async () => {
    if (!selectedReportType) {
      toast({
        title: "Error",
        description: "Please select a report type",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/analytics/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_type: selectedReportType,
          config,
          format: config.format,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate report")
      }

      if (config.format === "json") {
        const data = await response.json()
        // Handle JSON response - could show in modal or download
        console.log("Report data:", data.report)
        toast({
          title: "Report Generated",
          description: "Report data is available in the console",
        })
      } else {
        // Handle file download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `${selectedReportType}_report_${new Date().toISOString().split("T")[0]}.${config.format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Report Downloaded",
          description: `Your ${selectedReportType.replace("_", " ")} report has been downloaded`,
        })
      }

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const selectedReport = reportTypes.find((r) => r.id === selectedReportType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Generate Analytics Report
          </DialogTitle>
          <DialogDescription>Create comprehensive reports with customizable filters and formats</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="type" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="type">Report Type</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="preview">Preview & Generate</TabsTrigger>
          </TabsList>

          <TabsContent value="type" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedReportType === report.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedReportType(report.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <report.icon className="h-5 w-5" />
                      {report.title}
                    </CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {report.metrics.map((metric) => (
                        <Badge key={metric} variant="secondary" className="text-xs">
                          {metric.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Range */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={config.dateRange.start}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, start: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={config.dateRange.end}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, end: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Quick Presets</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { label: "Last 7 days", value: "last_7_days" },
                        { label: "Last 30 days", value: "last_30_days" },
                        { label: "Last 90 days", value: "last_90_days" },
                        { label: "Last year", value: "last_year" },
                      ].map((preset) => (
                        <Button
                          key={preset.value}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const now = new Date()
                            const start = new Date()

                            switch (preset.value) {
                              case "last_7_days":
                                start.setDate(now.getDate() - 7)
                                break
                              case "last_30_days":
                                start.setDate(now.getDate() - 30)
                                break
                              case "last_90_days":
                                start.setDate(now.getDate() - 90)
                                break
                              case "last_year":
                                start.setFullYear(now.getFullYear() - 1)
                                break
                            }

                            setConfig((prev) => ({
                              ...prev,
                              dateRange: {
                                start: start.toISOString().split("T")[0],
                                end: now.toISOString().split("T")[0],
                                preset: preset.value as any,
                              },
                            }))
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Document Types</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["iep", "504", "other"].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`doc-${type}`}
                            checked={config.filters.document_types?.includes(type)}
                            onCheckedChange={(checked) => {
                              setConfig((prev) => ({
                                ...prev,
                                filters: {
                                  ...prev.filters,
                                  document_types: checked
                                    ? [...(prev.filters.document_types || []), type]
                                    : prev.filters.document_types?.filter((t) => t !== type) || [],
                                },
                              }))
                            }}
                          />
                          <Label htmlFor={`doc-${type}`} className="text-sm">
                            {type.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Processing Status</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["completed", "pending", "failed"].map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={config.filters.processing_status?.includes(status)}
                            onCheckedChange={(checked) => {
                              setConfig((prev) => ({
                                ...prev,
                                filters: {
                                  ...prev.filters,
                                  processing_status: checked
                                    ? [...(prev.filters.processing_status || []), status]
                                    : prev.filters.processing_status?.filter((s) => s !== status) || [],
                                },
                              }))
                            }}
                          />
                          <Label htmlFor={`status-${status}`} className="text-sm capitalize">
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Format Options */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Output Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Format</Label>
                      <Select
                        value={config.format}
                        onValueChange={(value: "pdf" | "csv" | "json") =>
                          setConfig((prev) => ({ ...prev, format: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Report</SelectItem>
                          <SelectItem value="csv">CSV Data</SelectItem>
                          <SelectItem value="json">JSON Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Group By</Label>
                      <Select
                        value={config.groupBy || "none"}
                        onValueChange={(value) =>
                          setConfig((prev) => ({
                            ...prev,
                            groupBy: value === "none" ? undefined : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No grouping" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No grouping</SelectItem>
                          <SelectItem value="student">By Student</SelectItem>
                          <SelectItem value="document_type">By Document Type</SelectItem>
                          <SelectItem value="month">By Month</SelectItem>
                          <SelectItem value="school">By School</SelectItem>
                          <SelectItem value="grade_level">By Grade Level</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {/* Preview & Generate Tab Content */}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
