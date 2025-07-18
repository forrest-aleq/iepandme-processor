import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/config"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's Stripe customer ID
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", session.user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No customer found" }, { status: 404 })
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("Customer portal error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
