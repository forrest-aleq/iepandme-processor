export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_date: string
  end_date?: string
  all_day: boolean
  event_type: "iep_review" | "evaluation" | "meeting" | "deadline" | "other"
  student_id?: string
  user_id: string
  reminder_settings?: ReminderSettings
  attendees?: string[]
  location?: string
  created_at: string
  updated_at: string
}

export interface ReminderSettings {
  email_reminders: boolean
  reminder_times: number[] // minutes before event
  notification_preferences: {
    email: boolean
    browser: boolean
  }
}

export interface ImportantDate {
  id: string
  student_id: string
  date_type: "iep_annual" | "evaluation_due" | "transition_planning" | "eligibility_review"
  due_date: string
  description: string
  completed: boolean
  created_from_document?: string
  student?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface CalendarStats {
  upcoming_events: number
  overdue_dates: number
  this_month_events: number
  pending_reviews: number
}
