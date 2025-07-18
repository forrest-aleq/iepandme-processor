import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { AnalyticsDatabase } from "@/lib/analytics/database"

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
    const { event_type, event_category, event_data, session_id } = body

    if (!event_type || !event_category) {
      return NextResponse.json({ error: "event_type and event_category are required" }, { status: 400 })
    }

    const analyticsDb = new AnalyticsDatabase()

    // Get client info from headers
    const userAgent = req.headers.get("user-agent") || undefined
    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ipAddress = forwardedFor?.split(",")[0] || realIp || undefined

    await analyticsDb.trackEvent({
      user_id: session.user.id,
      event_type,
      event_category,
      event_data: event_data || {},
      session_id,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Analytics event API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

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
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const eventType = searchParams.get("event_type")

    const analyticsDb = new AnalyticsDatabase()
    const events = await analyticsDb.getAnalyticsEvents(
      session.user.id,
      startDate || undefined,
      endDate || undefined,
      eventType || undefined,
    )

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Analytics events fetch API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
