#!/bin/bash

# IEPandMe Deployment Setup Script - 2025
# Sets up production deployment with Vercel and monitoring

set -e

echo "🚀 Setting up production deployment configuration..."

# Check for required tools
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm is required. Please run the project initialization script first."
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        echo "⚠️  Vercel CLI not found. Installing..."
        pnpm add -g vercel
    fi
    
    echo "✅ Requirements check passed"
}

# Install deployment dependencies
install_deployment_packages() {
    echo "📦 Installing deployment and monitoring packages..."
    
    # Monitoring and error tracking
    pnpm add \
        @sentry/nextjs \
        @vercel/analytics \
        @vercel/speed-insights \
        next-plausible
    
    # Performance monitoring
    pnpm add \
        @opentelemetry/api \
        @opentelemetry/sdk-node \
        @opentelemetry/sdk-metrics \
        @opentelemetry/instrumentation
    
    # Health checks and utilities
    pnpm add \
        @vercel/node \
        node-cron \
        compression
    
    echo "✅ Deployment packages installed"
}

# Create Vercel configuration
create_vercel_config() {
    echo "⚙️ Creating Vercel configuration..."
    
    cat > vercel.json << 'EOF'
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile",
  "devCommand": "pnpm dev",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**": {
      "maxDuration": 300
    },
    "src/app/api/webhooks/**": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://*.supabase.co https://api.openai.com https://api.anthropic.com;"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/healthz",
      "destination": "/api/health"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF

    echo "✅ Vercel configuration created"
}

# Create environment configuration
create_env_config() {
    echo "🔧 Creating environment configuration..."
    
    # Production environment template
    cat > .env.production.example << 'EOF'
# Production Environment Configuration

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_URL="postgresql://user:password@host:5432/database"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-nextauth-secret"

# AI APIs
OPENAI_API_KEY="sk-your-production-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-production-anthropic-key"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_live_your-stripe-publishable-key"
STRIPE_SECRET_KEY="sk_live_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-production-webhook-secret"
STRIPE_MONTHLY_PRICE_ID="price_your-monthly-price-id"
STRIPE_ANNUAL_PRICE_ID="price_your-annual-price-id"
STRIPE_PER_DOCUMENT_PRICE_ID="price_your-per-document-price-id"

# Google Calendar
GOOGLE_CLIENT_ID="your-production-google-client-id"
GOOGLE_CLIENT_SECRET="your-production-google-client-secret"

# Microsoft Graph
MICROSOFT_CLIENT_ID="your-production-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-production-microsoft-client-secret"
MICROSOFT_TENANT_ID="your-microsoft-tenant-id"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"

# Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN="your-domain.com"

# Application Settings
NODE_ENV="production"
MAX_FILE_SIZE=10485760
MAX_CONCURRENT_UPLOADS=3
FREE_TIER_LIMIT=3
LOG_LEVEL="info"

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_ERROR_TRACKING=true
ENABLE_PERFORMANCE_MONITORING=true
EOF

    # Environment validation script
    cat > scripts/validate-env.js << 'EOF'
#!/usr/bin/env node

// Environment validation script
const requiredEnvVars = {
  development: [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
  ],
  production: [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'MICROSOFT_CLIENT_ID',
    'MICROSOFT_CLIENT_SECRET',
  ],
}

const environment = process.env.NODE_ENV || 'development'
const required = requiredEnvVars[environment] || requiredEnvVars.development

console.log(`🔍 Validating environment variables for ${environment}...`)

const missing = required.filter(envVar => !process.env[envVar])

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:')
  missing.forEach(envVar => console.error(`  - ${envVar}`))
  process.exit(1)
}

console.log('✅ All required environment variables are present')

// Validate specific formats
const validations = [
  {
    name: 'DATABASE_URL',
    pattern: /^postgresql:\/\/.+/,
    message: 'DATABASE_URL must be a valid PostgreSQL connection string'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    pattern: /^https:\/\/.+\.supabase\.co$/,
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL'
  },
  {
    name: 'OPENAI_API_KEY',
    pattern: /^sk-.+/,
    message: 'OPENAI_API_KEY must start with "sk-"'
  },
  {
    name: 'ANTHROPIC_API_KEY',
    pattern: /^sk-ant-.+/,
    message: 'ANTHROPIC_API_KEY must start with "sk-ant-"'
  },
]

