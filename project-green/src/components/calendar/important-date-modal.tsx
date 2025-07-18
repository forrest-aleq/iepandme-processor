"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { ImportantDate } from "@/lib/calendar/types"

const dateSchema = z.object({
  student_id: z.string().min(1, "Student is required"),
  date_type: z.enum(["iep_annual", "evaluation_due", "transition_planning", "eligibility_review"]),
  due_date: z.string().min(1, "Due date is required"),
  description: z.string().min(1, "Description is required"),
})

type DateFormData = z.infer<typeof dateSchema>

interface ImportantDateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date?: ImportantDate | null
  onSave: () => void
  onClose: () => void
}

export function ImportantDateModal({ open, onOpenChange, date, onSave, onClose }: ImportantDateModalProps) {
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DateFormData>({
    resolver: zodResolver(dateSchema),
    defaultValues: {
      date_type: "iep_annual",
    },
  })

  const dateType = watch("date_type")
  const studentId = watch("student_id")

  // Fetch students for dropdown
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch("/api/students")
        if (response.ok) {
          const data = await response.json()
          setStudents(data.students)
        }
      } catch (error) {
        console.error("Failed to fetch students:", error)
      }
    }

    if (open) {
      fetchStudents()
    }
  }, [open])

  // Populate form when editing existing date
  useEffect(() => {
    if (date) {
      reset({
        student_id: date.student_id,
        date_type: date.date_type as any,
        due_date: date.due_date,
        description: date.description,
      })
    } else {
      reset({
        student_id: "",
        date_type: "iep_annual",
        due_date: "",
        description: "",
      })
    }
  }, [date, reset])

  const onSubmit = async (data: DateFormData) => {
    setLoading(true)

    try {
      const url = date ? `/api/calendar/important-dates/${date.id}` : "/api/calendar/important-dates"
      const method = date ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to save important date")

      toast({
        title: date ? "Date updated" : "Date created",
        description: `Important date has been ${date ? "updated" : "created"} successfully`,
      })

      onSave()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save important date",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const dateTypeOptions = [
    { value: "iep_annual", label: "IEP Annual Review", description: "Annual IEP review meeting" },
    { value: "evaluation_due", label: "Evaluation Due", description: "Triennial or other evaluation" },
    { value: "transition_planning", label: "Transition Planning", description: "Transition services planning" },
    { value: "eligibility_review", label: "Eligibility Review", description: "Special education eligibility review" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {date ? "Edit Important Date" : "Add Important Date"}
          </DialogTitle>
          <DialogDescription>
            {date ? "Update the important date details below" : "Add a new important date to track"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Student */}
          <div className="space-y-2">
            <Label>Student *</Label>
            <Select value={studentId} onValueChange={(value) => setValue("student_id", value)}>
              <SelectTrigger className={errors.student_id ? "border-destructive" : ""}>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.student_id && <p className="text-sm text-destructive">{errors.student_id.message}</p>}
          </div>

          {/* Date Type */}
          <div className="space-y-2">
            <Label>Date Type *</Label>
            <Select value={dateType} onValueChange={(value) => setValue("date_type", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select date type" />
              </SelectTrigger>
              <SelectContent>
                {dateTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="date"
              {...register("due_date")}
              className={errors.due_date ? "border-destructive" : ""}
            />
            {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe this important date"
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
              rows={3}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {date ? "Update" : "Create"} Date
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
