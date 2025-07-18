import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { StudentForm } from "@/components/students/student-form"

interface EditStudentPageProps {
  params: {
    id: string
  }
}

export default async function EditStudentPage({ params }: EditStudentPageProps) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch student data
  const { data: student, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .single()

  if (error || !student) {
    notFound()
  }

  return <StudentForm student={student} mode="edit" />
}
