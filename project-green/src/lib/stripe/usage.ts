import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"

export async function trackUsage(userId: string, actionType: string, cost = 0, metadata?: Record<string, any>) {
  const supabase = createRouteHandlerSupabaseClient()

  try {
    const { error } = await supabase.from("usage_tracking").insert({
      user_id: userId,
      action_type: actionType,
      cost,
      metadata,
    })

    if (error) {
      console.error("Error tracking usage:", error)
    }
  } catch (error) {
    console.error("Unexpected error tracking usage:", error)
  }
}

export async function getMonthlyUsageCost(userId: string): Promise<number> {
  const supabase = createRouteHandlerSupabaseClient()

  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from("usage_tracking")
      .select("cost")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString())

    if (error) {
      console.error("Error fetching monthly usage cost:", error)
      return 0
    }

    return data?.reduce((total, record) => total + (record.cost || 0), 0) || 0
  } catch (error) {
    console.error("Unexpected error fetching monthly usage cost:", error)
    return 0
  }
}
