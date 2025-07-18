#!/bin/bash

# IEPandMe Project Initialization Script - 2025
# Sets up Next.js 15.2 with latest tech stack

set -e

PROJECT_NAME="iepandme-app"
echo "🚀 Initializing IEPandMe SaaS Application with Next.js 15.2..."

# Check for required tools
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo "⚠️  pnpm not found. Installing pnpm globally..."
        npm install -g pnpm
    fi
    
    echo "✅ Requirements check passed"
}

# Create Next.js project with latest version
create_nextjs_project() {
    echo "📦 Creating Next.js 15.2 project..."
    
    # Create Next.js project with all modern features
    pnpm create next-app@latest $PROJECT_NAME \
        --typescript \
        --tailwind \
        --eslint \
        --app \
        --src-dir \
        --import-alias "@/*" \
        --use-pnpm
    
    cd $PROJECT_NAME
    echo "✅ Next.js project created"
}

# Install shadcn/ui with 2025 setup
setup_shadcn() {
    echo "🎨 Setting up shadcn/ui with React 19 + Tailwind v4 support..."
    
    # Install shadcn/ui CLI and initialize
    pnpm dlx shadcn@latest init
    
    # Add essential components
    echo "📦 Installing core shadcn/ui components..."
    pnpm dlx shadcn@latest add button
    pnpm dlx shadcn@latest add input
    pnpm dlx shadcn@latest add card
    pnpm dlx shadcn@latest add label
    pnpm dlx shadcn@latest add toast
    pnpm dlx shadcn@latest add dialog
    pnpm dlx shadcn@latest add dropdown-menu
    pnpm dlx shadcn@latest add form
    pnpm dlx shadcn@latest add progress
    pnpm dlx shadcn@latest add table
    pnpm dlx shadcn@latest add tabs
    pnpm dlx shadcn@latest add calendar
    pnpm dlx shadcn@latest add select
    pnpm dlx shadcn@latest add checkbox
    pnpm dlx shadcn@latest add alert
    pnpm dlx shadcn@latest add badge
    pnpm dlx shadcn@latest add separator
    pnpm dlx shadcn@latest add skeleton
    
    echo "✅ shadcn/ui setup complete"
}

# Install core dependencies
install_dependencies() {
    echo "📦 Installing core dependencies..."
    
    # Core app dependencies
    pnpm add \
        @supabase/supabase-js \
        @supabase/auth-helpers-nextjs \
        @supabase/auth-helpers-react \
        @prisma/client \
        prisma \
        zod \
        react-hook-form \
        @hookform/resolvers \
        next-auth@beta \
        @auth/prisma-adapter \
        stripe \
        @stripe/stripe-js \
        @stripe/react-stripe-js \
        framer-motion \
        date-fns \
        lucide-react \
        class-variance-authority \
        clsx \
        tailwind-merge \
        cmdk \
        vaul
    
    # AI and document processing
    pnpm add \
        openai \
        @anthropic-ai/sdk \
        pdf-parse \
        mammoth \
        node-ical \
        ical-generator
    
    # Google and Microsoft APIs
    pnpm add \
        googleapis \
        @azure/msal-node \
        @microsoft/microsoft-graph-client
    
    # Development dependencies
    pnpm add -D \
        @types/node \
        @types/react \
        @types/react-dom \
        @types/pdf-parse \
        eslint \
        eslint-config-next \
        typescript \
        tailwindcss \
        postcss \
        autoprefixer \
        prettier \
        prettier-plugin-tailwindcss \
        @types/jest \
        jest \
        @testing-library/react \
        @testing-library/jest-dom \
        @playwright/test \
        husky \
        lint-staged
    
    echo "✅ Dependencies installed"
}

# Setup environment files
setup_environment() {
    echo "🔧 Setting up environment configuration..."
    
    # Create environment template
    cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/iepandme"
DIRECT_URL="postgresql://user:password@localhost:5432/iepandme"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# AI APIs
OPENAI_API_KEY="sk-your-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"

# Google Calendar
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft Graph
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_TENANT_ID="your-microsoft-tenant-id"

# Redis (optional - for caching)
REDIS_URL="redis://localhost:6379"

# Application Settings
MAX_FILE_SIZE=10485760
MAX_CONCURRENT_UPLOADS=3
FREE_TIER_LIMIT=3
EOF

    # Copy to actual .env file
    cp .env.example .env.local
    
    echo "✅ Environment files created"
}