if (environment === 'production') {
  validations.push(
    {
      name: 'NEXTAUTH_URL',
      pattern: /^https:\/\/.+/,
      message: 'NEXTAUTH_URL must be a valid HTTPS URL in production'
    },
    {
      name: 'STRIPE_SECRET_KEY',
      pattern: /^sk_live_.+/,
      message: 'STRIPE_SECRET_KEY must be a live key in production (starts with "sk_live_")'
    }
  )
}

const validationErrors = []

validations.forEach(({ name, pattern, message }) => {
  const value = process.env[name]
  if (value && !pattern.test(value)) {
    validationErrors.push(`${name}: ${message}`)
  }
})

if (validationErrors.length > 0) {
  console.error('❌ Environment variable validation errors:')
  validationErrors.forEach(error => console.error(`  - ${error}`))
  process.exit(1)
}

console.log('✅ Environment variable validation passed')
EOF

    chmod +x scripts/validate-env.js

    echo "✅ Environment configuration created"
}

# Create monitoring configuration
create_monitoring_config() {
    echo "📊 Creating monitoring configuration..."
    
    # Sentry configuration
    cat > sentry.client.config.ts << 'EOF'
import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/yourapp\.vercel\.app/,
          /^https:\/\/yourdomain\.com/,
        ],
      }),
    ],
    beforeSend(event, hint) {
      // Filter out known issues
      if (event.exception) {
        const error = hint.originalException
        if (error && error.message && error.message.includes('Non-Error promise rejection')) {
          return null
        }
      }
      return event
    },
  })
}
EOF

    cat > sentry.server.config.ts << 'EOF'
import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    integrations: [
      new Sentry.Integrations.Prisma({ client: undefined }),
    ],
    beforeSend(event, hint) {
      // Don't send auth errors to Sentry in production
      if (event.exception) {
        const error = hint.originalException
        if (error && error.message && error.message.includes('Unauthorized')) {
          return null
        }
      }
      return event
    },
  })
}
EOF

    cat > sentry.edge.config.ts << 'EOF'
import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
  })
}
EOF

    # Instrumentation file
    cat > instrumentation.ts << 'EOF'
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    
    // Initialize OpenTelemetry for performance monitoring
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      const { NodeSDK } = await import('@opentelemetry/sdk-node')
      const { Resource } = await import('@opentelemetry/resources')
      const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions')
      
      const sdk = new NodeSDK({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: 'iepandme-app',
          [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
        }),
      })
      
      sdk.start()
    }
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
EOF

    echo "✅ Monitoring configuration created"
}

# Create health check system
create_health_system() {
    echo "🏥 Creating advanced health check system..."
    
    mkdir -p src/lib/health
    
    cat > src/lib/health/checks.ts << 'EOF'
import { prisma } from '@/lib/db/client'

export interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  duration?: number
  metadata?: Record<string, any>
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: HealthCheck[]
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      name: 'database',
      status: 'healthy',
      message: 'Database connection successful',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: `Database connection failed: ${error}`,
      duration: Date.now() - start,
    }
  }
}

async function checkOpenAI(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        name: 'openai',
        status: 'unhealthy',
        message: 'OpenAI API key not configured',
        duration: Date.now() - start,
      }
    }
    
    // Simple API check (just verify key format)
    const isValidKey = process.env.OPENAI_API_KEY.startsWith('sk-')
    
    return {
      name: 'openai',
      status: isValidKey ? 'healthy' : 'unhealthy',
      message: isValidKey ? 'OpenAI API key configured' : 'Invalid OpenAI API key format',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'openai',
      status: 'unhealthy',
      message: `OpenAI check failed: ${error}`,
      duration: Date.now() - start,
    }
  }
}

