#!/bin/bash

# IEPandMe Stripe Integration Setup Script - 2025
# Sets up Stripe billing and subscription management

set -e

echo "💳 Setting up Stripe billing integration..."

# Check for required tools
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm is required. Please run the project initialization script first."
        exit 1
    fi
    
    if ! command -v stripe &> /dev/null; then
        echo "⚠️  Stripe CLI not found. Installing..."
        # Instructions for Stripe CLI installation
        echo "Please install Stripe CLI from: https://stripe.com/docs/stripe-cli"
        echo "Or run: brew install stripe/stripe-cli/stripe"
        echo "Then run: stripe login"
        echo "Re-run this script after installation."
        exit 1
    fi
    
    echo "✅ Requirements check passed"
}

# Install Stripe dependencies
install_stripe_packages() {
    echo "📦 Installing Stripe packages..."
    
    pnpm add \
        stripe \
        @stripe/stripe-js \
        @stripe/react-stripe-js \
        micro \
        raw-body
    
    pnpm add -D \
        @types/micro
    
    echo "✅ Stripe packages installed"
}

# Create Stripe configuration
create_stripe_config() {
    echo "⚙️ Creating Stripe configuration..."
    
    mkdir -p src/lib/stripe
    
    cat > src/lib/stripe/config.ts << 'EOF'
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const STRIPE_CONFIG = {
  publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  currency: 'usd',
  
  // Product configurations
  products: {
    monthly: {
      priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
      amount: 2000, // $20.00
      interval: 'month',
    },
    annual: {
      priceId: process.env.STRIPE_ANNUAL_PRICE_ID!,
      amount: 20000, // $200.00 (save 2 months)
      interval: 'year',
    },
    perDocument: {
      priceId: process.env.STRIPE_PER_DOCUMENT_PRICE_ID!,
      amount: 200, // $2.00 per document
      interval: null,
    },
  },
  
  // Features per plan
  features: {
    free: {
      maxUploads: 3,
      support: 'community',
      features: ['Basic IEP processing', 'Email support'],
    },
    monthly: {
      maxUploads: -1, // unlimited
      support: 'priority',
      features: [
        'Unlimited IEP processing',
        'Calendar integration',
        'Task management',
        'Priority support',
        'Advanced analytics',
      ],
    },
    annual: {
      maxUploads: -1, // unlimited
      support: 'priority',
      features: [
        'Unlimited IEP processing',
        'Calendar integration',
        'Task management',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
        'Data export',
      ],
    },
  },
} as const

export type PlanType = keyof typeof STRIPE_CONFIG.features
EOF

    echo "✅ Stripe configuration created"
}

# Create Stripe client utilities
create_stripe_client() {
    echo "🔧 Creating Stripe client utilities..."
    
    cat > src/lib/stripe/client.ts << 'EOF'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { STRIPE_CONFIG } from './config'

let stripePromise: Promise<Stripe | null>

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_CONFIG.publicKey)
  }
  return stripePromise
}

// Utility to format currency
export const formatCurrency = (amount: number, currency = 'usd'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

// Utility to get plan features
export const getPlanFeatures = (planType: string) => {
  return STRIPE_CONFIG.features[planType as keyof typeof STRIPE_CONFIG.features] || STRIPE_CONFIG.features.free
}

// Utility to check if plan has feature
export const planHasFeature = (planType: string, feature: string): boolean => {
  const plan = getPlanFeatures(planType)
  return plan.features.includes(feature)
}
EOF

    cat > src/lib/stripe/server.ts << 'EOF'
import { stripe } from './config'
import { prisma } from '@/lib/db/client'
import { PlanType } from '@prisma/client'

export interface CreateCheckoutSessionParams {
  customerId?: string
  priceId: string
  userId: string
  tenantId: string
  successUrl: string
  cancelUrl: string
  mode?: 'subscription' | 'payment'
}

export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
  tenantId,
  successUrl,
  cancelUrl,
  mode = 'subscription',
}: CreateCheckoutSessionParams) {
  try {
    const sessionParams: any = {
      payment_method_types: ['card'],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tenantId,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    }

    if (customerId) {
      sessionParams.customer = customerId
    } else {
      sessionParams.customer_creation = 'always'
    }

    if (mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          userId,
          tenantId,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return session
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    throw error
  }
}

export async function getSubscriptionStatus(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    throw error
  }
}

