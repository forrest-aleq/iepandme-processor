import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { CalendarEvent, ImportantDate } from "./types"

export class ReminderService {
  private supabase = createServerSupabaseClient()

  async getUpcomingReminders(userId: string): Promise<{
    events: CalendarEvent[]
    importantDates: ImportantDate[]
  }> {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get events with reminders due
    const { data: events } = await this.supabase
      .from("calendar_events")
      .select(`
        *,
        students (
          id,
          first_name,
          last_name
        )
      `)
      .eq("user_id", userId)
      .gte("start_date", now.toISOString())
      .lte("start_date", nextWeek.toISOString())

    // Get important dates due soon
    const { data: importantDates } = await this.supabase
      .from("important_dates")
      .select(`
        *,
        students (
          id,
          first_name,
          last_name,
          user_id
        )
      `)
      .eq("students.user_id", userId)
      .eq("completed", false)
      .gte("due_date", now.toISOString().split("T")[0])
      .lte("due_date", nextWeek.toISOString().split("T")[0])

    return {
      events: events || [],
      importantDates: importantDates || [],
    }
  }

  async createEventReminder(eventId: string, reminderTime: number): Promise<void> {
    // This would integrate with email service or notification system
    // For now, we'll just log the reminder
    console.log(`Reminder created for event ${eventId} at ${reminderTime} minutes before`)
  }

  async sendDailyDigest(userId: string): Promise<void> {
    const reminders = await this.getUpcomingReminders(userId)

    if (reminders.events.length === 0 && reminders.importantDates.length === 0) {
      return
    }

    // This would send an email digest
    console.log(`Daily digest for user ${userId}:`, {
      upcomingEvents: reminders.events.length,
      upcomingDates: reminders.importantDates.length,
    })
  }
}
