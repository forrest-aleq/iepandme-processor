import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/config"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import type Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  const supabase = createRouteHandlerSupabaseClient()

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, supabase)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionCancellation(event.data.object as Stripe.Subscription, supabase)
        break

      case "invoice.payment_succeeded":
        await handlePaymentSuccess(event.data.object as Stripe.Invoice, supabase)
        break

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase)
        break

      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription, supabase: any) {
  const userId = subscription.metadata.user_id

  if (!userId) {
    console.error("No user_id in subscription metadata")
    return
  }

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    price_id: subscription.items.data[0]?.price.id,
    quantity: subscription.items.data[0]?.quantity || 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  }

  const { error } = await supabase.from("subscriptions").upsert(subscriptionData, {
    onConflict: "stripe_subscription_id",
  })

  if (error) {
    console.error("Error updating subscription:", error)
    throw error
  }

  // Track usage
  await supabase.from("usage_tracking").insert({
    user_id: userId,
    action_type: "subscription_updated",
    metadata: {
      subscription_id: subscription.id,
      status: subscription.status,
      plan_id: subscription.items.data[0]?.price.id,
    },
  })
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription, supabase: any) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
    })
    .eq("stripe_subscription_id", subscription.id)

  if (error) {
    console.error("Error canceling subscription:", error)
    throw error
  }

  // Track usage
  const userId = subscription.metadata.user_id
  if (userId) {
    await supabase.from("usage_tracking").insert({
      user_id: userId,
      action_type: "subscription_canceled",
      metadata: {
        subscription_id: subscription.id,
        canceled_at: new Date().toISOString(),
      },
    })
  }
}

async function handlePaymentSuccess(invoice: Stripe.Invoice, supabase: any) {
  if (invoice.subscription) {
    // Update subscription status to active
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("stripe_subscription_id", invoice.subscription)

    if (error) {
      console.error("Error updating subscription after payment:", error)
      throw error
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  if (invoice.subscription) {
    // Update subscription status
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("stripe_subscription_id", invoice.subscription)

    if (error) {
      console.error("Error updating subscription after failed payment:", error)
      throw error
    }
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any) {
  const userId = session.metadata?.user_id

  if (!userId) {
    console.error("No user_id in checkout session metadata")
    return
  }

  // Track successful checkout
  await supabase.from("usage_tracking").insert({
    user_id: userId,
    action_type: "checkout_completed",
    metadata: {
      session_id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
    },
  })
}
