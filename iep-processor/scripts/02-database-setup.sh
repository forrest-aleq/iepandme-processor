#!/bin/bash

# IEPandMe Database Setup Script - 2025
# Sets up Supabase with multi-tenant architecture and RLS policies

set -e

echo "🗄️ Setting up Supabase database with multi-tenant architecture..."

# Check for required tools
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm is required. Please run the project initialization script first."
        exit 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        echo "⚠️  Supabase CLI not found. Installing..."
        pnpm add -g supabase
    fi
    
    echo "✅ Requirements check passed"
}

# Setup Prisma schema
setup_prisma_schema() {
    echo "📝 Creating Prisma schema..."
    
    cat > prisma/schema.prisma << 'EOF'
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// User model for Supabase Auth integration
model User {
  id                String   @id @db.Uuid
  email             String   @unique
  tenantId          String   @db.Uuid
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  students          Student[]
  uploads           Upload[]
  subscriptions     Subscription[]
  
  @@map("users")
}

// Tenant model for multi-tenancy
model Tenant {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String
  slug          String   @unique
  domain        String?  @unique
  planType      PlanType @default(FREE)
  uploadCount   Int      @default(0)
  maxUploads    Int      @default(3)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  users         User[]
  students      Student[]
  uploads       Upload[]
  subscriptions Subscription[]
  
  @@map("tenants")
}

// Student model for IEP data
model Student {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String   @db.Uuid
  userId            String   @db.Uuid
  
  // Basic Information
  name              String
  school            String
  grade             String
  gender            Gender
  studentId         String?
  birthdate         DateTime
  district          String?
  homeAddress       String?
  
  // IEP Information
  primaryDisability String?
  annualReview      DateTime?
  effectiveUntil    DateTime?
  
  // Case Manager
  caseManagerName   String?
  caseManagerEmail  String?
  
  // Status and tracking
  isActive          Boolean  @default(true)
  lastUpdated       DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  user              User     @relation(fields: [userId], references: [id])
  iepData           IEPData[]
  goals             Goal[]
  accommodations    Accommodation[]
  services          Service[]
  tasks             Task[]
  uploads           Upload[]
  
  @@map("students")
}

// IEP Data storage
model IEPData {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String   @db.Uuid
  studentId         String   @db.Uuid
  
  // Document metadata
  sourceFile        String
  documentDate      DateTime?
  processingTime    Int? // in milliseconds
  confidence        Float?
  extractionModel   String?
  
  // Present Levels
  presentLevels     Json?
  
  // Standardized Assessments
  assessments       Json?
  
  // Raw extraction data
  rawData           Json?
  extractionMetadata Json?
  
  // Validation
  validationErrors  String[]
  validationWarnings String[]
  isValid           Boolean  @default(false)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  student           Student  @relation(fields: [studentId], references: [id])
  
  @@map("iep_data")
}

// Goals model
model Goal {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String   @db.Uuid
  studentId         String   @db.Uuid
  
  goalArea          String
  goalTopic         String
  baseline          String
  description       String
  targetPercentage  Float?
  targetDate        DateTime?
  additionalAreas   String[]
  shortTermObjectives String[]
  
  // Progress tracking
  currentProgress   Float?   @default(0)
  lastReviewed      DateTime?
  isActive          Boolean  @default(true)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  student           Student  @relation(fields: [studentId], references: [id])
  tasks             Task[]
  
  @@map("goals")
}

// Accommodations model
model Accommodation {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @db.Uuid
  studentId   String   @db.Uuid
  
  title       String
  description String
  category    AccommodationType?
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  student     Student  @relation(fields: [studentId], references: [id])
  
  @@map("accommodations")
}

// Services model
model Service {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String      @db.Uuid
  studentId       String      @db.Uuid
  
  serviceType     String
  durationMinutes Int
  frequency       String
  provider        String
  sessionLocation String
  sessionType     SessionType
  comments        String?
  
  // Scheduling
  startDate       DateTime?
  endDate         DateTime?
  isActive        Boolean     @default(true)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  // Relations
  student         Student     @relation(fields: [studentId], references: [id])
  tasks           Task[]
  
  @@map("services")
}

// Tasks and calendar events
model Task {
  id            String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String     @db.Uuid
  studentId     String     @db.Uuid
  goalId        String?    @db.Uuid
  serviceId     String?    @db.Uuid
  
  title         String
  description   String?
  type          TaskType
  priority      Priority   @default(MEDIUM)
  status        TaskStatus @default(PENDING)
  
  // Scheduling
  dueDate       DateTime
  reminderDate  DateTime?
  duration      Int?       // in minutes
  
  // Calendar integration
  googleEventId String?
  outlookEventId String?
  isCalendarSynced Boolean @default(false)
  
  // Completion
  completedAt   DateTime?
  notes         String?
  
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  
  // Relations
  student       Student    @relation(fields: [studentId], references: [id])
  goal          Goal?      @relation(fields: [goalId], references: [id])
  service       Service?   @relation(fields: [serviceId], references: [id])
  
  @@map("tasks")
}

// File uploads tracking
model Upload {
  id                String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String      @db.Uuid
  userId            String      @db.Uuid
  studentId         String?     @db.Uuid
  
  fileName          String
  fileSize          Int
  fileType          String
  mimeType          String
  
  // Processing status
  status            UploadStatus @default(PENDING)
  processingStarted DateTime?
  processingEnded   DateTime?
  errorMessage      String?
  
  // AI processing
  classificationResult String?  // IEP, 504, OTHER
  extractionModel      String?
  confidence          Float?
  costUsd             Float?
  
  // File handling
  tempPath            String?
  deletedAt           DateTime?
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  
  // Relations
  tenant              Tenant      @relation(fields: [tenantId], references: [id])
  user                User        @relation(fields: [userId], references: [id])
  student             Student?    @relation(fields: [studentId], references: [id])
  
  @@map("uploads")
}

// Subscription and billing
model Subscription {
  id                  String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId            String             @db.Uuid
  userId              String             @db.Uuid
  
  // Stripe integration
  stripeCustomerId    String?            @unique
  stripeSubscriptionId String?           @unique
  stripePriceId       String?
  
  // Subscription details
  planType            PlanType
  status              SubscriptionStatus @default(INACTIVE)
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  cancelAtPeriodEnd   Boolean           @default(false)
  
  // Usage tracking
  monthlyUploadCount  Int               @default(0)
  monthlyUploadLimit  Int               @default(3)
  totalUploadCount    Int               @default(0)
  
  // Billing
  lastPaymentAmount   Float?
  lastPaymentDate     DateTime?
  nextPaymentDate     DateTime?
  
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  
  // Relations
  tenant              Tenant            @relation(fields: [tenantId], references: [id])
  user                User              @relation(fields: [userId], references: [id])
  
  @@map("subscriptions")
}

// Calendar integrations
model CalendarIntegration {
  id                String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String               @db.Uuid
  userId            String               @db.Uuid
  
  provider          CalendarProvider
  providerUserId    String
  email             String
  displayName       String?
  
  // OAuth tokens
  accessToken       String
  refreshToken      String?
  tokenExpiry       DateTime?
  
  // Sync settings
  isActive          Boolean              @default(true)
  syncEnabled       Boolean              @default(true)
  defaultCalendarId String?
  lastSyncAt        DateTime?
  
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  
  @@unique([tenantId, provider, providerUserId])
  @@map("calendar_integrations")
}

// Enums
enum PlanType {
  FREE
  MONTHLY
  ANNUAL
  CUSTOM
}

enum Gender {
  MALE
  FEMALE
  NON_BINARY
  OTHER
}

enum AccommodationType {
  ACADEMIC
  BEHAVIORAL
  ENVIRONMENTAL
  TESTING
  ASSISTIVE_TECHNOLOGY
  OTHER
}

enum SessionType {
  INDIVIDUAL
  GROUP
}

enum TaskType {
  IEP_REVIEW
  GOAL_REVIEW
  SERVICE_DELIVERY
  ASSESSMENT
  MEETING
  DOCUMENTATION
  PARENT_CONTACT
  OTHER
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
  OVERDUE
}

enum UploadStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum SubscriptionStatus {
  INACTIVE
  ACTIVE
  PAST_DUE
  CANCELLED
  UNPAID
  TRIALING
}

enum CalendarProvider {
  GOOGLE
  MICROSOFT
  APPLE
}
EOF

    echo "✅ Prisma schema created"
}

