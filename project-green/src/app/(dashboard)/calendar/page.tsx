import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CalendarView } from "@/components/calendar/calendar-view"
import { CalendarDatabase } from "@/lib/calendar/database"
import { getSubscription } from "@/lib/supabase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react"

export default async function CalendarPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const subscription = await getSubscription(session.user.id)
  const isProUser = subscription?.status === "active" || subscription?.status === "trialing"

  if (!isProUser) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar Integration</h1>
          <p className="text-muted-foreground">Sync IEP dates and deadlines with your calendar</p>
        </div>

        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pro Feature</h2>
            <p className="text-gray-600 mb-6">
              Calendar integration is available for Pro subscribers. Upgrade to access advanced scheduling features,
              deadline tracking, and calendar sync capabilities.
            </p>
            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>IEP deadline tracking</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Meeting scheduling</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Automated reminders</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Calendar views and management</span>
              </div>
            </div>
            <a
              href="/billing"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
            >
              Upgrade to Pro
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Fetch calendar data for Pro users
  const calendarDb = new CalendarDatabase()
  const [events, importantDates, stats] = await Promise.all([
    calendarDb.getCalendarEvents(session.user.id),
    calendarDb.getImportantDates(),
    calendarDb.getCalendarStats(session.user.id),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">Manage IEP dates, deadlines, and important events</p>
      </div>

      {/* Calendar Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming_events}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.this_month_events}</div>
            <p className="text-xs text-muted-foreground">Events scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue_dates}</div>
            <p className="text-xs text-muted-foreground">Important dates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_reviews}</div>
            <p className="text-xs text-muted-foreground">Due soon</p>
          </CardContent>
        </Card>
      </div>

      <CalendarView initialEvents={events} initialDates={importantDates} />
    </div>
  )
}