export async function cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    })
    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

export async function updateSubscription(subscriptionId: string, newPriceId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice',
    })
    
    return updatedSubscription
  } catch (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}

export async function syncUserWithStripe(userId: string, email: string) {
  try {
    // Check if user already has a Stripe customer
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
    })

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    })

    // Update subscription record
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeCustomerId: customer.id,
      },
      create: {
        userId,
        tenantId: '', // Will be updated by the calling function
        stripeCustomerId: customer.id,
        planType: 'FREE',
        status: 'ACTIVE',
      },
    })

    return customer.id
  } catch (error) {
    console.error('Error syncing user with Stripe:', error)
    throw error
  }
}

// Helper to map Stripe status to our enum
export function mapStripeStatusToPrisma(stripeStatus: string): any {
  const statusMap: Record<string, any> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELLED',
    unpaid: 'UNPAID',
    trialing: 'TRIALING',
    incomplete: 'INACTIVE',
    incomplete_expired: 'INACTIVE',
    paused: 'INACTIVE',
  }
  
  return statusMap[stripeStatus] || 'INACTIVE'
}

// Helper to map price ID to plan type
export function mapPriceIdToPlanType(priceId: string): PlanType {
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return 'MONTHLY'
  if (priceId === process.env.STRIPE_ANNUAL_PRICE_ID) return 'ANNUAL'
  return 'FREE'
}
EOF

    echo "✅ Stripe client utilities created"
}

