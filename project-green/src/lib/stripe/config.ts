import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
})

export const STRIPE_CONFIG = {
  PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  PRO_ANNUAL_PRICE_ID: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
}

export const STRIPE_PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    uploads: 3,
    features: ["3 document uploads per month", "Basic support", "Student management"],
  },
  PRO_MONTHLY: {
    name: "Pro Monthly",
    price: 2000, // $20.00 in cents
    priceId: STRIPE_CONFIG.PRO_MONTHLY_PRICE_ID,
    uploads: -1, // Unlimited
    features: [
      "Unlimited document uploads",
      "AI-powered extraction",
      "Calendar integration",
      "Priority support",
      "Advanced analytics",
    ],
  },
  PRO_ANNUAL: {
    name: "Pro Annual",
    price: 20000, // $200.00 in cents
    priceId: STRIPE_CONFIG.PRO_ANNUAL_PRICE_ID,
    uploads: -1, // Unlimited
    features: [
      "Unlimited document uploads",
      "AI-powered extraction",
      "Calendar integration",
      "Priority support",
      "Advanced analytics",
      "Save $40 per year",
    ],
  },
} as const

export type StripePlanKey = keyof typeof STRIPE_PLANS

export function getPlanByPriceId(priceId: string): StripePlanKey | null {
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if ("priceId" in plan && plan.priceId === priceId) {
      return key as StripePlanKey
    }
  }
  return null
}

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100)
}
