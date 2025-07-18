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

    const date = await calendarDb.updateImportantDate(params.id, body)

    // Track usage
    await trackUsage(session.user.id, "important_date_updated", 0, {
      date_id: params.id,
    })

    return NextResponse.json({ date })
  } catch (error) {
    console.error("Update important date error:", error)
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
    await calendarDb.updateImportantDate(params.id, { completed: true })

    // Track usage
    await trackUsage(session.user.id, "important_date_completed", 0, {
      date_id: params.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Complete important date error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
