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
    const studentId = searchParams.get("student_id")

    const calendarDb = new CalendarDatabase()
    const dates = await calendarDb.getImportantDates(studentId || undefined)

    return NextResponse.json({ dates })
  } catch (error) {
    console.error("Important dates API error:", error)
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
    const { student_id, date_type, due_date, description } = body

    if (!student_id || !date_type || !due_date || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const calendarDb = new CalendarDatabase()
    const date = await calendarDb.createImportantDate({
      student_id,
      date_type,
      due_date,
      description,
      completed: false,
    })

    // Track usage
    await trackUsage(session.user.id, "important_date_created", 0, {
      date_id: date.id,
      date_type,
      student_id,
    })

    return NextResponse.json({ date })
  } catch (error) {
    console.error("Create important date error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
