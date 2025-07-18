import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
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

    const { data: student, error } = await supabase
      .from("students")
      .select(`
        *,
        documents (
          id,
          file_name,
          file_size,
          file_type,
          document_type,
          processing_status,
          extraction_data,
          confidence_score,
          created_at,
          updated_at
        )
      `)
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      console.error("Error fetching student:", error)
      return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error("Student API error:", error)
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

    const body = await req.json()
    const { first_name, last_name, date_of_birth, grade_level, school, case_manager } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 })
    }

    const { data: student, error } = await supabase
      .from("students")
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        date_of_birth: date_of_birth || null,
        grade_level: grade_level || null,
        school: school?.trim() || null,
        case_manager: case_manager?.trim() || null,
      })
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      console.error("Error updating student:", error)
      return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
    }

    // Track usage
    await trackUsage(session.user.id, "student_updated", 0, {
      student_id: student.id,
      student_name: `${first_name} ${last_name}`,
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error("Update student error:", error)
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

    // First, get the student to track deletion
    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("first_name, last_name")
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      console.error("Error fetching student for deletion:", fetchError)
      return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
    }

    // Delete the student (documents will be unlinked due to ON DELETE SET NULL)
    const { error: deleteError } = await supabase
      .from("students")
      .delete()
      .eq("id", params.id)
      .eq("user_id", session.user.id)

    if (deleteError) {
      console.error("Error deleting student:", deleteError)
      return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
    }

    // Track usage
    await trackUsage(session.user.id, "student_deleted", 0, {
      student_id: params.id,
      student_name: `${student.first_name} ${student.last_name}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete student error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
