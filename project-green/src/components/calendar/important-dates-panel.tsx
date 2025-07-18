"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Plus, Calendar } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ImportantDateModal } from "./important-date-modal"
import type { ImportantDate } from "@/lib/calendar/types"

interface ImportantDatesPanelProps {
  dates: ImportantDate[]
  onDateUpdate: () => void
}

export function ImportantDatesPanel({ dates, onDateUpdate }: ImportantDatesPanelProps) {
  const [showDateModal, setShowDateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<ImportantDate | null>(null)
  const { toast } = useToast()

  const today = new Date()
  const overdueDates = dates.filter((date) => new Date(date.due_date) < today && !date.completed)
  const upcomingDates = dates.filter((date) => {
    const dueDate = new Date(date.due_date)
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return dueDate >= today && dueDate <= thirtyDaysFromNow && !date.completed
  })

  const handleCompleteDate = async (dateId: string) => {
    try {
      const response = await fetch(`/api/calendar/important-dates/${dateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      })

      if (!response.ok) throw new Error("Failed to complete date")

      toast({
        title: "Date completed",
        description: "Important date has been marked as completed",
      })

      onDateUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete important date",
        variant: "destructive",
      })
    }
  }

  const getDateTypeLabel = (type: string) => {
    const labels = {
      iep_annual: "IEP Annual Review",
      evaluation_due: "Evaluation Due",
      transition_planning: "Transition Planning",
      eligibility_review: "Eligibility Review",
    }
    return labels[type as keyof typeof labels] || type
  }

  const getDateTypeColor = (type: string) => {
    const colors = {
      iep_annual: "bg-blue-100 text-blue-800",
      evaluation_due: "bg-purple-100 text-purple-800",
      transition_planning: "bg-green-100 text-green-800",
      eligibility_review: "bg-orange-100 text-orange-800",
    }
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-4">
      {/* Overdue Dates */}
      {overdueDates.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue ({overdueDates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueDates.slice(0, 3).map((date) => (
              <div key={date.id} className="p-3 bg-white rounded-lg border border-red-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{date.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getDateTypeColor(date.date_type)}>
                        {getDateTypeLabel(date.date_type)}
                      </Badge>
                      <span className="text-xs text-red-600">Due: {new Date(date.due_date).toLocaleDateString()}</span>
                    </div>
                    {date.student && (
                      <p className="text-xs text-gray-600 mt-1">
                        {date.student.first_name} {date.student.last_name}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleCompleteDate(date.id)} className="shrink-0">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {overdueDates.length > 3 && (
              <p className="text-sm text-red-600 text-center">+{overdueDates.length - 3} more overdue</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Dates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming ({upcomingDates.length})
            </CardTitle>
            <Button size="sm" onClick={() => setShowDateModal(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Important dates in the next 30 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingDates.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming important dates</p>
            </div>
          ) : (
            upcomingDates.slice(0, 5).map((date) => (
              <div key={date.id} className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{date.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getDateTypeColor(date.date_type)}>
                        {getDateTypeLabel(date.date_type)}
                      </Badge>
                      <span className="text-xs text-gray-600">Due: {new Date(date.due_date).toLocaleDateString()}</span>
                    </div>
                    {date.student && (
                      <p className="text-xs text-gray-600 mt-1">
                        {date.student.first_name} {date.student.last_name}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleCompleteDate(date.id)} className="shrink-0">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          {upcomingDates.length > 5 && (
            <p className="text-sm text-gray-600 text-center">+{upcomingDates.length - 5} more upcoming</p>
          )}
        </CardContent>
      </Card>

      {/* All Dates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Important Dates</CardTitle>
          <CardDescription>Complete history of important dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-60 overflow-y-auto">
          {dates.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No important dates found</p>
              <Button size="sm" className="mt-2" onClick={() => setShowDateModal(true)}>
                Add First Date
              </Button>
            </div>
          ) : (
            dates.map((date) => (
              <div
                key={date.id}
                className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                  date.completed ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                }`}
                onClick={() => {
                  setSelectedDate(date)
                  setShowDateModal(true)
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${date.completed ? "text-green-800 line-through" : "text-gray-900"}`}
                    >
                      {date.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getDateTypeColor(date.date_type)}>
                        {getDateTypeLabel(date.date_type)}
                      </Badge>
                      <span className={`text-xs ${date.completed ? "text-green-600" : "text-gray-600"}`}>
                        {new Date(date.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    {date.student && (
                      <p className="text-xs text-gray-600 mt-1">
                        {date.student.first_name} {date.student.last_name}
                      </p>
                    )}
                  </div>
                  {date.completed && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Important Date Modal */}
      <ImportantDateModal
        open={showDateModal}
        onOpenChange={setShowDateModal}
        date={selectedDate}
        onSave={() => {
          setShowDateModal(false)
          setSelectedDate(null)
          onDateUpdate()
        }}
        onClose={() => {
          setShowDateModal(false)
          setSelectedDate(null)
        }}
      />
    </div>
  )
}
