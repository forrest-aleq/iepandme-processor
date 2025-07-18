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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Save, Trash2, Calendar, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { CalendarEvent } from "@/lib/calendar/types"

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  start_time: z.string().optional(),
  end_date: z.string().optional(),
  end_time: z.string().optional(),
  all_day: z.boolean().default(false),
  event_type: z.enum(["iep_review", "evaluation", "meeting", "deadline", "other"]),
  student_id: z.string().optional(),
  location: z.string().optional(),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEvent | null
  onSave: (eventData: any) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

export function EventModal({ open, onOpenChange, event, onSave, onDelete, onClose }: EventModalProps) {
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
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      all_day: false,
      event_type: "other",
    },
  })

  const allDay = watch("all_day")
  const eventType = watch("event_type")
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

  // Populate form when editing existing event
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_date)
      const endDate = event.end_date ? new Date(event.end_date) : null

      reset({
        title: event.title,
        description: event.description || "",
        start_date: startDate.toISOString().split("T")[0],
        start_time: event.all_day ? "" : startDate.toTimeString().slice(0, 5),
        end_date: endDate ? endDate.toISOString().split("T")[0] : "",
        end_time: event.all_day || !endDate ? "" : endDate.toTimeString().slice(0, 5),
        all_day: event.all_day,
        event_type: event.event_type as any,
        student_id: event.student_id || "",
        location: event.location || "",
      })
    } else {
      reset({
        title: "",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        start_time: "09:00",
        end_date: "",
        end_time: "10:00",
        all_day: false,
        event_type: "other",
        student_id: "",
        location: "",
      })
    }
  }, [event, reset])

  const onSubmit = async (data: EventFormData) => {
    setLoading(true)

    try {
      // Construct start and end dates
      let startDate: string
      let endDate: string | undefined

      if (data.all_day) {
        startDate = `${data.start_date}T00:00:00.000Z`
        endDate = data.end_date ? `${data.end_date}T23:59:59.999Z` : undefined
      } else {
        startDate = `${data.start_date}T${data.start_time || "09:00"}:00.000Z`
        if (data.end_date && data.end_time) {
          endDate = `${data.end_date}T${data.end_time}:00.000Z`
        } else if (data.end_time) {
          endDate = `${data.start_date}T${data.end_time}:00.000Z`
        }
      }

      const eventData = {
        title: data.title,
        description: data.description,
        start_date: startDate,
        end_date: endDate,
        all_day: data.all_day,
        event_type: data.event_type,
        student_id: data.student_id || null,
        location: data.location,
        attendees: [],
      }

      await onSave(eventData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    setLoading(true)
    try {
      await onDelete()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const eventTypeOptions = [
    { value: "iep_review", label: "IEP Review", icon: "📋" },
    { value: "evaluation", label: "Evaluation", icon: "📊" },
    { value: "meeting", label: "Meeting", icon: "👥" },
    { value: "deadline", label: "Deadline", icon: "⏰" },
    { value: "other", label: "Other", icon: "📅" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription>
            {event ? "Update the event details below" : "Add a new event to your calendar"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Event title"
              {...register("title")}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Event description" {...register("description")} rows={3} />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label>Event Type *</Label>
            <Select value={eventType} onValueChange={(value) => setValue("event_type", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student */}
          {students.length > 0 && (
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId || "none"} onValueChange={(value) => setValue("student_id", value || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No student</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="all_day"
              checked={allDay}
              onCheckedChange={(checked) => setValue("all_day", checked as boolean)}
            />
            <Label htmlFor="all_day" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              All day event
            </Label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date")}
                className={errors.start_date ? "border-destructive" : ""}
              />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>

            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input id="start_time" type="time" {...register("start_time")} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" {...register("end_date")} />
            </div>

            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input id="end_time" type="time" {...register("end_time")} />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="Event location" {...register("location")} />
          </div>

          {/* Form Actions */}
          <div className="flex justify-between pt-4">
            <div>
              {event && onDelete && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {event ? "Update" : "Create"} Event
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
