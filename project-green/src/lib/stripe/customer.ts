import { stripe } from "./config"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const supabase = createRouteHandlerSupabaseClient()

  // Check if customer already exists in our database
  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single()

  if (existingSubscription?.stripe_customer_id) {
    return existingSubscription.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  })

  // Save customer ID to database
  await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    status: "incomplete",
  })

  return customer.id
}

export async function getCustomerSubscriptions(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    expand: ["data.default_payment_method"],
  })

  return subscriptions.data
}

export async function cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  } else {
    return await stripe.subscriptions.cancel(subscriptionId)
  }
}

export async function reactivateSubscription(subscriptionId: string) {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}
