"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { UpgradeModal } from "@/components/billing/upgrade-modal"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]

interface UploadZoneProps {
  uploadsRemaining: number
  isProUser: boolean
  students?: Student[]
}

export function UploadZone({ uploadsRemaining, isProUser, students = [] }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string>("none")
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pre-select student if provided in URL
  const preSelectedStudent = searchParams.get("student")
  if (preSelectedStudent && !selectedStudent && students.length > 0) {
    const student = students.find((s) => s.id === preSelectedStudent)
    if (student) {
      setSelectedStudent(preSelectedStudent)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!isProUser && uploadsRemaining <= 0) {
        setShowUpgradeModal(true)
        return
      }

      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      setUploadProgress(0)

      try {
        const formData = new FormData()
        formData.append("file", file)
        if (selectedStudent !== "none") {
          formData.append("studentId", selectedStudent)
        }

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + Math.random() * 15
          })
        }, 200)

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        })

        clearInterval(progressInterval)
        setUploadProgress(100)

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Upload failed")
        }

        const result = await response.json()

        toast({
          title: "Upload successful!",
          description:
            selectedStudent !== "none"
              ? "Document uploaded and linked to student successfully."
              : "Document uploaded successfully. You can link it to a student later.",
        })

        // Reset form
        setSelectedStudent("none")

        // Refresh the page to show updated data
        setTimeout(() => {
          router.refresh()
        }, 1000)
      } catch (error) {
        console.error("Upload error:", error)
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setTimeout(() => {
          setUploading(false)
          setUploadProgress(0)
        }, 1000)
      }
    },
    [uploadsRemaining, isProUser, selectedStudent, toast, router],
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading,
  })

  const hasFileRejections = fileRejections.length > 0

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Upload Document
            {!isProUser && (
              <div className="text-sm font-normal text-muted-foreground">{uploadsRemaining} of 3 uploads remaining</div>
            )}
          </CardTitle>
          <CardDescription>Upload IEP or 504 plan documents for AI-powered extraction and analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Student Selection */}
          {students.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="student-select">Link to Student (Optional)</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger id="student-select">
                  <SelectValue placeholder="Select a student to link this document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No student (link later)</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                      {student.grade_level && ` - Grade ${student.grade_level}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File Rejection Errors */}
          {hasFileRejections && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {fileRejections[0].errors[0].code === "file-too-large"
                  ? "File is too large. Maximum size is 10MB."
                  : fileRejections[0].errors[0].code === "file-invalid-type"
                    ? "Invalid file type. Please upload PDF, DOC, or DOCX files."
                    : "File upload error. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {uploadProgress < 90 ? "Uploading document..." : "Processing document..."}
                  </p>
                </div>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">{Math.round(uploadProgress)}% complete</p>
            </div>
          )}

          {/* Upload Zone */}
          {!uploading && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                ${
                  isDragActive
                    ? "border-primary bg-primary/5 scale-105"
                    : !isProUser && uploadsRemaining <= 0
                      ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                      : "border-gray-300 hover:border-primary hover:bg-primary/5"
                }
              `}
            >
              <input {...getInputProps()} />

              {!isProUser && uploadsRemaining <= 0 ? (
                <div className="space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-600">Upload limit reached</p>
                    <p className="text-sm text-gray-500 mt-1">
                      You've used all 3 free uploads this month. Upgrade to Pro for unlimited uploads.
                    </p>
                  </div>
                  <Button onClick={() => setShowUpgradeModal(true)} className="mt-4">
                    Upgrade to Pro
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {isDragActive ? (
                      <Upload className="h-12 w-12 text-primary animate-bounce" />
                    ) : (
                      <FileText className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive ? "Drop your document here" : "Upload IEP or 504 Plan"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Drag and drop or click to browse • PDF, DOC, DOCX • Max 10MB
                    </p>
                    {selectedStudent !== "none" && (
                      <p className="text-sm text-primary mt-2">
                        Will be linked to: {students.find((s) => s.id === selectedStudent)?.first_name}{" "}
                        {students.find((s) => s.id === selectedStudent)?.last_name}
                      </p>
                    )}
                  </div>
                  {!isDragActive && (
                    <Button variant="outline" className="bg-transparent">
                      Choose File
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {uploadProgress === 100 && !uploading && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Document uploaded successfully! Processing will begin shortly.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        title="Upgrade Required"
        description="You've reached your monthly upload limit. Upgrade to Pro for unlimited uploads and advanced features."
      />
    </>
  )
}
