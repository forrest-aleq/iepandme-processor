import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { AnalyticsDatabase } from "@/lib/analytics/database"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templateId = params.id
    const analyticsDb = new AnalyticsDatabase()
    const templates = await analyticsDb.getReportTemplates(session.user.id)
    const template = templates.find((t) => t.id === templateId)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Report template fetch API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templateId = params.id
    const body = await req.json()
    const { name, description, configuration, is_public } = body

    const analyticsDb = new AnalyticsDatabase()
    const template = await analyticsDb.updateReportTemplate(templateId, {
      name,
      description,
      configuration,
      is_public,
    })

    // Track analytics event
    await analyticsDb.trackEvent({
      user_id: session.user.id,
      event_type: "template_updated",
      event_category: "analytics",
      event_data: {
        template_id: templateId,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Report template update API error:", error)
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

    const templateId = params.id
    const analyticsDb = new AnalyticsDatabase()
    await analyticsDb.deleteReportTemplate(templateId)

    // Track analytics event
    await analyticsDb.trackEvent({
      user_id: session.user.id,
      event_type: "template_deleted",
      event_category: "analytics",
      event_data: {
        template_id: templateId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Report template deletion API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
