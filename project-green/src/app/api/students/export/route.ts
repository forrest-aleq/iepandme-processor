import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { exportStudentsToCSV } from "@/lib/export/student-export"
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
    const format = searchParams.get("format") || "csv"

    if (format !== "csv") {
      return NextResponse.json({ error: "Only CSV format is currently supported" }, { status: 400 })
    }

    // Generate CSV export
    const csvContent = await exportStudentsToCSV(session.user.id)

    // Track usage
    await trackUsage(session.user.id, "students_exported", 0, {
      format,
      timestamp: new Date().toISOString(),
    })

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="students-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    )
  }
}