# Create webhook handler
create_webhook_handler() {
    echo "🔗 Creating Stripe webhook handler..."
    
    mkdir -p src/app/api/webhooks/stripe
    
    cat > src/app/api/webhooks/stripe/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/config'
import { prisma } from '@/lib/db/client'
import { mapStripeStatusToPrisma, mapPriceIdToPlanType } from '@/lib/stripe/server'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('Received webhook event:', event.type)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId
  const tenantId = subscription.metadata.tenantId

  if (!userId || !tenantId) {
    console.error('Missing userId or tenantId in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const planType = mapPriceIdToPlanType(priceId)

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      planType,
      status: mapStripeStatusToPrisma(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
    create: {
      userId,
      tenantId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      planType,
      status: mapStripeStatusToPrisma(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  // Update tenant with new plan limits
  const maxUploads = planType === 'FREE' ? 3 : -1 // -1 for unlimited
  
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planType,
      maxUploads,
    },
  })

  console.log(`Subscription created for user ${userId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subscriptionRecord = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!subscriptionRecord) {
    console.error('Subscription not found:', subscription.id)
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const planType = mapPriceIdToPlanType(priceId)

  await prisma.subscription.update({
    where: { id: subscriptionRecord.id },
    data: {
      stripePriceId: priceId,
      planType,
      status: mapStripeStatusToPrisma(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })

  // Update tenant plan
  const maxUploads = planType === 'FREE' ? 3 : -1
  
  await prisma.tenant.update({
    where: { id: subscriptionRecord.tenantId },
    data: {
      planType,
      maxUploads,
    },
  })

  console.log(`Subscription updated for subscription ${subscription.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionRecord = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!subscriptionRecord) {
    console.error('Subscription not found:', subscription.id)
    return
  }

  await prisma.subscription.update({
    where: { id: subscriptionRecord.id },
    data: {
      status: 'CANCELLED',
      planType: 'FREE',
    },
  })

  // Revert tenant to free plan
  await prisma.tenant.update({
    where: { id: subscriptionRecord.tenantId },
    data: {
      planType: 'FREE',
      maxUploads: 3,
    },
  })

  console.log(`Subscription cancelled for subscription ${subscription.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscriptionRecord = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  })

  if (!subscriptionRecord) return

  await prisma.subscription.update({
    where: { id: subscriptionRecord.id },
    data: {
      lastPaymentAmount: invoice.amount_paid / 100,
      lastPaymentDate: new Date(invoice.status_transitions.paid_at! * 1000),
      nextPaymentDate: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000)
        : null,
    },
  })

  console.log(`Payment succeeded for invoice ${invoice.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscriptionRecord = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  })

  if (!subscriptionRecord) return

  await prisma.subscription.update({
    where: { id: subscriptionRecord.id },
    data: {
      status: 'PAST_DUE',
    },
  })

  console.log(`Payment failed for invoice ${invoice.id}`)
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const tenantId = session.metadata?.tenantId

  if (!userId || !tenantId) return

  // The subscription will be handled by subscription.created event
  console.log(`Checkout completed for user ${userId}`)
}
EOF

    echo "✅ Stripe webhook handler created"
}

# Create billing API routes
create_billing_routes() {
    echo "🔄 Creating billing API routes..."
    
    mkdir -p src/app/api/billing
    
    # Create checkout session
    cat > src/app/api/billing/create-checkout/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe/server'
import { getCurrentTenantId } from '@/lib/db/tenant'
import { prisma } from '@/lib/db/client'
import { auth } from '@supabase/auth-helpers-nextjs'

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, successUrl, cancelUrl } = await request.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    const tenantId = await getCurrentTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    // Get or create customer ID
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
    })

    const session = await createCheckoutSession({
      customerId: subscription?.stripeCustomerId,
      priceId,
      userId: user.id,
      tenantId,
      successUrl: successUrl || `${request.nextUrl.origin}/dashboard?success=true`,
      cancelUrl: cancelUrl || `${request.nextUrl.origin}/pricing?cancelled=true`,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
EOF

    # Create customer portal
    cat > src/app/api/billing/customer-portal/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createCustomerPortalSession } from '@/lib/stripe/server'
import { prisma } from '@/lib/db/client'
import { auth } from '@supabase/auth-helpers-nextjs'

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { returnUrl } = await request.json()

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No customer found' },
        { status: 400 }
      )
    }

    const session = await createCustomerPortalSession(
      subscription.stripeCustomerId,
      returnUrl || `${request.nextUrl.origin}/dashboard/billing`
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}
EOF

    # Get subscription info
    cat > src/app/api/billing/subscription/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { auth } from '@supabase/auth-helpers-nextjs'
import { stripe } from '@/lib/stripe/config'

export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      include: {
        tenant: {
          select: {
            name: true,
            uploadCount: true,
            maxUploads: true,
          },
        },
      },
    })

    if (!subscription) {
      return NextResponse.json({
        planType: 'FREE',
        status: 'ACTIVE',
        usage: { current: 0, limit: 3 },
      })
    }

    // Get latest info from Stripe if subscription exists
    let stripeSubscription = null
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        )
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error)
      }
    }

    return NextResponse.json({
      planType: subscription.planType,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      lastPaymentAmount: subscription.lastPaymentAmount,
      lastPaymentDate: subscription.lastPaymentDate,
      usage: {
        current: subscription.tenant?.uploadCount || 0,
        limit: subscription.tenant?.maxUploads || 3,
      },
      stripeStatus: stripeSubscription?.status,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}
EOF

    echo "✅ Billing API routes created"
}

