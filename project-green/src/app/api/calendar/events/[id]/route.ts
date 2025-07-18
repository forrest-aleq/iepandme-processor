import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { CalendarDatabase } from "@/lib/calendar/database"
import { trackUsage } from "@/lib/stripe/usage"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const calendarDb = new CalendarDatabase()

    const event = await calendarDb.updateCalendarEvent(params.id, body)

    // Track usage
    await trackUsage(session.user.id, "calendar_event_updated", 0, {
      event_id: params.id,
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error("Update calendar event error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const calendarDb = new CalendarDatabase()
    await calendarDb.deleteCalendarEvent(params.id)

    // Track usage
    await trackUsage(session.user.id, "calendar_event_deleted", 0, {
      event_id: params.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete calendar event error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
