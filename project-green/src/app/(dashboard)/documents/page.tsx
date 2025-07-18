import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default async function DocumentsPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch all documents for the user
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching documents:", error)
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Pending",
      variant: "secondary" as const,
      color: "text-yellow-600",
    },
    processing: {
      icon: Loader2,
      label: "Processing",
      variant: "secondary" as const,
      color: "text-blue-600",
    },
    completed: {
      icon: CheckCircle,
      label: "Completed",
      variant: "default" as const,
      color: "text-green-600",
    },
    failed: {
      icon: AlertCircle,
      label: "Failed",
      variant: "destructive" as const,
      color: "text-red-600",
    },
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">View and manage all your uploaded IEP and 504 plan documents</p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {!documents || documents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Documents Yet</CardTitle>
            <CardDescription>Upload your first IEP or 504 plan document to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">You haven't uploaded any documents yet</p>
              <Button asChild>
                <Link href="/upload">Upload Your First Document</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => {
            const status = statusConfig[document.processing_status as keyof typeof statusConfig]
            const StatusIcon = status.icon

            return (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{document.file_name}</h3>
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
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <StatusIcon
                          className={`h-4 w-4 ${status.color} ${
                            document.processing_status === "processing" ? "animate-spin" : ""
                          }`}
                        />
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