# Create Supabase migration files
create_supabase_migrations() {
    echo "📋 Creating Supabase migration files..."
    
    mkdir -p supabase/migrations
    
    # Create RLS policies migration
    cat > supabase/migrations/20250708000001_initial_schema.sql << 'EOF'
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create custom functions for multi-tenancy
create or replace function auth.user_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'app_metadata')::json ->> 'tenant_id',
    null
  )::uuid;
$$;

-- Create function to check if user belongs to tenant
create or replace function auth.user_belongs_to_tenant(tenant_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  select auth.user_tenant_id() = tenant_uuid;
$$;

-- Enable Row Level Security on all tables
alter table public.users enable row level security;
alter table public.tenants enable row level security;
alter table public.students enable row level security;
alter table public.iep_data enable row level security;
alter table public.goals enable row level security;
alter table public.accommodations enable row level security;
alter table public.services enable row level security;
alter table public.tasks enable row level security;
alter table public.uploads enable row level security;
alter table public.subscriptions enable row level security;
alter table public.calendar_integrations enable row level security;

-- RLS Policies for Users
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- RLS Policies for Tenants
create policy "Users can view own tenant"
  on public.tenants for select
  using (auth.user_belongs_to_tenant(id));

create policy "Users can update own tenant"
  on public.tenants for update
  using (auth.user_belongs_to_tenant(id));

-- RLS Policies for Students
create policy "Users can view students in their tenant"
  on public.students for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert students in their tenant"
  on public.students for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update students in their tenant"
  on public.students for update
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can delete students in their tenant"
  on public.students for delete
  using (auth.user_belongs_to_tenant(tenant_id));

-- RLS Policies for IEP Data
create policy "Users can view IEP data in their tenant"
  on public.iep_data for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert IEP data in their tenant"
  on public.iep_data for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update IEP data in their tenant"
  on public.iep_data for update
  using (auth.user_belongs_to_tenant(tenant_id));

-- RLS Policies for Goals
create policy "Users can view goals in their tenant"
  on public.goals for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert goals in their tenant"
  on public.goals for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update goals in their tenant"
  on public.goals for update
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can delete goals in their tenant"
  on public.goals for delete
  using (auth.user_belongs_to_tenant(tenant_id));

-- RLS Policies for Accommodations
create policy "Users can view accommodations in their tenant"
  on public.accommodations for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert accommodations in their tenant"
  on public.accommodations for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update accommodations in their tenant"
  on public.accommodations for update
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can delete accommodations in their tenant"
  on public.accommodations for delete
  using (auth.user_belongs_to_tenant(tenant_id));

-- RLS Policies for Services
create policy "Users can view services in their tenant"
  on public.services for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert services in their tenant"
  on public.services for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update services in their tenant"
  on public.services for update
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can delete services in their tenant"
  on public.services for delete
  using (auth.user_belongs_to_tenant(tenant_id));

-- RLS Policies for Tasks
create policy "Users can view tasks in their tenant"
  on public.tasks for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert tasks in their tenant"
  on public.tasks for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update tasks in their tenant"
  on public.tasks for update
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can delete tasks in their tenant"
  on public.tasks for delete
  using (auth.user_belongs_to_tenant(tenant_id));

-- RLS Policies for Uploads
create policy "Users can view uploads in their tenant"
  on public.uploads for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert uploads in their tenant"
  on public.uploads for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update uploads in their tenant"
  on public.uploads for update
  using (auth.user_belongs_to_tenant(tenant_id));

-- RLS Policies for Subscriptions
create policy "Users can view subscriptions in their tenant"
  on public.subscriptions for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert subscriptions in their tenant"
  on public.subscriptions for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update subscriptions in their tenant"
  on public.subscriptions for update
  using (auth.user_belongs_to_tenant(tenant_id));

-- RLS Policies for Calendar Integrations
create policy "Users can view calendar integrations in their tenant"
  on public.calendar_integrations for select
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can insert calendar integrations in their tenant"
  on public.calendar_integrations for insert
  with check (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can update calendar integrations in their tenant"
  on public.calendar_integrations for update
  using (auth.user_belongs_to_tenant(tenant_id));

create policy "Users can delete calendar integrations in their tenant"
  on public.calendar_integrations for delete
  using (auth.user_belongs_to_tenant(tenant_id));
EOF

    # Create indexes migration
    cat > supabase/migrations/20250708000002_indexes.sql << 'EOF'
-- Performance indexes for multi-tenant queries

-- Users indexes
create index idx_users_tenant_id on public.users(tenant_id);
create index idx_users_email on public.users(email);

-- Tenants indexes
create index idx_tenants_slug on public.tenants(slug);
create index idx_tenants_domain on public.tenants(domain);
create index idx_tenants_active on public.tenants(is_active);

-- Students indexes
create index idx_students_tenant_id on public.students(tenant_id);
create index idx_students_user_id on public.students(user_id);
create index idx_students_name on public.students(name);
create index idx_students_school on public.students(school);
create index idx_students_active on public.students(is_active);

-- IEP Data indexes
create index idx_iep_data_tenant_id on public.iep_data(tenant_id);
create index idx_iep_data_student_id on public.iep_data(student_id);
create index idx_iep_data_created_at on public.iep_data(created_at);

-- Goals indexes
create index idx_goals_tenant_id on public.goals(tenant_id);
create index idx_goals_student_id on public.goals(student_id);
create index idx_goals_active on public.goals(is_active);
create index idx_goals_target_date on public.goals(target_date);

-- Accommodations indexes
create index idx_accommodations_tenant_id on public.accommodations(tenant_id);
create index idx_accommodations_student_id on public.accommodations(student_id);
create index idx_accommodations_active on public.accommodations(is_active);

-- Services indexes
create index idx_services_tenant_id on public.services(tenant_id);
create index idx_services_student_id on public.services(student_id);
create index idx_services_active on public.services(is_active);

-- Tasks indexes
create index idx_tasks_tenant_id on public.tasks(tenant_id);
create index idx_tasks_student_id on public.tasks(student_id);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_type on public.tasks(type);

-- Uploads indexes
create index idx_uploads_tenant_id on public.uploads(tenant_id);
create index idx_uploads_user_id on public.uploads(user_id);
create index idx_uploads_status on public.uploads(status);
create index idx_uploads_created_at on public.uploads(created_at);

-- Subscriptions indexes
create index idx_subscriptions_tenant_id on public.subscriptions(tenant_id);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);
create index idx_subscriptions_status on public.subscriptions(status);

-- Calendar integrations indexes
create index idx_calendar_integrations_tenant_id on public.calendar_integrations(tenant_id);
create index idx_calendar_integrations_user_id on public.calendar_integrations(user_id);
create index idx_calendar_integrations_provider on public.calendar_integrations(provider);
create index idx_calendar_integrations_active on public.calendar_integrations(is_active);
EOF

    # Create functions migration
    cat > supabase/migrations/20250708000003_functions.sql << 'EOF'
-- Utility functions for the application

-- Function to create a new tenant
create or replace function create_tenant(
  tenant_name text,
  tenant_slug text,
  user_email text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_tenant_id uuid;
  new_user_id uuid;
begin
  -- Create the tenant
  insert into public.tenants (name, slug)
  values (tenant_name, tenant_slug)
  returning id into new_tenant_id;
  
  -- Create the user with tenant association
  insert into public.users (id, email, tenant_id)
  values (auth.uid(), user_email, new_tenant_id)
  returning id into new_user_id;
  
  -- Create default subscription
  insert into public.subscriptions (tenant_id, user_id, plan_type, status)
  values (new_tenant_id, new_user_id, 'FREE', 'ACTIVE');
  
  return new_tenant_id;
end;
$$;

-- Function to check upload limits
create or replace function check_upload_limit(tenant_uuid uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  current_count int;
  max_uploads int;
begin
  -- Get current upload count and limit for the tenant
  select 
    t.upload_count,
    t.max_uploads
  into current_count, max_uploads
  from public.tenants t
  where t.id = tenant_uuid;
  
  return current_count < max_uploads;
end;
$$;

-- Function to increment upload count
create or replace function increment_upload_count(tenant_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.tenants
  set upload_count = upload_count + 1
  where id = tenant_uuid;
end;
$$;

-- Function to get tenant usage stats
create or replace function get_tenant_usage(tenant_uuid uuid)
returns table(
  upload_count int,
  max_uploads int,
  student_count bigint,
  active_tasks bigint,
  plan_type text
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    t.upload_count,
    t.max_uploads,
    count(distinct s.id) as student_count,
    count(distinct ta.id) filter (where ta.status in ('PENDING', 'IN_PROGRESS')) as active_tasks,
    t.plan_type::text
  from public.tenants t
  left join public.students s on s.tenant_id = t.id and s.is_active = true
  left join public.tasks ta on ta.tenant_id = t.id
  where t.id = tenant_uuid
  group by t.id, t.upload_count, t.max_uploads, t.plan_type;
end;
$$;

-- Function to cleanup old uploads
create or replace function cleanup_old_uploads()
returns void
language plpgsql
security definer
as $$
begin
  -- Mark uploads older than 24 hours as deleted if they're still in temp storage
  update public.uploads
  set 
    deleted_at = now(),
    temp_path = null
  where 
    created_at < now() - interval '24 hours'
    and status in ('COMPLETED', 'FAILED')
    and deleted_at is null;
end;
$$;

-- Function to generate tasks from IEP data
create or replace function generate_iep_tasks(student_uuid uuid)
returns void
language plpgsql
security definer
as $$
declare
  student_record record;
  goal_record record;
  service_record record;
  tenant_uuid uuid;
begin
  -- Get student and tenant info
  select s.tenant_id, s.name, s.annual_review, s.effective_until
  into tenant_uuid, student_record
  from public.students s
  where s.id = student_uuid;
  
  -- Generate annual review task if date exists
  if student_record.annual_review is not null then
    insert into public.tasks (
      tenant_id, student_id, title, description, type, due_date, priority
    ) values (
      tenant_uuid,
      student_uuid,
      'Annual IEP Review - ' || student_record.name,
      'Conduct annual IEP review meeting and update goals',
      'IEP_REVIEW',
      student_record.annual_review,
      'HIGH'
    );
  end if;
  
  -- Generate goal review tasks (quarterly)
  for goal_record in 
    select id, goal_area, target_date
    from public.goals
    where student_id = student_uuid and is_active = true
  loop
    insert into public.tasks (
      tenant_id, student_id, goal_id, title, description, type, due_date, priority
    ) values (
      tenant_uuid,
      student_uuid,
      goal_record.id,
      'Goal Review - ' || goal_record.goal_area,
      'Review progress on ' || goal_record.goal_area || ' goal',
      'GOAL_REVIEW',
      coalesce(goal_record.target_date, now() + interval '3 months'),
      'MEDIUM'
    );
  end loop;
  
  -- Generate service delivery tasks
  for service_record in
    select id, service_type, frequency
    from public.services
    where student_id = student_uuid and is_active = true
  loop
    insert into public.tasks (
      tenant_id, student_id, service_id, title, description, type, due_date, priority
    ) values (
      tenant_uuid,
      student_uuid,
      service_record.id,
      'Service Delivery - ' || service_record.service_type,
      'Provide ' || service_record.service_type || ' service (' || service_record.frequency || ')',
      'SERVICE_DELIVERY',
      now() + interval '1 week',
      'MEDIUM'
    );
  end loop;
end;
$$;
EOF

    echo "✅ Supabase migration files created"
}

# Create database seed file
create_seed_file() {
    echo "🌱 Creating database seed file..."
    
    cat > prisma/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo tenant
  const demoTenant = await prisma.tenant.create({
    data: {
      name: 'Demo School District',
      slug: 'demo-district',
      planType: 'FREE',
      maxUploads: 3,
    },
  })

  console.log('✅ Demo tenant created:', demoTenant.slug)

  // Create demo student data
  const demoStudent = await prisma.student.create({
    data: {
      tenantId: demoTenant.id,
      userId: '00000000-0000-0000-0000-000000000000', // Placeholder
      name: 'Jane Doe',
      school: 'Elementary School',
      grade: '3rd Grade',
      gender: 'FEMALE',
      birthdate: new Date('2015-05-15'),
      district: 'Demo School District',
      primaryDisability: 'Specific Learning Disability',
      annualReview: new Date('2025-09-15'),
      effectiveUntil: new Date('2026-09-15'),
      caseManagerName: 'Ms. Smith',
      caseManagerEmail: 'ms.smith@school.edu',
    },
  })

  console.log('✅ Demo student created:', demoStudent.name)

  // Create demo goals
  const goals = await prisma.goal.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        studentId: demoStudent.id,
        goalArea: 'Reading',
        goalTopic: 'Reading Comprehension',
        baseline: 'Currently reading at 1st grade level',
        description: 'Student will improve reading comprehension skills to grade level',
        targetPercentage: 80,
        targetDate: new Date('2025-06-01'),
      },
      {
        tenantId: demoTenant.id,
        studentId: demoStudent.id,
        goalArea: 'Math',
        goalTopic: 'Basic Operations',
        baseline: 'Can add single digits with 60% accuracy',
        description: 'Student will solve addition and subtraction problems with 80% accuracy',
        targetPercentage: 80,
        targetDate: new Date('2025-06-01'),
      },
    ],
  })

  console.log('✅ Demo goals created:', goals.count)

  // Create demo accommodations
  const accommodations = await prisma.accommodation.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        studentId: demoStudent.id,
        title: 'Extended Time',
        description: 'Provide 1.5x extended time for assignments and tests',
        category: 'ACADEMIC',
      },
      {
        tenantId: demoTenant.id,
        studentId: demoStudent.id,
        title: 'Small Group Setting',
        description: 'Allow testing in small group environment',
        category: 'ENVIRONMENTAL',
      },
    ],
  })

  console.log('✅ Demo accommodations created:', accommodations.count)

  // Create demo services
  const services = await prisma.service.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        studentId: demoStudent.id,
        serviceType: 'Special Education',
        durationMinutes: 60,
        frequency: 'Daily',
        provider: 'Special Education Teacher',
        sessionLocation: 'Resource Room',
        sessionType: 'INDIVIDUAL',
      },
      {
        tenantId: demoTenant.id,
        studentId: demoStudent.id,
        serviceType: 'Speech Therapy',
        durationMinutes: 30,
        frequency: 'Twice Weekly',
        provider: 'Speech-Language Pathologist',
        sessionLocation: 'Speech Room',
        sessionType: 'INDIVIDUAL',
      },
    ],
  })

  console.log('✅ Demo services created:', services.count)

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
EOF

    echo "✅ Database seed file created"
}

