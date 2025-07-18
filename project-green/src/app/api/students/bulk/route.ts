import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { trackUsage } from "@/lib/stripe/usage"

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
    const { action, studentIds, data } = body

    if (!action || !studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ error: "No students selected" }, { status: 400 })
    }

    let result
    let affectedCount = 0

    switch (action) {
      case "delete":
        // Bulk delete students
        const { error: deleteError, count } = await supabase
          .from("students")
          .delete({ count: "exact" })
          .eq("user_id", session.user.id)
          .in("id", studentIds)

        if (deleteError) {
          throw new Error("Failed to delete students")
        }

        affectedCount = count || 0
        result = { deleted: affectedCount }
        break

      case "updateGrade":
        if (!data?.grade_level) {
          return NextResponse.json({ error: "Grade level is required for update" }, { status: 400 })
        }

        // Bulk update grade level
        const { error: updateError, count: updateCount } = await supabase
          .from("students")
          .update({ grade_level: data.grade_level })
          .eq("user_id", session.user.id)
          .in("id", studentIds)

        if (updateError) {
          throw new Error("Failed to update student grades")
        }

        affectedCount = updateCount || 0
        result = { updated: affectedCount, grade_level: data.grade_level }
        break

      case "updateSchool":
        if (!data?.school) {
          return NextResponse.json({ error: "School is required for update" }, { status: 400 })
        }

        // Bulk update school
        const { error: schoolError, count: schoolCount } = await supabase
          .from("students")
          .update({ school: data.school })
          .eq("user_id", session.user.id)
          .in("id", studentIds)

        if (schoolError) {
          throw new Error("Failed to update student schools")
        }

        affectedCount = schoolCount || 0
        result = { updated: affectedCount, school: data.school }
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Track usage
    await trackUsage(session.user.id, `students_bulk_${action}`, 0, {
      action,
      student_count: affectedCount,
      student_ids: studentIds,
      data,
    })

    return NextResponse.json({
      success: true,
      action,
      affected_count: affectedCount,
      ...result,
    })
  } catch (error) {
    console.error("Bulk operation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk operation failed" },
      { status: 500 },
    )
  }
}