# Create Stripe components
create_stripe_components() {
    echo "🧩 Creating Stripe React components..."
    
    mkdir -p src/components/billing
    
    # Pricing component
    cat > src/components/billing/pricing-table.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { formatCurrency, getPlanFeatures } from '@/lib/stripe/client'
import { STRIPE_CONFIG } from '@/lib/stripe/config'

interface PricingTableProps {
  currentPlan?: string
  onSelectPlan: (priceId: string) => Promise<void>
}

export function PricingTable({ currentPlan = 'free', onSelectPlan }: PricingTableProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelectPlan = async (priceId: string) => {
    setLoading(priceId)
    try {
      await onSelectPlan(priceId)
    } finally {
      setLoading(null)
    }
  }

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: 0,
      interval: null,
      priceId: null,
      features: getPlanFeatures('free').features,
      popular: false,
    },
    {
      id: 'monthly',
      name: 'Pro Monthly',
      description: 'For active educators',
      price: STRIPE_CONFIG.products.monthly.amount,
      interval: 'month',
      priceId: STRIPE_CONFIG.products.monthly.priceId,
      features: getPlanFeatures('monthly').features,
      popular: true,
    },
    {
      id: 'annual',
      name: 'Pro Annual',
      description: 'Best value for schools',
      price: STRIPE_CONFIG.products.annual.amount,
      interval: 'year',
      priceId: STRIPE_CONFIG.products.annual.priceId,
      features: getPlanFeatures('annual').features,
      popular: false,
      savings: 'Save 2 months!',
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`relative ${
            plan.popular ? 'border-primary shadow-lg' : ''
          }`}
        >
          {plan.popular && (
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
              Most Popular
            </Badge>
          )}
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {plan.name}
              {plan.savings && (
                <Badge variant="secondary" className="text-xs">
                  {plan.savings}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="text-3xl font-bold">
              {plan.price === 0 ? (
                'Free'
              ) : (
                <>
                  {formatCurrency(plan.price)}
                  {plan.interval && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.interval}
                    </span>
                  )}
                </>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              variant={plan.popular ? 'default' : 'outline'}
              disabled={currentPlan === plan.id || loading === plan.priceId}
              onClick={() => plan.priceId && handleSelectPlan(plan.priceId)}
            >
              {loading === plan.priceId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : currentPlan === plan.id ? (
                'Current Plan'
              ) : plan.price === 0 ? (
                'Get Started'
              ) : (
                'Upgrade Now'
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
EOF

    # Billing management component
    cat > src/components/billing/billing-management.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/stripe/client'
import { Loader2, CreditCard, Calendar, TrendingUp } from 'lucide-react'

interface SubscriptionData {
  planType: string
  status: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  lastPaymentAmount?: number
  lastPaymentDate?: string
  usage: {
    current: number
    limit: number
  }
}

export function BillingManagement() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/billing/subscription')
      const data = await response.json()
      setSubscription(data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCustomerPortal = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/billing/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })
      
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error opening customer portal:', error)
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Unable to load subscription information.</p>
        </CardContent>
      </Card>
    )
  }

  const isActive = subscription.status === 'ACTIVE'
  const isCanceled = subscription.cancelAtPeriodEnd
  const usagePercentage = subscription.usage.limit === -1 
    ? 0 
    : (subscription.usage.current / subscription.usage.limit) * 100

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold capitalize">{subscription.planType.toLowerCase()} Plan</p>
              <p className="text-sm text-muted-foreground">
                Status: <Badge variant={isActive ? 'default' : 'secondary'}>
                  {subscription.status}
                </Badge>
              </p>
            </div>
            {subscription.planType !== 'FREE' && (
              <Button
                variant="outline"
                onClick={openCustomerPortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Manage Billing'
                )}
              </Button>
            )}
          </div>

          {isCanceled && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Your subscription will be canceled at the end of the current period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Document Uploads</span>
              <span>
                {subscription.usage.current} / {subscription.usage.limit === -1 ? '∞' : subscription.usage.limit}
              </span>
            </div>
            {subscription.usage.limit !== -1 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            )}
            {usagePercentage >= 90 && subscription.usage.limit !== -1 && (
              <p className="text-sm text-yellow-600">
                You're approaching your upload limit. Consider upgrading your plan.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      {subscription.planType !== 'FREE' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Billing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
              <div>
                <p className="text-sm font-medium">Current Billing Period</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}
            
            {subscription.lastPaymentAmount && subscription.lastPaymentDate && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Last Payment</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(subscription.lastPaymentAmount * 100)} on{' '}
                    {new Date(subscription.lastPaymentDate).toLocaleDateString()}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
EOF

    echo "✅ Stripe components created"
}

# Create usage tracking utilities
create_usage_tracking() {
    echo "📊 Creating usage tracking utilities..."
    
    mkdir -p src/lib/usage
    
    cat > src/lib/usage/tracking.ts << 'EOF'
import { prisma } from '@/lib/db/client'
import { getCurrentTenantId } from '@/lib/db/tenant'

export async function checkUploadAllowed(): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const tenantId = await getCurrentTenantId()
    if (!tenantId) {
      return { allowed: false, reason: 'No tenant found' }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        uploadCount: true,
        maxUploads: true,
        planType: true,
        isActive: true,
      },
    })

    if (!tenant) {
      return { allowed: false, reason: 'Tenant not found' }
    }

    if (!tenant.isActive) {
      return { allowed: false, reason: 'Account is inactive' }
    }

    // Check if unlimited plan
    if (tenant.maxUploads === -1) {
      return { allowed: true }
    }

    // Check upload limit
    if (tenant.uploadCount >= tenant.maxUploads) {
      return { 
        allowed: false, 
        reason: `Upload limit reached (${tenant.uploadCount}/${tenant.maxUploads})` 
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking upload allowance:', error)
    return { allowed: false, reason: 'Error checking limits' }
  }
}

