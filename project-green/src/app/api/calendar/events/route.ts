import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { CalendarDatabase } from "@/lib/calendar/database"
import { trackUsage } from "@/lib/stripe/usage"

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    const calendarDb = new CalendarDatabase()
    const events = await calendarDb.getCalendarEvents(session.user.id, startDate || undefined, endDate || undefined)

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Calendar events API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, start_date, end_date, all_day, event_type, student_id, location, attendees } = body

    if (!title || !start_date || !event_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const calendarDb = new CalendarDatabase()
    const event = await calendarDb.createCalendarEvent({
      user_id: session.user.id,
      title,
      description,
      start_date,
      end_date,
      all_day: all_day || false,
      event_type,
      student_id: student_id || null,
      location,
      attendees: attendees || [],
      reminder_settings: {
        email_reminders: true,
        reminder_times: [60, 1440], // 1 hour and 1 day before
        notification_preferences: {
          email: true,
          browser: true,
        },
      },
    })

    // Track usage
    await trackUsage(session.user.id, "calendar_event_created", 0, {
      event_id: event.id,
      event_type,
      student_id,
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error("Create calendar event error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
