import { google } from "googleapis"

export class GoogleCalendarService {
  private oauth2Client: any

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }

  async createEvent(
    calendarId: string,
    event: {
      summary: string
      description?: string
      start: { dateTime: string; timeZone: string }
      end: { dateTime: string; timeZone: string }
      attendees?: { email: string }[]
      location?: string
      reminders?: {
        useDefault: boolean
        overrides?: { method: string; minutes: number }[]
      }
    },
  ) {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      })

      return response.data
    } catch (error) {
      console.error("Error creating Google Calendar event:", error)
      throw new Error("Failed to create calendar event")
    }
  }

  async updateEvent(calendarId: string, eventId: string, event: any) {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
      })

      return response.data
    } catch (error) {
      console.error("Error updating Google Calendar event:", error)
      throw new Error("Failed to update calendar event")
    }
  }

  async deleteEvent(calendarId: string, eventId: string) {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
      })
    } catch (error) {
      console.error("Error deleting Google Calendar event:", error)
      throw new Error("Failed to delete calendar event")
    }
  }

  async listEvents(calendarId: string, timeMin?: string, timeMax?: string) {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
      })

      return response.data.items || []
    } catch (error) {
      console.error("Error listing Google Calendar events:", error)
      throw new Error("Failed to list calendar events")
    }
  }

  async getCalendars() {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    try {
      const response = await calendar.calendarList.list()
      return response.data.items || []
    } catch (error) {
      console.error("Error listing Google Calendars:", error)
      throw new Error("Failed to list calendars")
    }
  }
}
