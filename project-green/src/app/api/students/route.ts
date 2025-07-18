import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
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

    const { data: students, error } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching students:", error)
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }

    return NextResponse.json({ students })
  } catch (error) {
    console.error("Students API error:", error)
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
    const { first_name, last_name, date_of_birth, grade_level, school, case_manager } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 })
    }

    const { data: student, error } = await supabase
      .from("students")
      .insert({
        user_id: session.user.id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        date_of_birth: date_of_birth || null,
        grade_level: grade_level || null,
        school: school?.trim() || null,
        case_manager: case_manager?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating student:", error)
      return NextResponse.json({ error: "Failed to create student" }, { status: 500 })
    }

    // Track usage
    await trackUsage(session.user.id, "student_created", 0, {
      student_id: student.id,
      student_name: `${first_name} ${last_name}`,
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error("Create student error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
