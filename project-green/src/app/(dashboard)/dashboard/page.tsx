import { createServerSupabaseClient } from "@/lib/supabase/server"
import { UploadZone } from "@/components/dashboard/upload-zone"
import { UsageCard } from "@/components/dashboard/usage-card"
import { RecentDocuments } from "@/components/dashboard/recent-documents"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { QuickActions } from "@/components/dashboard/quick-actions"
import {
  getSubscription,
  getStudents,
  getRecentDocuments,
  getCurrentMonthUploadCount,
  isUserPro,
} from "@/lib/supabase/database"

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  // Fetch all dashboard data in parallel
  const [subscription, students, documents, currentMonthUploads, userIsProUser] = await Promise.all([
    getSubscription(session.user.id),
    getStudents(session.user.id),
    getRecentDocuments(session.user.id, 5),
    getCurrentMonthUploadCount(session.user.id),
    isUserPro(session.user.id),
  ])

  const uploadLimit = userIsProUser ? -1 : 3 // -1 means unlimited
  const uploadsRemaining = userIsProUser ? -1 : Math.max(0, uploadLimit - currentMonthUploads)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your IEP management.</p>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalStudents={students.length}
        totalDocuments={documents.length}
        currentMonthUploads={currentMonthUploads}
        isProUser={userIsProUser}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Zone - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <UploadZone uploadsRemaining={uploadsRemaining} isProUser={userIsProUser} students={students} />
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          <UsageCard currentUploads={currentMonthUploads} uploadLimit={uploadLimit} isProUser={userIsProUser} />
          <QuickActions studentCount={students.length} />
        </div>
      </div>

      {/* Recent Documents */}
      <RecentDocuments documents={documents} />
    </div>
  )
}
