"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/dialog"
import {
  Edit,
  Trash2,
  FileText,
  Calendar,
  School,
  User,
  Upload,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]
type Document = Database["public"]["Tables"]["documents"]["Row"]

interface StudentWithDocuments extends Student {
  documents: Document[]
}

interface StudentDetailEnhancedProps {
  student: StudentWithDocuments
}

const statusConfig = {
  pending: { icon: Clock, label: "Pending", variant: "secondary" as const, color: "text-yellow-600" },
  processing: { icon: Loader2, label: "Processing", variant: "secondary" as const, color: "text-blue-600" },
  completed: { icon: CheckCircle, label: "Completed", variant: "default" as const, color: "text-green-600" },
  failed: { icon: AlertCircle, label: "Failed", variant: "destructive" as const, color: "text-red-600" },
}

export function StudentDetailEnhanced({ student }: StudentDetailEnhancedProps) {
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/students/${student.id}`, { method: "DELETE" })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete student")
      }

      toast({
        title: "Student deleted",
        description: `${student.first_name} ${student.last_name} has been deleted successfully.`,
      })
      router.push("/students")
    } catch (error) {
      console.error("Delete student error:", error)
      toast({
        title: "Failed to delete student",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleExportStudent = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/students/${student.id}/export`)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${student.first_name}-${student.last_name}-report.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({ title: "Export completed", description: "Student report has been downloaded" })
    } catch (error) {
      toast({ title: "Export failed", description: "Failed to export student report", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  const hasDocuments = student.documents && student.documents.length > 0
  const completedDocs = student.documents?.filter((d) => d.processing_status === "completed").length || 0
  const pendingDocs = student.documents?.filter((d) => d.processing_status === "pending").length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-muted-foreground">Student profile and document management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportStudent} disabled={exporting} className="bg-transparent">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href={`/students/${student.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {student.first_name} {student.last_name}? This action cannot be
                  undone.
                  {hasDocuments && (
                    <span className="block mt-2 text-destructive font-medium">
                      Warning: This student has {student.documents.length} associated document
                      {student.documents.length !== 1 ? "s" : ""} that will be unlinked.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete Student
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Full Name</div>
                <p className="text-lg font-semibold">
                  {student.first_name} {student.last_name}
                </p>
              </div>

              {student.date_of_birth && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                  <p>{new Date(student.date_of_birth).toLocaleDateString()}</p>
                </div>
              )}

              {student.grade_level && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Grade Level</div>
                  <Badge variant="outline">{student.grade_level}</Badge>
                </div>
              )}

              {student.school && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">School</div>
                  <p className="flex items-center gap-2">
                    <School className="h-4 w-4 text-muted-foreground" />
                    {student.school}
                  </p>
                </div>
              )}

              {student.case_manager && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Case Manager</div>
                  <p>{student.case_manager}</p>
                </div>
              )}

              <div>
                <div className="text-sm font-medium text-muted-foreground">Created</div>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(student.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Document Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Document Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Total Documents</span>
                <Badge variant="outline">{student.documents?.length || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Completed</span>
                <Badge variant="default">{completedDocs}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Processing</span>
                <Badge variant="secondary">{pendingDocs}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link href={`/upload?student=${student.id}`}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href={`/students/${student.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Student
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Documents */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({student.documents?.length || 0})
                </CardTitle>
                <CardDescription>IEP and 504 plan documents for this student</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/upload?student=${student.id}`}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!hasDocuments ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
                  <Button asChild>
                    <Link href={`/upload?student=${student.id}`}>Upload First Document</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {student.documents.map((document) => {
                    const status = statusConfig[document.processing_status as keyof typeof statusConfig]
                    const StatusIcon = status.icon

                    return (
                      <div
                        key={document.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{document.file_name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-sm text-muted-foreground">{formatDate(document.created_at)}</p>
                              {document.document_type && (
                                <Badge variant="outline" className="text-xs">
                                  {document.document_type.toUpperCase()}
                                </Badge>
                              )}
                              {document.file_size && (
                                <span className="text-xs text-muted-foreground">
                                  {(document.file_size / 1024 / 1024).toFixed(1)} MB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusIcon
                            className={`h-4 w-4 ${status.color} ${
                              document.processing_status === "processing" ? "animate-spin" : ""
                            }`}
                          />
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