# Create database utilities
create_db_utilities() {
    echo "🛠️ Creating database utilities..."
    
    mkdir -p src/lib/db
    
    cat > src/lib/db/client.ts << 'EOF'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
EOF

    cat > src/lib/db/tenant.ts << 'EOF'
import { prisma } from './client'
import { auth } from '@supabase/auth-helpers-nextjs'

export async function getCurrentTenantId(): Promise<string | null> {
  try {
    const { data: { user } } = await auth.getUser()
    
    if (!user?.app_metadata?.tenant_id) {
      return null
    }
    
    return user.app_metadata.tenant_id as string
  } catch (error) {
    console.error('Error getting tenant ID:', error)
    return null
  }
}

export async function getTenantUsage(tenantId: string) {
  const result = await prisma.$queryRaw`
    SELECT * FROM get_tenant_usage(${tenantId}::uuid)
  `
  
  return Array.isArray(result) ? result[0] : null
}

export async function checkUploadLimit(tenantId: string): Promise<boolean> {
  const result = await prisma.$queryRaw`
    SELECT check_upload_limit(${tenantId}::uuid) as can_upload
  `
  
  return Array.isArray(result) && result[0]?.can_upload === true
}

export async function incrementUploadCount(tenantId: string): Promise<void> {
  await prisma.$queryRaw`
    SELECT increment_upload_count(${tenantId}::uuid)
  `
}
EOF

    cat > src/lib/db/queries.ts << 'EOF'
import { prisma } from './client'
import { getCurrentTenantId } from './tenant'

export async function getStudents() {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) throw new Error('No tenant found')
  
  return prisma.student.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    include: {
      goals: {
        where: { isActive: true },
        orderBy: { targetDate: 'asc' },
      },
      tasks: {
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { dueDate: 'asc' },
      },
      _count: {
        select: {
          goals: true,
          accommodations: true,
          services: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getStudentById(id: string) {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) throw new Error('No tenant found')
  
  return prisma.student.findFirst({
    where: {
      id,
      tenantId,
      isActive: true,
    },
    include: {
      goals: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      accommodations: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      services: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      tasks: {
        orderBy: { dueDate: 'asc' },
      },
      iepData: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
}

export async function getUpcomingTasks(limit = 10) {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) throw new Error('No tenant found')
  
  return prisma.task.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: { gte: new Date() },
    },
    include: {
      student: {
        select: { name: true },
      },
      goal: {
        select: { goalArea: true },
      },
      service: {
        select: { serviceType: true },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: limit,
  })
}

export async function getOverdueTasks() {
  const tenantId = await getCurrentTenantId()
  if (!tenantId) throw new Error('No tenant found')
  
  return prisma.task.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: { lt: new Date() },
    },
    include: {
      student: {
        select: { name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  })
}
EOF

    echo "✅ Database utilities created"
}

# Main execution
main() {
    echo "🎯 Starting database setup..."
    
    check_requirements
    setup_prisma_schema
    create_supabase_migrations
    create_seed_file
    create_db_utilities
    
    echo ""
    echo "🎉 Database setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Set up your Supabase project at https://supabase.com"
    echo "2. Copy your connection string to .env.local"
    echo "3. Run 'pnpm db:generate' to generate Prisma client"
    echo "4. Run 'pnpm db:push' to sync schema with database"
    echo "5. Run 'pnpm db:seed' to add demo data"
    echo ""
    echo "🔗 Useful commands:"
    echo "  pnpm db:studio     - Open Prisma Studio"
    echo "  pnpm db:migrate    - Create and run migrations"
    echo "  pnpm db:reset      - Reset database and run seed"
    echo ""
    echo "📚 Supabase setup:"
    echo "  1. Create new project at supabase.com"
    echo "  2. Go to Settings > API to get your keys"
    echo "  3. Go to SQL Editor and run the migration files"
    echo "  4. Set up OAuth providers in Authentication > Providers"
}

main "$@"