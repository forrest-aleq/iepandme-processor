import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import type { Database } from "@/types/database"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface RecentDocumentsProps {
  documents: Document[]
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

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
          <CardDescription>Your recently uploaded documents will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
            <Button asChild>
              <Link href="/upload">Upload Your First Document</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Documents</CardTitle>
          <CardDescription>Your latest document uploads and processing status</CardDescription>
        </div>
        <Button variant="outline" asChild>
          <Link href="/documents">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((document) => {
            const status = statusConfig[document.processing_status as keyof typeof statusConfig]
            const StatusIcon = status.icon

            return (
              <div key={document.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{document.file_name}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-muted-foreground">{formatDate(document.created_at)}</p>
                    {document.document_type && (
                      <Badge variant="outline" className="text-xs">
                        {document.document_type.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIcon
                    className={`h-4 w-4 ${status.color} ${
                      document.processing_status === "processing" ? "animate-spin" : ""
                    }`}
                  />
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
