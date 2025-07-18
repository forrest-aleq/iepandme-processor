import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { exportStudentDetailToPDF } from "@/lib/export/student-export"
import { trackUsage } from "@/lib/stripe/usage"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate PDF export for specific student
    const pdfBuffer = await exportStudentDetailToPDF(params.id, session.user.id)

    // Track usage
    await trackUsage(session.user.id, "student_exported", 0, {
      student_id: params.id,
      format: "pdf",
      timestamp: new Date().toISOString(),
    })

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="student-report-${params.id}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Student export error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 })
  }
}
