-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for better type safety
CREATE TYPE document_type_enum AS ENUM ('iep', '504', 'other');
CREATE TYPE processing_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE subscription_status_enum AS ENUM ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status subscription_status_enum NOT NULL DEFAULT 'incomplete',
  price_id TEXT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT subscriptions_period_check CHECK (
    (current_period_start IS NULL AND current_period_end IS NULL) OR
    (current_period_start IS NOT NULL AND current_period_end IS NOT NULL AND current_period_start < current_period_end)
  )
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name TEXT NOT NULL CHECK (length(trim(last_name)) > 0),
  date_of_birth DATE CHECK (date_of_birth <= CURRENT_DATE),
  grade_level TEXT,
  school TEXT,
  case_manager TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  file_size INTEGER CHECK (file_size > 0),
  file_type TEXT NOT NULL,
  document_type document_type_enum,
  processing_status processing_status_enum DEFAULT 'pending' NOT NULL,
  extraction_data JSONB,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  processing_cost DECIMAL(10,4) CHECK (processing_cost >= 0),
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (length(trim(action_type)) > 0),
  cost DECIMAL(10,4) DEFAULT 0 CHECK (cost >= 0),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(user_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action_type ON usage_tracking(user_id, action_type);
