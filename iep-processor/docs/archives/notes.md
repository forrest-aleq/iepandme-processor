## **PHASE 1: PROJECT FOUNDATION**

*Duration: Day 1*

### **1.1 Next.js 15.2 Project Setup**

```
# Create project
npx create-next-app@latest iepandme --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd iepandme

# Install core dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install stripe @stripe/stripe-js
npm install @hookform/resolvers react-hook-form zod
npm install date-fns lucide-react
npm install @radix-ui/react-toast @radix-ui/react-dialog @radix-ui/react-dropdown-menu

# Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label form toast dialog dropdown-menu avatar badge progress separator tabs table

```

### **1.2 Environment Variables Setup**

```
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000

```

### **1.3 Project Structure**

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── calendar/
│   │   └── billing/
│   ├── api/
│   │   ├── auth/
│   │   ├── stripe/
│   │   └── students/
│   └── globals.css
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── students/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── stripe/
│   └── utils.ts
└── types/
    ├── database.ts
    └── stripe.ts

```

---

## **PHASE 2: SUPABASE CONFIGURATION️**

*Duration: Day 1-2*

### **2.1 Supabase Project Setup**

1. Create new Supabase project at [supabase.com](http://supabase.com/)
2. Get URL and anon key from Settings > API
3. Generate service role key

### **2.2 Database Schema Creation**

```sql
-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'incomplete',
  price_id TEXT,
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  grade_level TEXT,
  school TEXT,
  case_manager TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  student_id UUID REFERENCES students(id),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('iep', '504', 'other')),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_data JSONB,
  confidence_score DECIMAL(3,2),
  processing_cost DECIMAL(10,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action_type TEXT NOT NULL, -- 'document_upload', 'ai_processing', etc.
  cost DECIMAL(10,4) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

```

### **2.3 Row Level Security (RLS) Policies**

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Students policies
CREATE POLICY "Users can view own students" ON students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own students" ON students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own students" ON students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own students" ON students FOR DELETE USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);

-- Usage tracking policies
CREATE POLICY "Users can view own usage" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

```

### **2.4 Database Functions**

```sql
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get user upload count
CREATE OR REPLACE FUNCTION get_user_upload_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM documents
    WHERE user_id = user_uuid
    AND created_at >= date_trunc('month', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

```

---

## **PHASE 3: STRIPE CONFIGURATION**

*Duration: Day 2*

### **3.1 Stripe Dashboard Setup**

1. Create Stripe account and get API keys
2. Create products in Stripe Dashboard:

**Free Plan:**

- Name: "Free Plan"
- Price: $0
- Features: 3 uploads per month

**Pro Monthly:**

- Name: "Pro Monthly"
- Price: $20/month
- Recurring: Monthly
- Features: Unlimited uploads

**Pro Annual:**

- Name: "Pro Annual"
- Price: $200/year
- Recurring: Yearly
- Features: Unlimited uploads + priority support

### **3.2 Stripe Configuration Files**

```tsx
// src/lib/stripe/config.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const STRIPE_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    uploads: 3,
    features: ['3 document uploads', 'Basic support']
  },
  PRO_MONTHLY: {
    name: 'Pro Monthly',
    price: 2000, // $20.00 in cents
    priceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    uploads: -1, // Unlimited
    features: ['Unlimited uploads', 'Calendar integration', 'Priority support']
  },
  PRO_ANNUAL: {
    name: 'Pro Annual',
    price: 20000, // $200.00 in cents
    priceId: 'price_pro_annual', // Replace with actual Stripe price ID
    uploads: -1, // Unlimited
    features: ['Unlimited uploads', 'Calendar integration', 'Priority support', 'Save $40/year']
  }
}

```

### **3.3 Stripe Webhook Handler**

```tsx
// src/app/api/stripe/webhook/route.ts
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { supabase } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCancellation(event.data.object as Stripe.Subscription)
      break
    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.Invoice)
      break
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      price_id: subscription.items.data[0].price.id,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
}

```

---

## **PHASE 4: AUTHENTICATION SYSTEM**

*Duration: Day 2-3*

### **4.1 Supabase Client Setup**

```tsx
// src/lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'

export const supabase = createClientComponentClient<Database>()

// src/lib/supabase/server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies })
}

```

### **4.2 Login Page Component**

```tsx
// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Sign In to IEPandMe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button variant="outline" onClick={handleGoogleLogin} className="w-full">
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <a href="/signup" className="underline">
              Sign up
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

```

### **4.3 Auth Middleware**

```tsx
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Redirect to login if not authenticated
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup']
}

```

---

## **PHASE 5: DASHBOARD FOUNDATION**

*Duration: Day 3-4*

### **5.1 Dashboard Layout**

```tsx
// src/app/(dashboard)/layout.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
import { UserMenu } from '@/components/dashboard/user-menu'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">IEPandMe</h1>
            </div>
            <UserMenu user={session.user} profile={profile} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="w-64">
            <DashboardNav subscription={subscription} />
          </aside>
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

```

### **5.2 Dashboard Home Page**

```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { UploadZone } from '@/components/dashboard/upload-zone'
import { UsageCard } from '@/components/dashboard/usage-card'
import { RecentDocuments } from '@/components/dashboard/recent-documents'
import { StatsCards } from '@/components/dashboard/stats-cards'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Get user's subscription and usage data
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', session!.user.id)
    .single()

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: students } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', session!.user.id)

  // Calculate current month uploads
  const currentMonthUploads = documents?.filter(doc => {
    const docDate = new Date(doc.created_at)
    const now = new Date()
    return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear()
  }).length || 0

  const isProUser = subscription?.status === 'active'
  const uploadLimit = isProUser ? -1 : 3 // -1 means unlimited
  const uploadsRemaining = isProUser ? -1 : Math.max(0, uploadLimit - currentMonthUploads)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your IEP documents and student information
        </p>
      </div>

      <StatsCards
        totalStudents={students?.length || 0}
        totalDocuments={documents?.length || 0}
        currentMonthUploads={currentMonthUploads}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <UploadZone
            uploadsRemaining={uploadsRemaining}
            isProUser={isProUser}
          />
        </div>
        <div>
          <UsageCard
            currentUploads={currentMonthUploads}
            uploadLimit={uploadLimit}
            isProUser={isProUser}
          />
        </div>
      </div>

      <RecentDocuments documents={documents || []} />
    </div>
  )
}

```

---

## **PHASE 6: BILLING INTEGRATION**

*Duration: Day 4-5*

### **6.1 Stripe Checkout API Route**

```tsx
// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { priceId } = await req.json()
  const supabase = createServerSupabaseClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get or create Stripe customer
    let { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', session.user.id)
      .single()

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        metadata: {
          supabase_user_id: session.user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: session.user.id,
          stripe_customer_id: customerId,
        })
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        user_id: session.user.id,
      },
    })

    return NextResponse.json({ sessionId: checkoutSession.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

```

### **6.2 Billing Page**

```tsx
// src/app/(dashboard)/billing/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STRIPE_PLANS } from '@/lib/stripe/config'
import { supabase } from '@/lib/supabase/client'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    setSubscription(data)
  }

  const handleUpgrade = async (priceId: string) => {
    setLoading(true)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })

      const { sessionId } = await response.json()
      const stripe = await stripePromise

      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Checkout error:', error)
    }

    setLoading(false)
  }

  const isProUser = subscription?.status === 'active'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {isProUser ? 'Pro Plan' : 'Free Plan'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isProUser
                  ? 'Unlimited uploads and calendar integration'
                  : '3 uploads per month'
                }
              </p>
            </div>
            <Badge variant={isProUser ? 'default' : 'secondary'}>
              {isProUser ? 'Active' : 'Free'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={isProUser ? 'opacity-50' : ''}>
          <CardHeader>
            <CardTitle>Pro Monthly</CardTitle>
            <div className="text-3xl font-bold">$20<span className="text-sm font-normal">/month</span></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {STRIPE_PLANS.PRO_MONTHLY.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={() => handleUpgrade(STRIPE_PLANS.PRO_MONTHLY.priceId)}
              disabled={loading || isProUser}
            >
              {isProUser ? 'Current Plan' : 'Upgrade to Pro Monthly'}
            </Button>
          </CardContent>
        </Card>

        <Card className={isProUser ? 'opacity-50' : ''}>
          <CardHeader>
            <CardTitle>Pro Annual</CardTitle>
            <div className="text-3xl font-bold">$200<span className="text-sm font-normal">/year</span></div>
            <Badge variant="secondary">Save $40</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {STRIPE_PLANS.PRO_ANNUAL.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={() => handleUpgrade(STRIPE_PLANS.PRO_ANNUAL.priceId)}
              disabled={loading || isProUser}
            >
              {isProUser ? 'Current Plan' : 'Upgrade to Pro Annual'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

```

---

## **PHASE 7: STUDENT MANAGEMENT**

*Duration: Day 5-6*

### **7.1 Students List Page**

```tsx
// src/app/(dashboard)/students/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, User } from 'lucide-react'
import Link from 'next/link'

export default async function StudentsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: students } = await supabase
    .from('students')
    .select(`
      *,
      documents (
        id,
        document_type,
        processing_status,
        created_at
      )
    `)
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">
            Manage your student information and documents
          </p>
        </div>
        <Button asChild>
          <Link href="/students/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Link>
        </Button>
      </div>

      {students?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No students yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first student to get started with document management
            </p>
            <Button asChild>
              <Link href="/students/new">Add Student</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students?.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{student.first_name} {student.last_name}</span>
                  <Badge variant="outline">{student.grade_level}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>School:</strong> {student.school || 'Not specified'}</p>
                  <p><strong>Case Manager:</strong> {student.case_manager || 'Not specified'}</p>
                  <p><strong>Documents:</strong> {student.documents?.length || 0}</p>
                </div>
                <div className="mt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/students/${student.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

```

### **7.2 Student Detail Page (Binder)**

```tsx
// src/app/(dashboard)/students/[id]/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DocumentsTab } from '@/components/students/documents-tab'
import { GoalsTab } from '@/components/students/goals-tab'
import { ServicesTab } from '@/components/students/services-tab'
import { CalendarTab } from '@/components/students/calendar-tab'

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: student } = await supabase
    .from('students')
    .select(`
      *,
      documents (
        id,
        file_name,
        document_type,
        processing_status,
        extraction_data,
        created_at
      )
    `)
    .eq('id', params.id)
    .eq('user_id', session!.user.id)
    .single()

  if (!student) {
    notFound()
  }

  return (
    <div className="space-y-8">
      {/* Student Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                {student.first_name} {student.last_name}
              </CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge>{student.grade_level}</Badge>
                <Badge variant="outline">{student.school}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Date of Birth</p>
              <p className="text-muted-foreground">
                {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="font-medium">Case Manager</p>
              <p className="text-muted-foreground">{student.case_manager || 'Not specified'}</p>
            </div>
            <div>
              <p className="font-medium">Documents</p>
              <p className="text-muted-foreground">{student.documents?.length || 0}</p>
            </div>
            <div>
              <p className="font-medium">Last Updated</p>
              <p className="text-muted-foreground">
                {new Date(student.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Binder Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentsTab documents={student.documents || []} studentId={student.id} />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsTab studentId={student.id} />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab studentId={student.id} />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab studentId={student.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

```

---

## **PHASE 8: UPLOAD INFRASTRUCTURE**

*Duration: Day 6-7*

### **8.1 File Upload API Route**

```tsx
// src/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const studentId = formData.get('studentId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check upload limits for free users
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', session.user.id)
      .single()

    const isProUser = subscription?.status === 'active'

    if (!isProUser) {
      // Check current month uploads for free users
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

      if (count && count >= 3) {
        return NextResponse.json({
          error: 'Upload limit reached. Upgrade to Pro for unlimited uploads.'
        }, { status: 403 })
      }
    }

    // Upload file to Supabase Storage
    const fileName = `${session.user.id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) {
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
    }

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: session.user.id,
        student_id: studentId || null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        processing_status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // TODO: Queue document for AI processing
    // This is where you would trigger the 8-step processing pipeline
    // For now, we'll just return the document ID

    return NextResponse.json({
      documentId: document.id,
      message: 'Document uploaded successfully and queued for processing'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

```

### **8.2 Upload Zone Component**

```tsx
// src/components/dashboard/upload-zone.tsx
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface UploadZoneProps {
  uploadsRemaining: number
  isProUser: boolean
}

export function UploadZone({ uploadsRemaining, isProUser }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isProUser && uploadsRemaining <= 0) {
      toast({
        title: 'Upload limit reached',
        description: 'Upgrade to Pro for unlimited uploads',
        variant: 'destructive',
      })
      return
    }

    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const result = await response.json()

      toast({
        title: 'Upload successful',
        description: 'Your document is being processed',
      })

      // Refresh the page to show updated data
      window.location.reload()

    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [uploadsRemaining, isProUser])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: uploading || (!isProUser && uploadsRemaining <= 0),
  })

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upload Document</h3>
            {!isProUser && (
              <div className="text-sm text-muted-foreground">
                {uploadsRemaining} uploads remaining
              </div>
            )}
          </div>

          {uploading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Upload className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Uploading document...</p>
                </div>
              </div>
              <Progress value={uploadProgress} />
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${!isProUser && uploadsRemaining <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
              `}
            >
              <input {...getInputProps()} />

              {!isProUser && uploadsRemaining <= 0 ? (
                <div className="space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Upload limit reached</p>
                    <p className="text-muted-foreground">Upgrade to Pro for unlimited uploads</p>
                  </div>
                  <Button>Upgrade to Pro</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive ? 'Drop your document here' : 'Upload IEP or 504 Plan'}
                    </p>
                    <p className="text-muted-foreground">
                      Drag and drop or click to browse (PDF, DOC, DOCX)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

```

---

## **PHASE 9: FINAL INTEGRATION & TESTING**

*Duration: Day 7-8*

### **9.1 Environment Setup Checklist**

```
# Vercel deployment
vercel --prod

# Environment variables in Vercel dashboard:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=

```

### **9.2 Testing Checklist**

- **Authentication Flow**
    - Google OAuth login works
    - Email/password login works
    - User profile creation
    - Session persistence
- **Subscription Management**
    - Stripe checkout works
    - Webhook processing
    - Upload limit enforcement
    - Customer portal access
- **Document Management**
    - File upload works
    - Upload limits enforced
    - Document storage in Supabase
    - Processing status updates
- **Student Management**
    - Create/edit students
    - Student binder navigation
    - Document association
- **Database Security**
    - RLS policies working
    - Cross-tenant isolation
    - Data encryption

### **9.3 Production Deployment**

```
# Build and deploy
npm run build
vercel --prod

# Set up Stripe webhooks
# Point to: <https://yourdomain.com/api/stripe/webhook>

# Configure Supabase Auth
# Add your domain to allowed origins
# Set up OAuth providers

```

---

## **🎯 SUCCESS CRITERIA**

After completing all phases, you should have:

✅ **Fully functional authentication** with Supabase OAuth
✅ **Working Stripe integration** with real payments
✅ **Upload limit enforcement** (3 free, unlimited pro)
✅ **Student management system** with database persistence
✅ **Document upload infrastructure** ready for AI processing
✅ **Multi-tenant security** with RLS policies
✅ **Production-ready deployment** on Vercel

## **🚀 NEXT STEPS AFTER SKELETON**

Once this skeleton is complete, you can add:

1. **AI Processing Pipeline** (your 8-step system)
2. **Calendar Integration** (Google/Microsoft APIs)
3. **Advanced Analytics** and reporting
4. **Email Notifications** and alerts
5. **Mobile App** with React Native

**This plan gives you a bulletproof foundation to build upon!** 🎉