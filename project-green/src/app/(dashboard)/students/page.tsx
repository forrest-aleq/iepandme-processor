import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StudentsPageEnhanced } from "@/components/students/students-page-enhanced"
import { getStudents } from "@/lib/supabase/database"

export default async function StudentsPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const students = await getStudents(session.user.id)

  return <StudentsPageEnhanced students={students} />
}
