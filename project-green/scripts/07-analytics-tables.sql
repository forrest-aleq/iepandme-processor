-- Analytics and Reporting Tables
-- This script creates the database schema for comprehensive analytics and reporting

-- Analytics Events Table - Track all user actions for reporting
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Templates Table - Store custom report configurations
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL, -- 'student_progress', 'document_analytics', 'usage_summary', 'compliance'
    configuration JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Reports Table - Manage automated report generation
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    schedule_cron VARCHAR(100) NOT NULL, -- Cron expression for scheduling
    email_recipients TEXT[] DEFAULT '{}',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Executions Table - Track report generation history
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    file_path TEXT,
    file_size INTEGER,
    execution_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Student Progress Snapshots - Store periodic progress data
CREATE TABLE IF NOT EXISTS student_progress_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_documents INTEGER DEFAULT 0,
    completed_documents INTEGER DEFAULT 0,
    pending_documents INTEGER DEFAULT 0,
    overdue_dates INTEGER DEFAULT 0,
    compliance_score DECIMAL(5,2), -- Percentage score
    progress_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, snapshot_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_report_executions_user_id ON report_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_created_at ON report_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_student_progress_snapshots_student_id ON student_progress_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_snapshots_date ON student_progress_snapshots(snapshot_date);

-- Create updated_at trigger for report_templates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_report_templates_updated_at 
    BEFORE UPDATE ON report_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at 
    BEFORE UPDATE ON scheduled_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