async function checkAnthropic(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        name: 'anthropic',
        status: 'unhealthy',
        message: 'Anthropic API key not configured',
        duration: Date.now() - start,
      }
    }
    
    const isValidKey = process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')
    
    return {
      name: 'anthropic',
      status: isValidKey ? 'healthy' : 'unhealthy',
      message: isValidKey ? 'Anthropic API key configured' : 'Invalid Anthropic API key format',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'anthropic',
      status: 'unhealthy',
      message: `Anthropic check failed: ${error}`,
      duration: Date.now() - start,
    }
  }
}

async function checkMemoryUsage(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const memUsage = process.memoryUsage()
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const usagePercent = (usedMB / totalMB) * 100
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    let message = `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent.toFixed(1)}%)`
    
    if (usagePercent > 90) {
      status = 'unhealthy'
      message += ' - Critical memory usage'
    } else if (usagePercent > 75) {
      status = 'degraded'
      message += ' - High memory usage'
    }
    
    return {
      name: 'memory',
      status,
      message,
      duration: Date.now() - start,
      metadata: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
    }
  } catch (error) {
    return {
      name: 'memory',
      status: 'unhealthy',
      message: `Memory check failed: ${error}`,
      duration: Date.now() - start,
    }
  }
}

export async function runHealthChecks(): Promise<HealthReport> {
  const startTime = Date.now()
  
  const checks = await Promise.all([
    checkDatabase(),
    checkOpenAI(),
    checkAnthropic(),
    checkMemoryUsage(),
  ])
  
  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  
  const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length
  const degradedCount = checks.filter(c => c.status === 'degraded').length
  
  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy'
  } else if (degradedCount > 0) {
    overallStatus = 'degraded'
  }
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks,
  }
}
EOF

    # Enhanced health endpoint
    cat > src/app/api/health/detailed/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { runHealthChecks } from '@/lib/health/checks'

