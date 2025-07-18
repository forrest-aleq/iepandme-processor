import { type NextRequest, NextResponse } from "next/server"
import { stripe, getPlanByPriceId } from "@/lib/stripe/config"
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { priceId } = await req.json()

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
    }

    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate price ID
    const planKey = getPlanByPriceId(priceId)
    if (!planKey) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 })
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(session.user.id, session.user.email!)

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .single()

    if (existingSubscription) {
      return NextResponse.json({ error: "User already has an active subscription" }, { status: 400 })
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        user_id: session.user.id,
        plan_key: planKey,
      },
      subscription_data: {
        metadata: {
          user_id: session.user.id,
          plan_key: planKey,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
    })

    return NextResponse.json({ sessionId: checkoutSession.id })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
