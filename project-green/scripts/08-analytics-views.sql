-- Analytics Views and Functions
-- This script creates views and functions for efficient data aggregation

-- Student Progress Summary View
CREATE OR REPLACE VIEW student_progress_summary AS
SELECT 
    s.id,
    s.user_id,
    s.first_name,
    s.last_name,
    s.grade_level,
    s.school,
    COUNT(d.id) as total_documents,
    COUNT(CASE WHEN d.processing_status = 'completed' THEN 1 END) as completed_documents,
    COUNT(CASE WHEN d.processing_status = 'pending' THEN 1 END) as pending_documents,
    COUNT(CASE WHEN d.processing_status = 'failed' THEN 1 END) as failed_documents,
    AVG(d.confidence_score) as avg_confidence_score,
    COUNT(id_dates.id) as total_important_dates,
    COUNT(CASE WHEN id_dates.completed = false AND id_dates.due_date < CURRENT_DATE THEN 1 END) as overdue_dates,
    COUNT(CASE WHEN id_dates.completed = true THEN 1 END) as completed_dates,
    CASE 
        WHEN COUNT(id_dates.id) = 0 THEN 100.0
        ELSE ROUND(
            (COUNT(CASE WHEN id_dates.completed = true OR id_dates.due_date >= CURRENT_DATE THEN 1 END)::DECIMAL / 
             COUNT(id_dates.id)::DECIMAL) * 100, 2
        )
    END as compliance_score,
    s.created_at,
    s.updated_at
FROM students s
LEFT JOIN documents d ON s.id = d.student_id
LEFT JOIN important_dates id_dates ON s.id = id_dates.student_id
GROUP BY s.id, s.user_id, s.first_name, s.last_name, s.grade_level, s.school, s.created_at, s.updated_at;

-- Document Analytics Summary View
CREATE OR REPLACE VIEW document_analytics_summary AS
SELECT 
    d.user_id,
    d.document_type,
    d.processing_status,
    COUNT(*) as document_count,
    AVG(d.confidence_score) as avg_confidence_score,
    AVG(d.processing_cost) as avg_processing_cost,
    SUM(d.processing_cost) as total_processing_cost,
    AVG(d.file_size) as avg_file_size,
    MIN(d.created_at) as first_upload,
    MAX(d.created_at) as last_upload
FROM documents d
GROUP BY d.user_id, d.document_type, d.processing_status;

-- Monthly Usage Statistics View
CREATE OR REPLACE VIEW monthly_usage_stats AS
SELECT 
    user_id,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_uploads,
    COUNT(CASE WHEN document_type = 'iep' THEN 1 END) as iep_uploads,
    COUNT(CASE WHEN document_type = '504' THEN 1 END) as plan_504_uploads,
    COUNT(CASE WHEN document_type = 'other' THEN 1 END) as other_uploads,
    COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as successful_uploads,
    COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed_uploads,
    AVG(confidence_score) as avg_confidence_score,
    SUM(processing_cost) as total_cost
FROM documents
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- User Activity Summary Function
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_students INTEGER,
    total_documents INTEGER,
    total_events INTEGER,
    total_important_dates INTEGER,
    avg_confidence_score DECIMAL,
    compliance_score DECIMAL,
    last_activity_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM students WHERE user_id = p_user_id) as total_students,
        (SELECT COUNT(*)::INTEGER FROM documents WHERE user_id = p_user_id 
         AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
         AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)) as total_documents,
        (SELECT COUNT(*)::INTEGER FROM calendar_events WHERE user_id = p_user_id
         AND (p_start_date IS NULL OR start_date::DATE >= p_start_date)
         AND (p_end_date IS NULL OR start_date::DATE <= p_end_date)) as total_events,
        (SELECT COUNT(*)::INTEGER FROM important_dates id 
         JOIN students s ON id.student_id = s.id 
         WHERE s.user_id = p_user_id
         AND (p_start_date IS NULL OR id.due_date >= p_start_date)
         AND (p_end_date IS NULL OR id.due_date <= p_end_date)) as total_important_dates,
        (SELECT AVG(confidence_score) FROM documents WHERE user_id = p_user_id
         AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
         AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)) as avg_confidence_score,
        (SELECT AVG(compliance_score) FROM student_progress_summary WHERE user_id = p_user_id) as compliance_score,
        (SELECT MAX(GREATEST(
            COALESCE((SELECT MAX(created_at) FROM documents WHERE user_id = p_user_id), '1970-01-01'::TIMESTAMPTZ),
            COALESCE((SELECT MAX(created_at) FROM calendar_events WHERE user_id = p_user_id), '1970-01-01'::TIMESTAMPTZ),
            COALESCE((SELECT MAX(updated_at) FROM students WHERE user_id = p_user_id), '1970-01-01'::TIMESTAMPTZ)
        ))) as last_activity_date;
END;
$$ LANGUAGE plpgsql;

-- Document Processing Performance Function
CREATE OR REPLACE FUNCTION get_document_processing_stats(
    p_user_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_processed INTEGER,
    success_rate DECIMAL,
    avg_confidence_score DECIMAL,
    avg_processing_time_estimate DECIMAL,
    total_cost DECIMAL,
    documents_by_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_processed,
        ROUND(
            (COUNT(CASE WHEN processing_status = 'completed' THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 2
        ) as success_rate,
        AVG(confidence_score) as avg_confidence_score,
        AVG(file_size::DECIMAL / 1024) as avg_processing_time_estimate, -- Rough estimate based on file size
        SUM(processing_cost) as total_cost,
        jsonb_object_agg(
            document_type, 
            jsonb_build_object(
                'count', COUNT(*),
                'success_rate', ROUND((COUNT(CASE WHEN processing_status = 'completed' THEN 1 END)::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 2)
            )
        ) as documents_by_type
    FROM documents
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR created_at::DATE <= p_end_date);
END;
$$ LANGUAGE plpgsql;