export async function GET() {
  try {
    const healthReport = await runHealthChecks()
    
    const statusCode = healthReport.status === 'healthy' ? 200 : 
                      healthReport.status === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthReport, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Health check system failure',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
EOF

    echo "✅ Health check system created"
}

# Create deployment scripts
create_deployment_scripts() {
    echo "🔧 Creating deployment scripts..."
    
    mkdir -p scripts/deployment
    
    # Pre-deployment checks
    cat > scripts/deployment/pre-deploy.sh << 'EOF'
#!/bin/bash

# Pre-deployment validation script

set -e

echo "🔍 Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Run this script from the project root."
    exit 1
fi

# Validate environment variables
echo "📋 Validating environment variables..."
node scripts/validate-env.js

# Run type checking
echo "🔍 Running TypeScript type checking..."
pnpm type-check

# Run linting
echo "🧹 Running ESLint..."
pnpm lint:check

# Run tests
echo "🧪 Running tests..."
pnpm test

# Check for security vulnerabilities
echo "🔒 Checking for security vulnerabilities..."
pnpm audit --audit-level moderate

# Build the application
echo "🏗️ Building application..."
pnpm build

echo "✅ Pre-deployment checks passed!"
EOF

    # Production deployment script
    cat > scripts/deployment/deploy.sh << 'EOF'
#!/bin/bash

# Production deployment script

set -e

echo "🚀 Deploying to production..."

# Check if logged into Vercel
if ! vercel whoami &>/dev/null; then
    echo "❌ Not logged into Vercel. Run 'vercel login' first."
    exit 1
fi

# Run pre-deployment checks
echo "🔍 Running pre-deployment checks..."
./scripts/deployment/pre-deploy.sh

# Confirm deployment
read -p "Deploy to production? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Deploy to Vercel
echo "📤 Deploying to Vercel..."
vercel --prod

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Run post-deployment checks
echo "🔍 Running post-deployment health checks..."
DEPLOYMENT_URL=$(vercel ls --scope=$(vercel whoami) | grep "$(basename $(pwd))" | head -1 | awk '{print $2}')

if [ -n "$DEPLOYMENT_URL" ]; then
    # Check if the deployment is healthy
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOYMENT_URL/api/health" || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Deployment successful! Health check passed."
        echo "🌐 Application URL: https://$DEPLOYMENT_URL"
    else
        echo "⚠️ Deployment completed but health check failed (HTTP $HTTP_STATUS)"
        echo "🌐 Application URL: https://$DEPLOYMENT_URL"
        echo "🔍 Check the deployment logs: vercel logs $DEPLOYMENT_URL"
    fi
else
    echo "⚠️ Could not determine deployment URL"
fi

echo "🎉 Deployment process completed!"
EOF

    # Rollback script
    cat > scripts/deployment/rollback.sh << 'EOF'
#!/bin/bash

# Rollback script

set -e

echo "🔄 Rolling back deployment..."

# Check if logged into Vercel
if ! vercel whoami &>/dev/null; then
    echo "❌ Not logged into Vercel. Run 'vercel login' first."
    exit 1
fi

# List recent deployments
echo "📋 Recent deployments:"
vercel ls --scope=$(vercel whoami) | head -10

echo ""
read -p "Enter the deployment URL to rollback to: " ROLLBACK_URL

if [ -z "$ROLLBACK_URL" ]; then
    echo "❌ No URL provided. Rollback cancelled."
    exit 1
fi

# Confirm rollback
read -p "Rollback to $ROLLBACK_URL? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Rollback cancelled."
    exit 1
fi

# Promote the deployment
echo "🔄 Promoting deployment..."
vercel promote $ROLLBACK_URL

echo "✅ Rollback completed!"
echo "🌐 Application URL: https://$ROLLBACK_URL"
EOF

    # Make scripts executable
    chmod +x scripts/deployment/*.sh

    echo "✅ Deployment scripts created"
}

# Create monitoring dashboard
create_monitoring_dashboard() {
    echo "📊 Creating monitoring dashboard..."
    
    mkdir -p src/app/(dashboard)/admin/monitoring
    
    cat > src/app/(dashboard)/admin/monitoring/page.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Server } from 'lucide-react'

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  duration?: number
  metadata?: Record<string, any>
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: HealthCheck[]
}

export default function MonitoringPage() {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchHealthReport = async () => {
    try {
      const response = await fetch('/api/health/detailed')
      const data = await response.json()
      setHealthReport(data)
      setLastChecked(new Date())
    } catch (error) {
      console.error('Failed to fetch health report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthReport()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthReport, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'unhealthy': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time health status and performance metrics
          </p>
        </div>
        <Button onClick={fetchHealthReport} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {healthReport && (
        <>
          {/* Overall Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthReport.status)}
                System Status
              </CardTitle>
              <CardDescription>
                Last checked: {lastChecked?.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium">Overall Status</p>
                  <Badge
                    variant={healthReport.status === 'healthy' ? 'default' : 'destructive'}
                    className="mt-1"
                  >
                    {healthReport.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Version</p>
                  <p className="text-sm text-muted-foreground">{healthReport.version}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Uptime</p>
                  <p className="text-sm text-muted-foreground">
                    {Math.floor(healthReport.uptime / 3600)}h {Math.floor((healthReport.uptime % 3600) / 60)}m
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Checks</p>
                  <p className="text-sm text-muted-foreground">
                    {healthReport.checks.filter(c => c.status === 'healthy').length} / {healthReport.checks.length} healthy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Health Checks */}
          <div className="grid gap-4">
            <h2 className="text-2xl font-semibold">Health Checks</h2>
            {healthReport.checks.map((check) => (
              <Card key={check.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 capitalize">
                    {getStatusIcon(check.status)}
                    {check.name}
                    {check.duration && (
                      <Badge variant="outline" className="ml-auto">
                        <Clock className="mr-1 h-3 w-3" />
                        {check.duration}ms
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{check.message}</p>
                  
                  {check.metadata && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Details:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          {Object.entries(check.metadata).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
EOF

    echo "✅ Monitoring dashboard created"
}

# Create CI/CD configuration
create_cicd_config() {
    echo "🔄 Creating CI/CD configuration..."
    
    mkdir -p .github/workflows
    
    cat > .github/workflows/ci.yml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Test and Build
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'pnpm'
        
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
        
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      
    - name: Run type checking
      run: pnpm type-check
      
    - name: Run ESLint
      run: pnpm lint:check
      
    - name: Run tests
      run: pnpm test
      
    - name: Build application
      run: pnpm build
      
    - name: Security audit
      run: pnpm audit --audit-level moderate

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Deploy to Vercel (Preview)
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        github-comment: true

  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Deploy to Vercel (Production)
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        github-comment: true
        
    - name: Run post-deployment health check
      run: |
        sleep 30
        curl -f ${{ env.VERCEL_URL }}/api/health || exit 1
EOF

    cat > .github/workflows/security.yml << 'EOF'
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
        
    - name: Upload Trivy scan results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: 'trivy-results.sarif'
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'pnpm'
        
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
        
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      
    - name: Run security audit
      run: pnpm audit --audit-level moderate
EOF

    echo "✅ CI/CD configuration created"
}

# Create deployment documentation
create_deployment_docs() {
    echo "📚 Creating deployment documentation..."
    
    cat > DEPLOYMENT.md << 'EOF'
# Deployment Guide

This guide covers deploying IEPandMe to production using Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Domain**: Custom domain for production (optional)
3. **Environment Variables**: All production API keys and secrets
4. **Database**: Production PostgreSQL database (Supabase recommended)

## Pre-Deployment Setup

### 1. Environment Configuration

Create `.env.production` with all required variables:
```bash
cp .env.production.example .env.production
# Edit .env.production with actual values
```

### 2. Validate Configuration

Run pre-deployment checks:
```bash
./scripts/deployment/pre-deploy.sh
```

### 3. Database Setup

Ensure your production database is set up:
- Run migrations: `pnpm db:migrate`
- Verify connection: `pnpm db:studio`

## Deployment Process

### Method 1: Automated Deployment (Recommended)

1. **Setup Vercel CLI**:
   ```bash
   pnpm add -g vercel
   vercel login
   ```

2. **Link Project**:
   ```bash
   vercel link
   ```

3. **Deploy**:
   ```bash
   ./scripts/deployment/deploy.sh
   ```

### Method 2: GitHub Integration

1. **Connect Repository**:
   - Go to Vercel Dashboard
   - Import your GitHub repository
   - Configure build settings

2. **Set Environment Variables**:
   - In Vercel Dashboard > Project Settings > Environment Variables
   - Add all production environment variables

3. **Deploy**:
   - Push to main branch
   - Automatic deployment via GitHub Actions

## Post-Deployment Configuration

### 1. Custom Domain Setup

1. In Vercel Dashboard:
   - Go to Project Settings > Domains
   - Add your custom domain
   - Configure DNS records

2. Update environment variables:
   - `NEXTAUTH_URL`: Update to your custom domain
   - `STRIPE_WEBHOOK_SECRET`: Update webhook endpoint

### 2. Webhook Configuration

Update webhook URLs in third-party services:

**Stripe Webhooks**:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `customer.subscription.*`, `invoice.payment_*`, `checkout.session.completed`

**Google Calendar** (if using):
- Update redirect URIs in Google Console
- URL: `https://yourdomain.com/api/calendar/google/callback`

**Microsoft Graph** (if using):
- Update redirect URIs in Azure Portal
- URL: `https://yourdomain.com/api/calendar/microsoft/callback`

### 3. Monitoring Setup

1. **Sentry** (Error Tracking):
   - Create project at [sentry.io](https://sentry.io)
   - Add `SENTRY_DSN` to environment variables

2. **Analytics** (Optional):
   - Add `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` for Plausible
   - Configure Vercel Analytics

### 4. Health Check Verification

Verify deployment health:
```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-08T...",
  "version": "1.0.0"
}
```

## Monitoring and Maintenance

### Health Monitoring

- **Health Check**: `https://yourdomain.com/api/health`
- **Detailed Report**: `https://yourdomain.com/api/health/detailed`
- **Admin Dashboard**: `https://yourdomain.com/admin/monitoring`

### Performance Monitoring

Vercel provides built-in monitoring:
- **Analytics**: Function execution times, errors
- **Speed Insights**: Core Web Vitals
- **Real User Monitoring**: User experience metrics

### Backup Strategy

1. **Database Backups**:
   - Supabase: Automatic daily backups
   - Custom: Set up automated backups

2. **Environment Variables**:
   - Keep secure backup of all environment variables
   - Document any changes

### Scaling Considerations

1. **Function Limits**:
   - Document processing: 5-minute timeout
   - Webhooks: 30-second timeout
   - API routes: 10-second timeout

2. **Database Connections**:
   - Use connection pooling in production
   - Monitor active connections

3. **API Rate Limits**:
   - OpenAI: Monitor usage and costs
   - Anthropic: Track API limits
   - Google/Microsoft: Monitor calendar API usage

## Troubleshooting

### Common Issues

1. **Environment Variables**:
   ```bash
   # Validate all variables are set
   node scripts/validate-env.js
   ```

2. **Database Connection**:
   ```bash
   # Test database connectivity
   pnpm db:studio
   ```

3. **Build Failures**:
   ```bash
   # Local build test
   pnpm build
   ```

### Rollback Process

If deployment issues occur:
```bash
./scripts/deployment/rollback.sh
```

### Log Analysis

- **Vercel Logs**: `vercel logs [deployment-url]`
- **Sentry**: Error tracking and performance
- **Database Logs**: Supabase dashboard

## Security Checklist

- [ ] All environment variables use production values
- [ ] API keys are properly secured
- [ ] HTTPS enforced on custom domain
- [ ] Security headers configured
- [ ] Content Security Policy implemented
- [ ] Rate limiting enabled
- [ ] Database access restricted
- [ ] Webhook endpoints secured
- [ ] Error handling doesn't expose sensitive data

## Performance Optimization

### Frontend
- [ ] Image optimization enabled
- [ ] Static assets cached properly
- [ ] Bundle size optimized
- [ ] Core Web Vitals within targets

### Backend
- [ ] Database queries optimized
- [ ] API response times monitored
- [ ] Function cold starts minimized
- [ ] External API calls optimized

### Monitoring
- [ ] Error rates tracked
- [ ] Performance metrics monitored
- [ ] User experience measured
- [ ] Cost monitoring enabled

## Support and Maintenance

### Regular Tasks
- Weekly: Review error logs and performance metrics
- Monthly: Update dependencies and security patches
- Quarterly: Review and optimize costs

### Emergency Procedures
1. **Service Outage**: Use rollback script
2. **Security Incident**: Rotate API keys immediately
3. **Data Loss**: Restore from backup
4. **Performance Issues**: Scale resources or optimize queries

### Documentation Updates
Keep this guide updated with:
- New environment variables
- Changed API endpoints
- Updated monitoring procedures
- New security requirements
EOF

    echo "✅ Deployment documentation created"
}

# Main execution
main() {
    echo "🎯 Starting deployment setup..."
    
    check_requirements
    install_deployment_packages
    create_vercel_config
    create_env_config
    create_monitoring_config
    create_health_system
    create_deployment_scripts
    create_monitoring_dashboard
    create_cicd_config
    create_deployment_docs
    
    echo ""
    echo "🎉 Deployment setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Create Vercel account and install CLI: pnpm add -g vercel"
    echo "2. Set up production environment variables"
    echo "3. Configure monitoring services (Sentry, etc.)"
    echo "4. Run pre-deployment checks: ./scripts/deployment/pre-deploy.sh"
    echo "5. Deploy to production: ./scripts/deployment/deploy.sh"
    echo ""
    echo "🔗 Setup URLs:"
    echo "  Vercel: https://vercel.com"
    echo "  Sentry: https://sentry.io"
    echo "  GitHub Actions: https://github.com/features/actions"
    echo ""
    echo "📚 Documentation:"
    echo "  See DEPLOYMENT.md for detailed deployment instructions"
    echo "  See .github/workflows/ for CI/CD configuration"
    echo ""
    echo "🧪 Available scripts:"
    echo "  ./scripts/deployment/pre-deploy.sh  - Pre-deployment validation"
    echo "  ./scripts/deployment/deploy.sh      - Production deployment"
    echo "  ./scripts/deployment/rollback.sh    - Emergency rollback"
    echo "  node scripts/validate-env.js        - Environment validation"
    echo ""
    echo "📊 Monitoring:"
    echo "  Health check: /api/health"
    echo "  Detailed health: /api/health/detailed"
    echo "  Admin dashboard: /admin/monitoring"
}

main "$@"