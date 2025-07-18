-- Create calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT FALSE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('iep_review', 'evaluation', 'meeting', 'deadline', 'other')),
  reminder_settings JSONB DEFAULT '{"email_reminders": true, "reminder_times": [60, 1440], "notification_preferences": {"email": true, "browser": true}}'::jsonb,
  attendees TEXT[] DEFAULT '{}',
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT calendar_events_date_check CHECK (
    (end_date IS NULL) OR (start_date <= end_date)
  )
);

-- Create important dates table
CREATE TABLE IF NOT EXISTS important_dates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  date_type TEXT NOT NULL CHECK (date_type IN ('iep_annual', 'evaluation_due', 'transition_planning', 'eligibility_review')),
  due_date DATE NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_from_document UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_student_id ON calendar_events(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_important_dates_student_id ON important_dates(student_id);
CREATE INDEX IF NOT EXISTS idx_important_dates_due_date ON important_dates(due_date);
CREATE INDEX IF NOT EXISTS idx_important_dates_completed ON important_dates(completed);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;

-- Calendar events policies
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events" ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events" ON calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events" ON calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- Important dates policies (through student relationship)
CREATE POLICY "Users can view important dates for own students" ON important_dates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = important_dates.student_id 
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert important dates for own students" ON important_dates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = important_dates.student_id 
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update important dates for own students" ON important_dates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = important_dates.student_id 
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete important dates for own students" ON important_dates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = important_dates.student_id 
      AND students.user_id = auth.uid()
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_important_dates_updated_at BEFORE UPDATE ON important_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create important dates from student IEP dates
CREATE OR REPLACE FUNCTION create_important_dates_from_student()
RETURNS TRIGGER AS $$
BEGIN
  -- Create IEP annual review date if iep_date exists
  IF NEW.iep_date IS NOT NULL THEN
    INSERT INTO important_dates (student_id, date_type, due_date, description)
    VALUES (
      NEW.id,
      'iep_annual',
      NEW.iep_date + INTERVAL '1 year',
      'Annual IEP Review for ' || NEW.first_name || ' ' || NEW.last_name
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create evaluation due date if last_evaluation exists
  IF NEW.last_evaluation IS NOT NULL THEN
    INSERT INTO important_dates (student_id, date_type, due_date, description)
    VALUES (
      NEW.id,
      'evaluation_due',
      NEW.last_evaluation + INTERVAL '3 years',
      'Triennial Evaluation Due for ' || NEW.first_name || ' ' || NEW.last_name
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate important dates
CREATE TRIGGER trigger_create_important_dates_from_student
  AFTER INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION create_important_dates_from_student();
