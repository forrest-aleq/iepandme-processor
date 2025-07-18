import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BillingContent } from "@/components/billing/billing-content"
import { getSubscription } from "@/lib/supabase/database"

export default async function BillingPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const subscription = await getSubscription(session.user.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      <BillingContent subscription={subscription} />
    </div>
  )
}
