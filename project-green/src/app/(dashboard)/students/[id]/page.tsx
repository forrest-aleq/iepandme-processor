import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { StudentDetailEnhanced } from "@/components/students/student-detail-enhanced"

interface StudentPageProps {
  params: {
    id: string
  }
}

export default async function StudentPage({ params }: StudentPageProps) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch student with documents
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

  if (error || !student) {
    notFound()
  }

  return <StudentDetailEnhanced student={student} />
}