export async function incrementUsage(tenantId: string): Promise<void> {
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { uploadCount: { increment: 1 } },
    })
  } catch (error) {
    console.error('Error incrementing usage:', error)
    throw error
  }
}

export async function getUsageStats(tenantId: string) {
  try {
    const [tenant, uploadStats, monthlyStats] = await Promise.all([
      // Get tenant info
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          uploadCount: true,
          maxUploads: true,
          planType: true,
        },
      }),
      
      // Get upload statistics
      prisma.upload.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      
      // Get monthly upload count
      prisma.upload.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ])

    const successfulUploads = uploadStats.find(s => s.status === 'COMPLETED')?._count.id || 0
    const failedUploads = uploadStats.find(s => s.status === 'FAILED')?._count.id || 0

    return {
      totalUploads: tenant?.uploadCount || 0,
      maxUploads: tenant?.maxUploads || 3,
      monthlyUploads: monthlyStats,
      successfulUploads,
      failedUploads,
      planType: tenant?.planType || 'FREE',
      isUnlimited: tenant?.maxUploads === -1,
      remainingUploads: tenant?.maxUploads === -1 
        ? -1 
        : Math.max(0, (tenant?.maxUploads || 3) - (tenant?.uploadCount || 0)),
    }
  } catch (error) {
    console.error('Error getting usage stats:', error)
    throw error
  }
}

export async function resetMonthlyUsage(): Promise<void> {
  try {
    // Reset upload count for all tenants at the beginning of each month
    // This is typically called by a cron job
    await prisma.subscription.updateMany({
      data: { monthlyUploadCount: 0 },
    })
    
    console.log('Monthly usage reset completed')
  } catch (error) {
    console.error('Error resetting monthly usage:', error)
    throw error
  }
}
EOF

    echo "✅ Usage tracking utilities created"
}

