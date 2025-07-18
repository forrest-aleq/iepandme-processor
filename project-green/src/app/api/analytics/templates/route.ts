import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { AnalyticsDatabase } from "@/lib/analytics/database"
import { getSubscription } from "@/lib/supabase/database"

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const analyticsDb = new AnalyticsDatabase()
    const templates = await analyticsDb.getReportTemplates(session.user.id)

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Report templates fetch API error:", error)
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

    // Check if user is Pro
    const subscription = await getSubscription(session.user.id)
    const isProUser = subscription?.status === "active" || subscription?.status === "trialing"

    if (!isProUser) {
      return NextResponse.json({ error: "Pro subscription required" }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, report_type, configuration, is_public = false } = body

    if (!name || !report_type || !configuration) {
      return NextResponse.json({ error: "name, report_type, and configuration are required" }, { status: 400 })
    }

    const analyticsDb = new AnalyticsDatabase()
    const template = await analyticsDb.createReportTemplate({
      user_id: session.user.id,
      name,
      description,
      report_type,
      configuration,
      is_public,
    })

    // Track analytics event
    await analyticsDb.trackEvent({
      user_id: session.user.id,
      event_type: "template_created",
      event_category: "analytics",
      event_data: {
        template_id: template.id,
        report_type,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Report template creation API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
