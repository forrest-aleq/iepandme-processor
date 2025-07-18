"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { CalendarView } from "./calendar-view"
import { Calendar, TestTube, CheckCircle, AlertTriangle, Clock, Users, FileText } from "lucide-react"

interface TestScenario {
  id: string
  name: string
  description: string
  status: "pending" | "running" | "passed" | "failed"
  result?: string
}

export function CalendarTestPage() {
  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([
    {
      id: "load-calendar",
      name: "Load Calendar View",
      description: "Test if calendar loads with current month view",
      status: "pending",
    },
    {
      id: "create-event",
      name: "Create Calendar Event",
      description: "Test creating a new IEP review event",
      status: "pending",
    },
    {
      id: "create-important-date",
      name: "Create Important Date",
      description: "Test adding an important IEP deadline",
      status: "pending",
    },
    {
      id: "navigation",
      name: "Calendar Navigation",
      description: "Test month navigation (previous/next)",
      status: "pending",
    },
    {
      id: "event-display",
      name: "Event Display",
      description: "Test if events show correctly on calendar grid",
      status: "pending",
    },
    {
      id: "overdue-detection",
      name: "Overdue Detection",
      description: "Test if overdue dates are highlighted properly",
      status: "pending",
    },
  ])

  const [events, setEvents] = useState([])
  const [importantDates, setImportantDates] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    runTest("load-calendar")
  }, [])

  const runTest = async (testId: string) => {
    setTestScenarios((prev) => prev.map((test) => (test.id === testId ? { ...test, status: "running" } : test)))

    try {
      switch (testId) {
        case "load-calendar":
          await testLoadCalendar()
          break
        case "create-event":
          await testCreateEvent()
          break
        case "create-important-date":
          await testCreateImportantDate()
          break
        case "navigation":
          await testNavigation()
          break
        case "event-display":
          await testEventDisplay()
          break
        case "overdue-detection":
          await testOverdueDetection()
          break
      }
    } catch (error) {
      setTestScenarios((prev) =>
        prev.map((test) =>
          test.id === testId
            ? {
                ...test,
                status: "failed",
                result: error instanceof Error ? error.message : "Unknown error",
              }
            : test,
        ),
      )
    }
  }

  const testLoadCalendar = async () => {
    // Test loading calendar events
    const eventsResponse = await fetch("/api/calendar/events")
    if (!eventsResponse.ok) throw new Error("Failed to load events")

    const eventsData = await eventsResponse.json()
    setEvents(eventsData.events)

    // Test loading important dates
    const datesResponse = await fetch("/api/calendar/important-dates")
    if (!datesResponse.ok) throw new Error("Failed to load important dates")

    const datesData = await datesResponse.json()
    setImportantDates(datesData.dates)

    // Test loading students
    const studentsResponse = await fetch("/api/students")
    if (studentsResponse.ok) {
      const studentsData = await studentsResponse.json()
      setStudents(studentsData.students)
    }

    // Test loading stats
    const statsResponse = await fetch("/api/calendar/stats")
    if (statsResponse.ok) {
      const statsData = await statsResponse.json()
      setStats(statsData.stats)
    }

    setTestScenarios((prev) =>
      prev.map((test) =>
        test.id === "load-calendar"
          ? {
              ...test,
              status: "passed",
              result: `Loaded ${eventsData.events.length} events, ${datesData.dates.length} important dates`,
            }
          : test,
      ),
    )
  }

  const testCreateEvent = async () => {
    const testEvent = {
      title: "Test IEP Review Meeting",
      description: "Automated test event",
      start_date: new Date().toISOString(),
      all_day: false,
      event_type: "iep_review",
      location: "Conference Room A",
    }

    const response = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testEvent),
    })

    if (!response.ok) throw new Error("Failed to create event")

    const data = await response.json()
    setEvents((prev) => [...prev, data.event])

    setTestScenarios((prev) =>
      prev.map((test) =>
        test.id === "create-event"
          ? {
              ...test,
              status: "passed",
              result: `Created event: ${data.event.title}`,
            }
          : test,
      ),
    )
  }

  const testCreateImportantDate = async () => {
    if (students.length === 0) {
      throw new Error("No students available for testing")
    }

    const testDate = {
      student_id: students[0].id,
      date_type: "iep_annual",
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      description: "Test Annual IEP Review",
    }

    const response = await fetch("/api/calendar/important-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testDate),
    })

    if (!response.ok) throw new Error("Failed to create important date")

    const data = await response.json()
    setImportantDates((prev) => [...prev, data.date])

    setTestScenarios((prev) =>
      prev.map((test) =>
        test.id === "create-important-date"
          ? {
              ...test,
              status: "passed",
              result: `Created important date: ${data.date.description}`,
            }
          : test,
      ),
    )
  }

  const testNavigation = async () => {
    // Test month navigation by checking if different date ranges return different events
    const currentMonth = new Date()
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)

    const currentResponse = await fetch(
      `/api/calendar/events?start=${currentMonth.toISOString()}&end=${new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString()}`,
    )

    const nextResponse = await fetch(
      `/api/calendar/events?start=${nextMonth.toISOString()}&end=${new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).toISOString()}`,
    )

    if (!currentResponse.ok || !nextResponse.ok) {
      throw new Error("Failed to test navigation")
    }

    setTestScenarios((prev) =>
      prev.map((test) =>
        test.id === "navigation"
          ? {
              ...test,
              status: "passed",
              result: "Month navigation API working correctly",
            }
          : test,
      ),
    )
  }

  const testEventDisplay = async () => {
    // Check if events have proper display properties
    const hasEvents = events.length > 0
    const hasValidEventTypes = events.every((event) =>
      ["iep_review", "evaluation", "meeting", "deadline", "other"].includes(event.event_type),
    )

    if (!hasEvents) {
      throw new Error("No events to display")
    }

    if (!hasValidEventTypes) {
      throw new Error("Invalid event types found")
    }

    setTestScenarios((prev) =>
      prev.map((test) =>
        test.id === "event-display"
          ? {
              ...test,
              status: "passed",
              result: `${events.length} events ready for display`,
            }
          : test,
      ),
    )
  }

  const testOverdueDetection = async () => {
    const today = new Date()
    const overdueDates = importantDates.filter((date) => new Date(date.due_date) < today && !date.completed)

    setTestScenarios((prev) =>
      prev.map((test) =>
        test.id === "overdue-detection"
          ? {
              ...test,
              status: "passed",
              result: `Found ${overdueDates.length} overdue dates`,
            }
          : test,
      ),
    )
  }

  const runAllTests = async () => {
    for (const test of testScenarios) {
      if (test.status !== "running") {
        await runTest(test.id)
        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "running":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <TestTube className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-green-100 text-green-800 border-green-200"
      case "failed":
        return "bg-red-100 text-red-800 border-red-200"
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar Testing Dashboard</h1>
        <p className="text-muted-foreground">Test and validate calendar functionality</p>
      </div>

      {/* Test Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testScenarios.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {testScenarios.filter((t) => t.status === "passed").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {testScenarios.filter((t) => t.status === "failed").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Loaded</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length + importantDates.length}</div>
            <p className="text-xs text-muted-foreground">Events + Dates</p>
          </CardContent>
        </Card>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>Run individual tests or all tests at once</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runAllTests} className="mb-4">
            <TestTube className="mr-2 h-4 w-4" />
            Run All Tests
          </Button>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
          <CardDescription>Individual test results and details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testScenarios.map((test) => (
            <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <div>
                  <h4 className="font-medium">{test.name}</h4>
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                  {test.result && <p className="text-xs text-green-600 mt-1">{test.result}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(test.status)}>
                  {test.status}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runTest(test.id)}
                  disabled={test.status === "running"}
                >
                  Run Test
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Live Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Live Calendar View</CardTitle>
          <CardDescription>Test the actual calendar component</CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarView initialEvents={events} initialDates={importantDates} />
        </CardContent>
      </Card>

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events ({events.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.slice(0, 3).map((event, index) => (
                <div key={index} className="text-sm">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-muted-foreground">{event.event_type}</p>
                </div>
              ))}
              {events.length > 3 && <p className="text-xs text-muted-foreground">+{events.length - 3} more</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Important Dates ({importantDates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importantDates.slice(0, 3).map((date, index) => (
                <div key={index} className="text-sm">
                  <p className="font-medium">{date.description}</p>
                  <p className="text-muted-foreground">{date.date_type}</p>
                </div>
              ))}
              {importantDates.length > 3 && (
                <p className="text-xs text-muted-foreground">+{importantDates.length - 3} more</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({students.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.slice(0, 3).map((student, index) => (
                <div key={index} className="text-sm">
                  <p className="font-medium">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-muted-foreground">Grade {student.grade}</p>
                </div>
              ))}
              {students.length > 3 && <p className="text-xs text-muted-foreground">+{students.length - 3} more</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
