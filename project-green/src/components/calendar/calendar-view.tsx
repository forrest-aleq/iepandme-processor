"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Calendar, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { EventModal } from "./event-modal"
import { ImportantDatesPanel } from "./important-dates-panel"
import type { CalendarEvent, ImportantDate } from "@/lib/calendar/types"

interface CalendarViewProps {
  initialEvents?: CalendarEvent[]
  initialDates?: ImportantDate[]
}

export function CalendarView({ initialEvents = [], initialDates = [] }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [importantDates, setImportantDates] = useState<ImportantDate[]>(initialDates)
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Get calendar for current month
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday

  const calendarDays = []
  const current = new Date(startDate)

  for (let i = 0; i < 42; i++) {
    // 6 weeks * 7 days
    calendarDays.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const startOfMonth = new Date(year, month, 1).toISOString()
      const endOfMonth = new Date(year, month + 1, 0).toISOString()

      const response = await fetch(`/api/calendar/events?start=${startOfMonth}&end=${endOfMonth}`)
      if (!response.ok) throw new Error("Failed to fetch events")

      const data = await response.json()
      setEvents(data.events)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load calendar events",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchImportantDates = async () => {
    try {
      const response = await fetch("/api/calendar/important-dates")
      if (!response.ok) throw new Error("Failed to fetch important dates")

      const data = await response.json()
      setImportantDates(data.dates)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load important dates",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchEvents()
    fetchImportantDates()
  }, [currentDate])

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_date)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const getImportantDatesForDate = (date: Date) => {
    return importantDates.filter((importantDate) => {
      const dueDate = new Date(importantDate.due_date)
      return dueDate.toDateString() === date.toDateString()
    })
  }

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month
  }

  const eventTypeColors = {
    iep_review: "bg-blue-100 text-blue-800 border-blue-200",
    evaluation: "bg-purple-100 text-purple-800 border-purple-200",
    meeting: "bg-green-100 text-green-800 border-green-200",
    deadline: "bg-red-100 text-red-800 border-red-200",
    other: "bg-gray-100 text-gray-800 border-gray-200",
  }

  const handleEventCreate = async (eventData: any) => {
    try {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) throw new Error("Failed to create event")

      const { event } = await response.json()
      setEvents((prev) => [...prev, event])
      setShowEventModal(false)

      toast({
        title: "Event created",
        description: "Calendar event has been created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create calendar event",
        variant: "destructive",
      })
    }
  }

  const handleEventUpdate = async (eventData: any) => {
    if (!selectedEvent) return

    try {
      const response = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) throw new Error("Failed to update event")

      const { event } = await response.json()
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
      setShowEventModal(false)
      setSelectedEvent(null)

      toast({
        title: "Event updated",
        description: "Calendar event has been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update calendar event",
        variant: "destructive",
      })
    }
  }

  const handleEventDelete = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete event")

      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      setShowEventModal(false)
      setSelectedEvent(null)

      toast({
        title: "Event deleted",
        description: "Calendar event has been deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete calendar event",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </CardTitle>
                <CardDescription>IEP Calendar & Important Dates</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setShowEventModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {/* Calendar Grid Header */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid Body */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  const dayEvents = getEventsForDate(date)
                  const dayImportantDates = getImportantDatesForDate(date)
                  const hasItems = dayEvents.length > 0 || dayImportantDates.length > 0

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[100px] p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors
                        ${isCurrentMonth(date) ? "bg-white" : "bg-gray-50 text-gray-400"}
                        ${isToday(date) ? "ring-2 ring-primary ring-offset-1" : ""}
                        ${hasItems ? "border-primary/20" : "border-gray-200"}
                      `}
                      onClick={() => {
                        // Could open day view or create event for this date
                        const newEvent = {
                          start_date: date.toISOString().split("T")[0],
                          all_day: true,
                        }
                        setSelectedEvent(null)
                        setShowEventModal(true)
                      }}
                    >
                      <div className="text-sm font-medium mb-1">{date.getDate()}</div>

                      <div className="space-y-1">
                        {/* Events */}
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={`
                              text-xs p-1 rounded border truncate cursor-pointer flex items-center gap-1
                              ${eventTypeColors[event.event_type as keyof typeof eventTypeColors]}
                            `}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEvent(event)
                              setShowEventModal(true)
                            }}
                          >
                            {!event.all_day && <Clock className="h-3 w-3" />}
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}

                        {/* Important Dates */}
                        {dayImportantDates.slice(0, 1).map((importantDate) => (
                          <div
                            key={importantDate.id}
                            className={`
                              text-xs p-1 rounded border truncate flex items-center gap-1
                              ${
                                new Date(importantDate.due_date) < new Date()
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-orange-100 text-orange-800 border-orange-200"
                              }
                            `}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span className="truncate">{importantDate.description}</span>
                          </div>
                        ))}

                        {/* Show more indicator */}
                        {dayEvents.length + dayImportantDates.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length + dayImportantDates.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Important Dates Sidebar */}
        <div className="lg:col-span-1">
          <ImportantDatesPanel dates={importantDates} onDateUpdate={fetchImportantDates} />
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        event={selectedEvent}
        onSave={selectedEvent ? handleEventUpdate : handleEventCreate}
        onDelete={selectedEvent ? () => handleEventDelete(selectedEvent.id) : undefined}
        onClose={() => {
          setShowEventModal(false)
          setSelectedEvent(null)
        }}
      />
    </div>
  )
}