# Setup project structure
setup_project_structure() {
    echo "📁 Setting up project structure..."
    
    # Create essential directories
    mkdir -p src/components/ui
    mkdir -p src/components/forms
    mkdir -p src/components/layouts
    mkdir -p src/components/providers
    mkdir -p src/lib
    mkdir -p src/hooks
    mkdir -p src/types
    mkdir -p src/utils
    mkdir -p src/app/api
    mkdir -p src/app/(auth)
    mkdir -p src/app/(dashboard)
    mkdir -p prisma/migrations
    mkdir -p scripts
    mkdir -p tests/unit
    mkdir -p tests/integration
    mkdir -p tests/e2e
    mkdir -p public/icons
    mkdir -p docs
    
    echo "✅ Project structure created"
}

# Setup Git and hooks
setup_git() {
    echo "🔗 Setting up Git and hooks..."
    
    # Initialize git if not already done
    if [ ! -d .git ]; then
        git init
    fi
    
    # Setup Husky for git hooks
    pnpm dlx husky-init && pnpm install
    
    # Configure lint-staged
    cat > .lintstagedrc.json << 'EOF'
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,css}": [
    "prettier --write"
  ]
}
EOF

    # Update pre-commit hook
    echo "pnpm lint-staged" > .husky/pre-commit
    
    # Create .gitignore additions
    cat >> .gitignore << 'EOF'

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
/prisma/dev.db
/prisma/dev.db-journal

# Testing
/coverage
/tests/screenshots
/tests/videos

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/
*.tmp

# Build outputs
dist/
build/
out/
EOF
    
    echo "✅ Git setup complete"
}

# Setup package.json scripts
setup_scripts() {
    echo "⚙️ Setting up package.json scripts..."
    
    # Update package.json with useful scripts
    cat > package.json.tmp << 'EOF'
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint --fix",
    "lint:check": "next lint",
    "type-check": "tsc --noEmit",
    "prettier": "prettier --write .",
    "prettier:check": "prettier --check .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force",
    "prepare": "husky install",
    "clean": "rm -rf .next out dist build",
    "analyze": "ANALYZE=true npm run build",
    "docker:dev": "docker-compose -f docker-compose.dev.yml up",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up"
  }
}
EOF

    # Merge with existing package.json
    node -e "
        const fs = require('fs');
        const existing = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const updates = JSON.parse(fs.readFileSync('package.json.tmp', 'utf8'));
        existing.scripts = { ...existing.scripts, ...updates.scripts };
        fs.writeFileSync('package.json', JSON.stringify(existing, null, 2));
    "
    
    rm package.json.tmp
    
    echo "✅ Package.json scripts updated"
}

# Create initial configuration files
create_config_files() {
    echo "📄 Creating configuration files..."
    
    # Prettier config
    cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 80,
  "plugins": ["prettier-plugin-tailwindcss"]
}
EOF

    # ESLint config update
    cat > .eslintrc.json << 'EOF'
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
EOF

    # TypeScript config update
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

    # Tailwind config for v4 compatibility
    cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Using your design system colors
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        secondary: {
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
        },
        accent: {
          50: 'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
        },
      },
      fontFamily: {
        primary: 'var(--font-family-primary)',
        secondary: 'var(--font-family-secondary)',
        mono: 'var(--font-family-mono)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
EOF

    echo "✅ Configuration files created"
}

# Main execution
main() {
    echo "🎯 Starting IEPandMe project initialization..."
    
    check_requirements
    create_nextjs_project
    setup_shadcn
    install_dependencies
    setup_environment
    setup_project_structure
    setup_git
    setup_scripts
    create_config_files
    
    echo ""
    echo "🎉 Project initialization complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. cd $PROJECT_NAME"
    echo "2. Copy your design files to src/styles/"
    echo "3. Configure your .env.local file with actual API keys"
    echo "4. Run 'pnpm dev' to start development"
    echo ""
    echo "📚 Available scripts:"
    echo "  pnpm dev          - Start development server"
    echo "  pnpm build        - Build for production"
    echo "  pnpm lint         - Lint and fix code"
    echo "  pnpm test         - Run tests"
    echo "  pnpm db:studio    - Open Prisma Studio"
    echo ""
    echo "🔗 Useful commands:"
    echo "  pnpm dlx shadcn@latest add [component] - Add shadcn components"
    echo "  prisma migrate dev - Run database migrations"
    echo "  vercel deploy - Deploy to Vercel"
}

main "$@"