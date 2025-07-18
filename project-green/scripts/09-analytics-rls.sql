-- Row Level Security for Analytics Tables
-- This script sets up RLS policies for analytics and reporting tables

-- Enable RLS on analytics tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- Analytics Events Policies
CREATE POLICY "Users can view their own analytics events" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics events" ON analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Report Templates Policies
CREATE POLICY "Users can manage their own report templates" ON report_templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public report templates" ON report_templates
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Scheduled Reports Policies
CREATE POLICY "Users can manage their own scheduled reports" ON scheduled_reports
    FOR ALL USING (auth.uid() = user_id);

-- Report Executions Policies
CREATE POLICY "Users can view their own report executions" ON report_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own report executions" ON report_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own report executions" ON report_executions
    FOR UPDATE USING (auth.uid() = user_id);

-- Student Progress Snapshots Policies
CREATE POLICY "Users can view progress snapshots for their students" ON student_progress_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students 
            WHERE students.id = student_progress_snapshots.student_id 
            AND students.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert progress snapshots for their students" ON student_progress_snapshots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM students 
            WHERE students.id = student_progress_snapshots.student_id 
            AND students.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update progress snapshots for their students" ON student_progress_snapshots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM students 
            WHERE students.id = student_progress_snapshots.student_id 
            AND students.user_id = auth.uid()
        )
    );
