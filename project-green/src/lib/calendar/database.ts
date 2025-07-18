import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { CalendarEvent, ImportantDate, CalendarStats } from "./types"

export class CalendarDatabase {
  private supabase = createServerSupabaseClient()

  async getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    let query = this.supabase
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
      .order("start_date", { ascending: true })

    if (startDate) {
      query = query.gte("start_date", startDate)
    }

    if (endDate) {
      query = query.lte("start_date", endDate)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch calendar events: ${error.message}`)
    }

    return data || []
  }

  async createCalendarEvent(event: Omit<CalendarEvent, "id" | "created_at" | "updated_at">): Promise<CalendarEvent> {
    const { data, error } = await this.supabase.from("calendar_events").insert(event).select().single()

    if (error) {
      throw new Error(`Failed to create calendar event: ${error.message}`)
    }

    return data
  }

  async updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data, error } = await this.supabase
      .from("calendar_events")
      .update(updates)
      .eq("id", eventId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update calendar event: ${error.message}`)
    }

    return data
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    const { error } = await this.supabase.from("calendar_events").delete().eq("id", eventId)

    if (error) {
      throw new Error(`Failed to delete calendar event: ${error.message}`)
    }
  }

  async getImportantDates(studentId?: string): Promise<ImportantDate[]> {
    let query = this.supabase
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
      .order("due_date", { ascending: true })

    if (studentId) {
      query = query.eq("student_id", studentId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch important dates: ${error.message}`)
    }

    return data || []
  }

  async createImportantDate(date: Omit<ImportantDate, "id" | "created_at" | "updated_at">): Promise<ImportantDate> {
    const { data, error } = await this.supabase.from("important_dates").insert(date).select().single()

    if (error) {
      throw new Error(`Failed to create important date: ${error.message}`)
    }

    return data
  }

  async updateImportantDate(dateId: string, updates: Partial<ImportantDate>): Promise<ImportantDate> {
    const { data, error } = await this.supabase
      .from("important_dates")
      .update(updates)
      .eq("id", dateId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update important date: ${error.message}`)
    }

    return data
  }

  async getCalendarStats(userId: string): Promise<CalendarStats> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get upcoming events (next 30 days)
    const upcomingEventsQuery = this.supabase
      .from("calendar_events")
      .select("id")
      .eq("user_id", userId)
      .gte("start_date", now.toISOString())
      .lte("start_date", new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())

    // Get this month's events
    const thisMonthEventsQuery = this.supabase
      .from("calendar_events")
      .select("id")
      .eq("user_id", userId)
      .gte("start_date", startOfMonth.toISOString())
      .lte("start_date", endOfMonth.toISOString())

    // Get overdue important dates
    const overdueDatesQuery = this.supabase
      .from("important_dates")
      .select("id, students!inner(user_id)")
      .eq("students.user_id", userId)
      .eq("completed", false)
      .lt("due_date", now.toISOString().split("T")[0])

    // Get pending reviews (important dates due in next 60 days)
    const pendingReviewsQuery = this.supabase
      .from("important_dates")
      .select("id, students!inner(user_id)")
      .eq("students.user_id", userId)
      .eq("completed", false)
      .gte("due_date", now.toISOString().split("T")[0])
      .lte("due_date", new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])

    const [upcomingEvents, thisMonthEvents, overdueDates, pendingReviews] = await Promise.all([
      upcomingEventsQuery,
      thisMonthEventsQuery,
      overdueDatesQuery,
      pendingReviewsQuery,
    ])

    return {
      upcoming_events: upcomingEvents.data?.length || 0,
      overdue_dates: overdueDates.data?.length || 0,
      this_month_events: thisMonthEvents.data?.length || 0,
      pending_reviews: pendingReviews.data?.length || 0,
    }
  }
}
