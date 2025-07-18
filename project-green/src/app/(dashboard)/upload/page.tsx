import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UploadZone } from "@/components/dashboard/upload-zone"
import { getCurrentMonthUploadCount, isUserPro, getStudents } from "@/lib/supabase/database"

export default async function UploadPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const [currentMonthUploads, userIsProUser, students] = await Promise.all([
    getCurrentMonthUploadCount(session.user.id),
    isUserPro(session.user.id),
    getStudents(session.user.id),
  ])

  const uploadLimit = userIsProUser ? -1 : 3
  const uploadsRemaining = userIsProUser ? -1 : Math.max(0, uploadLimit - currentMonthUploads)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Document</h1>
        <p className="text-muted-foreground">
          Upload IEP or 504 plan documents for AI-powered extraction and calendar integration
        </p>
      </div>

      <div className="max-w-2xl">
        <UploadZone uploadsRemaining={uploadsRemaining} isProUser={userIsProUser} students={students} />
      </div>
    </div>
  )
}
