import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { CalendarDatabase } from "@/lib/calendar/database"

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const calendarDb = new CalendarDatabase()
    const stats = await calendarDb.getCalendarStats(session.user.id)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Calendar stats API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
