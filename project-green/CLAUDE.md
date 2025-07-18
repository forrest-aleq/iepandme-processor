# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start Development Server:**
```bash
npm run dev
```

**Build for Production:**
```bash
npm run build
```

**Run Linting:**
```bash
npm run lint
```

**Start Production Server:**
```bash
npm start
```

## Project Architecture

This is a **Next.js 14** web application for IEP (Individualized Education Program) document management built with:

- **Frontend**: Next.js App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with Shadcn/ui components (Radix UI primitives)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **Payments**: Stripe integration
- **Package Manager**: pnpm

### Key Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes (/login, /signup, etc.)
│   ├── (dashboard)/       # Protected dashboard routes
│   └── api/               # API routes
├── components/            # React components organized by feature
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── students/         # Student management
│   ├── calendar/         # Calendar functionality
│   ├── analytics/        # Analytics/reporting
│   └── ui/               # Reusable UI components (Shadcn/ui)
├── lib/                  # Utility libraries
│   ├── supabase/        # Database client & utilities
│   ├── stripe/          # Payment processing
│   ├── calendar/        # Calendar integration (Google)
│   └── analytics/       # Analytics utilities
├── hooks/               # Custom React hooks
└── types/               # TypeScript type definitions
```

### Database Architecture

- **Supabase PostgreSQL** with comprehensive schema
- **Row Level Security (RLS)** enabled for data protection
- **Key Tables**: users, subscriptions, students, documents, calendar_events, analytics_events
- **Database Scripts**: Located in `/scripts/` directory (9 migration files)

### Component Patterns

- Uses **Shadcn/ui** design system with Radix UI primitives
- **Server/Client component separation** following Next.js 14 patterns
- **Form handling** with React Hook Form + Zod validation
- **Type-safe database operations** with TypeScript

### Authentication & Security

- **Supabase Auth** for user authentication
- **Row Level Security** for database access control
- **Protected routes** using Next.js middleware patterns
- **Environment variables** for sensitive configuration

### External Integrations

- **Stripe** for subscription management and payments
- **Google Calendar API** for calendar integration
- **Chart.js & Recharts** for data visualization
- **React Dropzone** for file uploads

### Development Notes

- **TypeScript** is configured in strict mode
- **ESLint** is configured but build does not fail on lint errors
- **No testing framework** is currently set up
- **pnpm** is the preferred package manager (evidenced by pnpm-lock.yaml)
- **Environment variables** should be configured for Supabase and Stripe integration

### Route Structure

- **Authentication**: `/login`, `/signup`, `/forgot-password`
- **Dashboard**: `/dashboard`, `/students`, `/documents`, `/calendar`
- **Features**: `/analytics`, `/billing`, `/settings`, `/upload`

### File Upload & Storage

- Uses Supabase Storage for document management
- React Dropzone for file upload interface
- Document processing for IEP files

### State Management

- React built-in state management (useState, useContext)
- React Hook Form for form state
- Supabase for server state and real-time updates