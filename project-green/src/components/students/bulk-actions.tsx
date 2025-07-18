"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import { Trash2, GraduationCap, School, Download, Loader2, Users } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]

interface BulkActionsProps {
  selectedStudents: Student[]
  onActionComplete: () => void
  onClearSelection: () => void
}

const gradeOptions = [
  "Pre-K",
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "Post-Secondary",
]

export function BulkActions({ selectedStudents, onActionComplete, onClearSelection }: BulkActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [bulkGrade, setBulkGrade] = useState("")
  const [bulkSchool, setBulkSchool] = useState("")
  const { toast } = useToast()

  const selectedCount = selectedStudents.length

  if (selectedCount === 0) {
    return null
  }

  const handleBulkAction = async (action: string, data?: any) => {
    setLoading(action)

    try {
      const response = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          studentIds: selectedStudents.map((s) => s.id),
          data,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Bulk action failed")
      }

      const result = await response.json()

      let message = ""
      switch (action) {
        case "delete":
          message = `Successfully deleted ${result.affected_count} student${result.affected_count !== 1 ? "s" : ""}`
          break
        case "updateGrade":
          message = `Successfully updated grade for ${result.affected_count} student${result.affected_count !== 1 ? "s" : ""}`
          break
        case "updateSchool":
          message = `Successfully updated school for ${result.affected_count} student${result.affected_count !== 1 ? "s" : ""}`
          break
      }

      toast({ title: "Bulk action completed", description: message })
      onActionComplete()
      onClearSelection()
    } catch (error) {
      console.error("Bulk action error:", error)
      toast({
        title: "Bulk action failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleExport = async () => {
    setLoading("export")
    try {
      const response = await fetch("/api/students/export?format=csv")
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `students-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({ title: "Export completed", description: "Student data has been exported to CSV file" })
    } catch (error) {
      toast({ title: "Export failed", description: "Failed to export student data", variant: "destructive" })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Bulk Actions
          <span className="text-sm font-normal text-muted-foreground">
            ({selectedCount} student{selectedCount !== 1 ? "s" : ""} selected)
          </span>
        </CardTitle>
        <CardDescription>Perform actions on multiple students at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onClearSelection} size="sm" className="bg-transparent">
            Clear Selection
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading === "export"}
            size="sm"
            className="bg-transparent"
          >
            {loading === "export" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export All
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium">Update Grade Level</Label>
          <div className="flex gap-2">
            <Select value={bulkGrade} onValueChange={setBulkGrade}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select new grade level" />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => handleBulkAction("updateGrade", { grade_level: bulkGrade })}
              disabled={!bulkGrade || loading === "updateGrade"}
              size="sm"
            >
              {loading === "updateGrade" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GraduationCap className="mr-2 h-4 w-4" />
              )}
              Update
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Update School</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter school name"
              value={bulkSchool}
              onChange={(e) => setBulkSchool(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => handleBulkAction("updateSchool", { school: bulkSchool })}
              disabled={!bulkSchool.trim() || loading === "updateSchool"}
              size="sm"
            >
              {loading === "updateSchool" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <School className="mr-2 h-4 w-4" />
              )}
              Update
            </Button>
          </div>
        </div>

        <Separator />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={loading === "delete"} className="w-full">
              {loading === "delete" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Selected Students
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Students</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedCount} student{selectedCount !== 1 ? "s" : ""}? This action
                cannot be undone. Associated documents will be unlinked but not deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleBulkAction("delete")}
                className="bg-destructive text-destructive-foreground"
              >
                Delete Students
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
