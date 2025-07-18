"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, X } from "lucide-react"
import { STRIPE_PLANS, formatPrice } from "@/lib/stripe/config"
import { useToast } from "@/components/ui/use-toast"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
}

export function UpgradeModal({ open, onOpenChange, title, description }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title || "Upgrade to Pro"}</DialogTitle>
              <DialogDescription>{description || "Unlock unlimited uploads and advanced features"}</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Pro Monthly */}
          <Card>
            <CardHeader>
              <CardTitle>{STRIPE_PLANS.PRO_MONTHLY.name}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">
                  {formatPrice(STRIPE_PLANS.PRO_MONTHLY.price)}
                </span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {STRIPE_PLANS.PRO_MONTHLY.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {feature}
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
                Choose Monthly
              </Button>
            </CardContent>
          </Card>

          {/* Pro Annual */}
          <Card className="border-primary relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">Best Value</Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {STRIPE_PLANS.PRO_ANNUAL.name}
                <Badge variant="secondary">Save $40</Badge>
              </CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">{formatPrice(STRIPE_PLANS.PRO_ANNUAL.price)}</span>
                <span className="text-muted-foreground">/year</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {STRIPE_PLANS.PRO_ANNUAL.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() => handleUpgrade(STRIPE_PLANS.PRO_ANNUAL.priceId, STRIPE_PLANS.PRO_ANNUAL.name)}
                disabled={loading === STRIPE_PLANS.PRO_ANNUAL.priceId}
              >
                {loading === STRIPE_PLANS.PRO_ANNUAL.priceId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Choose Annual
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
