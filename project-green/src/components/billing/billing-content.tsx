"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, CreditCard, ExternalLink, Loader2 } from "lucide-react"
import { STRIPE_PLANS, formatPrice } from "@/lib/stripe/config"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/database"

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BillingContentProps {
  subscription: Subscription | null
}

export function BillingContent({ subscription }: BillingContentProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const isProUser = subscription?.status === "active" || subscription?.status === "trialing"
  const isTrialing = subscription?.status === "trialing"
  const isCanceled = subscription?.cancel_at_period_end === true

  const handleUpgrade = async (priceId: string, planName: string) => {
    setLoading(priceId)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      const stripe = await stripePromise
      if (!stripe) {
        throw new Error("Stripe failed to load")
      }

      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setLoading("portal")

    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to access customer portal")
      }

      window.location.href = data.url
    } catch (error) {
      console.error("Customer portal error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to access billing portal",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Current Plan
            {isProUser && <Badge variant={isTrialing ? "secondary" : "default"}>{isTrialing ? "Trial" : "Pro"}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {isProUser ? (isTrialing ? "Pro Trial" : "Pro Plan") : "Free Plan"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isProUser ? "Unlimited uploads and advanced features" : "3 document uploads per month"}
              </p>
              {isCanceled && (
                <p className="text-sm text-orange-600 mt-1">
                  Your subscription will end on{" "}
                  {subscription?.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : "the current period end"}
                </p>
              )}
            </div>
            {isProUser && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={loading === "portal"}
                className="flex items-center gap-2 bg-transparent"
              >
                {loading === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Manage Billing
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>

          {subscription?.current_period_end && (
            <div className="text-sm text-muted-foreground">
              {isCanceled ? "Ends" : "Renews"} on {new Date(subscription.current_period_end).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      {!isProUser && (
        <>
          <Separator />
          <div>
            <h2 className="text-2xl font-bold mb-2">Upgrade to Pro</h2>
            <p className="text-muted-foreground mb-6">Unlock unlimited uploads and advanced features</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pro Monthly */}
              <Card className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">{STRIPE_PLANS.PRO_MONTHLY.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {formatPrice(STRIPE_PLANS.PRO_MONTHLY.price)}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {STRIPE_PLANS.PRO_MONTHLY.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(STRIPE_PLANS.PRO_MONTHLY.priceId, STRIPE_PLANS.PRO_MONTHLY.name)}
                    disabled={loading === STRIPE_PLANS.PRO_MONTHLY.priceId}
                  >
                    {loading === STRIPE_PLANS.PRO_MONTHLY.priceId ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Upgrade to Pro Monthly
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Annual */}
              <Card className="relative border-primary">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {STRIPE_PLANS.PRO_ANNUAL.name}
                    <Badge variant="secondary">Save $40</Badge>
                  </CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {formatPrice(STRIPE_PLANS.PRO_ANNUAL.price)}
                    </span>
                    <span className="text-muted-foreground">/year</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {STRIPE_PLANS.PRO_ANNUAL.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(STRIPE_PLANS.PRO_ANNUAL.priceId, STRIPE_PLANS.PRO_ANNUAL.name)}
                    disabled={loading === STRIPE_PLANS.PRO_ANNUAL.priceId}
                  >
                    {loading === STRIPE_PLANS.PRO_ANNUAL.priceId ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Upgrade to Pro Annual
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