# Create Stripe setup script
create_stripe_setup_script() {
    echo "📋 Creating Stripe setup script..."
    
    cat > scripts/stripe-setup.sh << 'EOF'
#!/bin/bash

# Stripe Setup Helper Script
# This script helps you set up your Stripe products and prices

set -e

echo "🔧 Setting up Stripe products and prices..."

# Check if Stripe CLI is logged in
if ! stripe --version &>/dev/null; then
    echo "❌ Stripe CLI not found or not logged in"
    echo "Please install Stripe CLI and run 'stripe login'"
    exit 1
fi

# Create products and prices
echo "📦 Creating Stripe products..."

# Monthly plan
MONTHLY_PRODUCT=$(stripe products create \
    --name="IEPandMe Pro Monthly" \
    --description="Monthly subscription for unlimited IEP processing" \
    --format=json | jq -r '.id')

MONTHLY_PRICE=$(stripe prices create \
    --product=$MONTHLY_PRODUCT \
    --unit-amount=2000 \
    --currency=usd \
    --recurring[interval]=month \
    --format=json | jq -r '.id')

echo "✅ Monthly plan created: $MONTHLY_PRICE"

# Annual plan
ANNUAL_PRODUCT=$(stripe products create \
    --name="IEPandMe Pro Annual" \
    --description="Annual subscription for unlimited IEP processing" \
    --format=json | jq -r '.id')

ANNUAL_PRICE=$(stripe prices create \
    --product=$ANNUAL_PRODUCT \
    --unit-amount=20000 \
    --currency=usd \
    --recurring[interval]=year \
    --format=json | jq -r '.id')

echo "✅ Annual plan created: $ANNUAL_PRICE"

# Per-document pricing
PER_DOC_PRODUCT=$(stripe products create \
    --name="IEPandMe Document Processing" \
    --description="Pay per document processing" \
    --format=json | jq -r '.id')

PER_DOC_PRICE=$(stripe prices create \
    --product=$PER_DOC_PRODUCT \
    --unit-amount=200 \
    --currency=usd \
    --format=json | jq -r '.id')

echo "✅ Per-document pricing created: $PER_DOC_PRICE"

# Output environment variables
echo ""
echo "🔑 Add these to your .env.local file:"
echo "STRIPE_MONTHLY_PRICE_ID=$MONTHLY_PRICE"
echo "STRIPE_ANNUAL_PRICE_ID=$ANNUAL_PRICE"
echo "STRIPE_PER_DOCUMENT_PRICE_ID=$PER_DOC_PRICE"
echo ""

# Set up webhook endpoint
echo "🔗 Setting up webhook endpoint..."
WEBHOOK_ENDPOINT=$(stripe listen --forward-to localhost:3000/api/webhooks/stripe --format=json | jq -r '.webhook_signing_secret')

echo "🔑 Add this to your .env.local file:"
echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_ENDPOINT"
echo ""

echo "🎉 Stripe setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Add the environment variables above to your .env.local file"
echo "2. Start your development server: pnpm dev"
echo "3. Test the payment flow with Stripe test cards"
echo "4. Configure your production webhook endpoint in the Stripe dashboard"
EOF

    chmod +x scripts/stripe-setup.sh
    
    echo "✅ Stripe setup script created"
}

# Main execution
main() {
    echo "🎯 Starting Stripe integration setup..."
    
    check_requirements
    install_stripe_packages
    create_stripe_config
    create_stripe_client
    create_webhook_handler
    create_billing_routes
    create_stripe_components
    create_usage_tracking
    create_stripe_setup_script
    
    echo ""
    echo "🎉 Stripe integration setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Create a Stripe account at https://stripe.com"
    echo "2. Get your API keys from the Stripe dashboard"
    echo "3. Add your API keys to .env.local"
    echo "4. Run './scripts/stripe-setup.sh' to create products and prices"
    echo "5. Test the integration with Stripe test cards"
    echo ""
    echo "🔗 Useful commands:"
    echo "  stripe listen --forward-to localhost:3000/api/webhooks/stripe"
    echo "  stripe customers list"
    echo "  stripe subscriptions list"
    echo ""
    echo "📚 Documentation:"
    echo "  Stripe API: https://stripe.com/docs/api"
    echo "  Stripe CLI: https://stripe.com/docs/stripe-cli"
    echo "  Test cards: https://stripe.com/docs/testing"
    echo ""
    echo "🧪 Test URLs:"
    echo "  Pricing page: http://localhost:3000/pricing"
    echo "  Billing dashboard: http://localhost:3000/dashboard/billing"
    echo "  Webhook endpoint: http://localhost:3000/api/webhooks/stripe"
}

main "$@"