#!/bin/bash

# IEPandMe Calendar Integration Setup Script - 2025
# Sets up Google Calendar and Microsoft Graph API integrations

set -e

echo "📅 Setting up calendar integrations (Google & Microsoft)..."

# Check for required tools
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm is required. Please run the project initialization script first."
        exit 1
    fi
    
    echo "✅ Requirements check passed"
}

# Install calendar dependencies
install_calendar_packages() {
    echo "📦 Installing calendar integration packages..."
    
    # Google Calendar dependencies
    pnpm add \
        googleapis \
        google-auth-library \
        ical-generator \
        node-ical \
        uuid
    
    # Microsoft Graph dependencies
    pnpm add \
        @azure/msal-node \
        @microsoft/microsoft-graph-client \
        isomorphic-fetch
    
    # Type definitions
    pnpm add -D \
        @types/uuid \
        @types/node-ical
    
    echo "✅ Calendar packages installed"
}

# Create calendar configuration
create_calendar_config() {
    echo "⚙️ Creating calendar configuration..."
    
    mkdir -p src/lib/calendar
    
    cat > src/lib/calendar/config.ts << 'EOF'
// Calendar integration configuration

export const CALENDAR_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  },
  
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/microsoft/callback',
    scopes: [
      'https://graph.microsoft.com/calendars.readwrite',
      'https://graph.microsoft.com/user.read',
    ],
  },
  
  // Default calendar settings
  defaults: {
    timeZone: 'America/New_York',
    reminderMinutes: [15, 60], // 15 minutes and 1 hour before
    defaultDuration: 60, // 1 hour default for meetings
    workingHours: {
      start: '08:00',
      end: '17:00',
    },
  },
  
  // Event categories for IEP tasks
  eventCategories: {
    IEP_REVIEW: {
      color: '#4285f4', // Blue
      duration: 120, // 2 hours
      reminders: [24 * 60, 60, 15], // 1 day, 1 hour, 15 minutes
    },
    GOAL_REVIEW: {
      color: '#34a853', // Green
      duration: 60, // 1 hour
      reminders: [60, 15], // 1 hour, 15 minutes
    },
    SERVICE_DELIVERY: {
      color: '#fbbc04', // Yellow
      duration: 30, // 30 minutes
      reminders: [15], // 15 minutes
    },
    MEETING: {
      color: '#ea4335', // Red
      duration: 90, // 1.5 hours
      reminders: [60, 15], // 1 hour, 15 minutes
    },
    ASSESSMENT: {
      color: '#9c27b0', // Purple
      duration: 120, // 2 hours
      reminders: [24 * 60, 60], // 1 day, 1 hour
    },
    PARENT_CONTACT: {
      color: '#ff9800', // Orange
      duration: 30, // 30 minutes
      reminders: [15], // 15 minutes
    },
  },
} as const

export type CalendarProvider = 'google' | 'microsoft'
export type EventCategory = keyof typeof CALENDAR_CONFIG.eventCategories
EOF

    echo "✅ Calendar configuration created"
}

# Create Google Calendar integration
create_google_calendar() {
    echo "🔧 Creating Google Calendar integration..."
    
    cat > src/lib/calendar/google.ts << 'EOF'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { CALENDAR_CONFIG } from './config'
import { prisma } from '@/lib/db/client'
import type { CalendarEvent, CalendarIntegration } from './types'

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      CALENDAR_CONFIG.google.clientId,
      CALENDAR_CONFIG.google.clientSecret,
      CALENDAR_CONFIG.google.redirectUri
    )
  }

  // Get authorization URL
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: CALENDAR_CONFIG.google.scopes,
      prompt: 'consent',
    })
  }

  // Exchange authorization code for tokens
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getAccessToken(code)
    return tokens
  }

  // Set credentials for authenticated requests
  setCredentials(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }

  // Get user's calendar list
  async getCalendars() {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
    
    const response = await calendar.calendarList.list({
      maxResults: 50,
    })

    return response.data.items?.map(cal => ({
      id: cal.id!,
      name: cal.summary!,
      description: cal.description,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    })) || []
  }

  // Create calendar event
  async createEvent(event: CalendarEvent, calendarId = 'primary') {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
    
    const eventData = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone || CALENDAR_CONFIG.defaults.timeZone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone || CALENDAR_CONFIG.defaults.timeZone,
      },
      location: event.location,
      attendees: event.attendees?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: event.reminders?.map(minutes => ({
          method: 'popup',
          minutes,
        })) || [{ method: 'popup', minutes: 15 }],
      },
      colorId: event.colorId,
    }

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventData,
    })

    return {
      id: response.data.id!,
      htmlLink: response.data.htmlLink!,
      hangoutLink: response.data.hangoutLink,
    }
  }

  // Update calendar event
  async updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId = 'primary') {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
    
    const eventData: any = {}
    
    if (event.title) eventData.summary = event.title
    if (event.description) eventData.description = event.description
    if (event.location) eventData.location = event.location
    
    if (event.startTime && event.endTime) {
      eventData.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone || CALENDAR_CONFIG.defaults.timeZone,
      }
      eventData.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone || CALENDAR_CONFIG.defaults.timeZone,
      }
    }

    if (event.attendees) {
      eventData.attendees = event.attendees.map(email => ({ email }))
    }

    if (event.reminders) {
      eventData.reminders = {
        useDefault: false,
        overrides: event.reminders.map(minutes => ({
          method: 'popup',
          minutes,
        })),
      }
    }

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: eventData,
    })

    return {
      id: response.data.id!,
      htmlLink: response.data.htmlLink!,
    }
  }

  // Delete calendar event
  async deleteEvent(eventId: string, calendarId = 'primary') {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
    
    await calendar.events.delete({
      calendarId,
      eventId,
    })
  }

  // Get events in date range
  async getEvents(startDate: Date, endDate: Date, calendarId = 'primary') {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    return response.data.items?.map(event => ({
      id: event.id!,
      title: event.summary!,
      description: event.description,
      startTime: new Date(event.start?.dateTime || event.start?.date!),
      endTime: new Date(event.end?.dateTime || event.end?.date!),
      location: event.location,
      htmlLink: event.htmlLink,
    })) || []
  }

  // Get user profile
  async getUserProfile() {
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client })
    const response = await oauth2.userinfo.get()
    
    return {
      id: response.data.id!,
      email: response.data.email!,
      name: response.data.name!,
      picture: response.data.picture,
    }
  }

  // Refresh access token
  async refreshTokens() {
    const { credentials } = await this.oauth2Client.refreshAccessToken()
    return credentials
  }
}

// Helper functions for database operations
export async function saveGoogleIntegration(
  userId: string,
  tenantId: string,
  tokens: any,
  userProfile: any
) {
  return await prisma.calendarIntegration.upsert({
    where: {
      tenantId_provider_providerUserId: {
        tenantId,
        provider: 'GOOGLE',
        providerUserId: userProfile.id,
      },
    },
    update: {
      email: userProfile.email,
      displayName: userProfile.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      lastSyncAt: new Date(),
    },
    create: {
      tenantId,
      userId,
      provider: 'GOOGLE',
      providerUserId: userProfile.id,
      email: userProfile.email,
      displayName: userProfile.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      isActive: true,
      syncEnabled: true,
    },
  })
}

export async function getGoogleIntegration(tenantId: string, userId: string) {
  return await prisma.calendarIntegration.findFirst({
    where: {
      tenantId,
      userId,
      provider: 'GOOGLE',
      isActive: true,
    },
  })
}
EOF

    echo "✅ Google Calendar integration created"
}

# Create Microsoft Graph integration
create_microsoft_graph() {
    echo "🔧 Creating Microsoft Graph integration..."
    
    cat > src/lib/calendar/microsoft.ts << 'EOF'
import { ConfidentialClientApplication } from '@azure/msal-node'
import { Client } from '@microsoft/microsoft-graph-client'
import { CALENDAR_CONFIG } from './config'
import { prisma } from '@/lib/db/client'
import type { CalendarEvent } from './types'

export class MicrosoftCalendarService {
  private msalClient: ConfidentialClientApplication
  private graphClient: Client | null = null

  constructor() {
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: CALENDAR_CONFIG.microsoft.clientId,
        clientSecret: CALENDAR_CONFIG.microsoft.clientSecret,
        authority: `https://login.microsoftonline.com/${CALENDAR_CONFIG.microsoft.tenantId}`,
      },
    })
  }

  // Get authorization URL
  getAuthUrl(): string {
    const authCodeUrlParameters = {
      scopes: CALENDAR_CONFIG.microsoft.scopes,
      redirectUri: CALENDAR_CONFIG.microsoft.redirectUri,
    }

    return this.msalClient.getAuthCodeUrl(authCodeUrlParameters)
  }

  // Exchange authorization code for tokens
  async getTokens(code: string) {
    const tokenRequest = {
      code,
      scopes: CALENDAR_CONFIG.microsoft.scopes,
      redirectUri: CALENDAR_CONFIG.microsoft.redirectUri,
    }

    const response = await this.msalClient.acquireTokenByCode(tokenRequest)
    return response
  }

  // Set access token and initialize Graph client
  setAccessToken(accessToken: string) {
    this.graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      },
    })
  }

  // Get user's calendars
  async getCalendars() {
    if (!this.graphClient) throw new Error('Graph client not initialized')

    const calendars = await this.graphClient.api('/me/calendars').get()
    
    return calendars.value.map((cal: any) => ({
      id: cal.id,
      name: cal.name,
      description: cal.description,
      primary: cal.isDefaultCalendar || false,
      canEdit: cal.canEdit,
    }))
  }

  // Create calendar event
  async createEvent(event: CalendarEvent, calendarId?: string) {
    if (!this.graphClient) throw new Error('Graph client not initialized')

    const endpoint = calendarId 
      ? `/me/calendars/${calendarId}/events`
      : '/me/calendar/events'

    const eventData = {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || '',
      },
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone || CALENDAR_CONFIG.defaults.timeZone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone || CALENDAR_CONFIG.defaults.timeZone,
      },
      location: event.location ? {
        displayName: event.location,
      } : undefined,
      attendees: event.attendees?.map(email => ({
        emailAddress: { address: email, name: email },
        type: 'required',
      })),
      reminderMinutesBeforeStart: event.reminders?.[0] || 15,
      isReminderOn: true,
    }

    const response = await this.graphClient.api(endpoint).post(eventData)
    
    return {
      id: response.id,
      webLink: response.webLink,
      onlineMeetingUrl: response.onlineMeeting?.joinUrl,
    }
  }

  // Update calendar event
  async updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId?: string) {
    if (!this.graphClient) throw new Error('Graph client not initialized')

    const endpoint = calendarId
      ? `/me/calendars/${calendarId}/events/${eventId}`
      : `/me/calendar/events/${eventId}`

    const eventData: any = {}
    
    if (event.title) eventData.subject = event.title
    if (event.description) {
      eventData.body = {
        contentType: 'HTML',
        content: event.description,
      }
    }
    if (event.location) {
      eventData.location = { displayName: event.location }
    }
    
    if (event.startTime && event.endTime) {
      eventData.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone || CALENDAR_CONFIG.defaults.timeZone,
      }
      eventData.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone || CALENDAR_CONFIG.defaults.timeZone,
      }
    }

    if (event.attendees) {
      eventData.attendees = event.attendees.map(email => ({
        emailAddress: { address: email, name: email },
        type: 'required',
      }))
    }

    if (event.reminders) {
      eventData.reminderMinutesBeforeStart = event.reminders[0]
      eventData.isReminderOn = true
    }

    const response = await this.graphClient.api(endpoint).patch(eventData)
    
    return {
      id: response.id,
      webLink: response.webLink,
    }
  }

  // Delete calendar event
  async deleteEvent(eventId: string, calendarId?: string) {
    if (!this.graphClient) throw new Error('Graph client not initialized')

    const endpoint = calendarId
      ? `/me/calendars/${calendarId}/events/${eventId}`
      : `/me/calendar/events/${eventId}`

    await this.graphClient.api(endpoint).delete()
  }

  // Get events in date range
  async getEvents(startDate: Date, endDate: Date, calendarId?: string) {
    if (!this.graphClient) throw new Error('Graph client not initialized')

    const endpoint = calendarId
      ? `/me/calendars/${calendarId}/calendarView`
      : '/me/calendar/calendarView'

    const events = await this.graphClient
      .api(endpoint)
      .query({
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
      })
      .get()

    return events.value.map((event: any) => ({
      id: event.id,
      title: event.subject,
      description: event.body?.content,
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      location: event.location?.displayName,
      webLink: event.webLink,
    }))
  }

  // Get user profile
  async getUserProfile() {
    if (!this.graphClient) throw new Error('Graph client not initialized')

    const user = await this.graphClient.api('/me').get()
    
    return {
      id: user.id,
      email: user.mail || user.userPrincipalName,
      name: user.displayName,
      jobTitle: user.jobTitle,
    }
  }

  // Refresh access token
  async refreshTokens(refreshToken: string) {
    const tokenRequest = {
      scopes: CALENDAR_CONFIG.microsoft.scopes,
      refreshToken,
    }

    const response = await this.msalClient.acquireTokenByRefreshToken(tokenRequest)
    return response
  }
}

// Helper functions for database operations
export async function saveMicrosoftIntegration(
  userId: string,
  tenantId: string,
  tokenResponse: any,
  userProfile: any
) {
  return await prisma.calendarIntegration.upsert({
    where: {
      tenantId_provider_providerUserId: {
        tenantId,
        provider: 'MICROSOFT',
        providerUserId: userProfile.id,
      },
    },
    update: {
      email: userProfile.email,
      displayName: userProfile.name,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenExpiry: tokenResponse.expiresOn,
      lastSyncAt: new Date(),
    },
    create: {
      tenantId,
      userId,
      provider: 'MICROSOFT',
      providerUserId: userProfile.id,
      email: userProfile.email,
      displayName: userProfile.name,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenExpiry: tokenResponse.expiresOn,
      isActive: true,
      syncEnabled: true,
    },
  })
}

export async function getMicrosoftIntegration(tenantId: string, userId: string) {
  return await prisma.calendarIntegration.findFirst({
    where: {
      tenantId,
      userId,
      provider: 'MICROSOFT',
      isActive: true,
    },
  })
}
EOF

    echo "✅ Microsoft Graph integration created"
}

# Create calendar types and utilities
create_calendar_types() {
    echo "📝 Creating calendar types and utilities..."
    
    cat > src/lib/calendar/types.ts << 'EOF'
// Calendar integration types

export interface CalendarEvent {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  attendees?: string[]
  reminders?: number[] // minutes before event
  timeZone?: string
  colorId?: string
  category?: string
  isAllDay?: boolean
}

export interface CalendarInfo {
  id: string
  name: string
  description?: string
  primary: boolean
  accessRole?: string
  canEdit?: boolean
}

export interface UserProfile {
  id: string
  email: string
  name: string
  picture?: string
  jobTitle?: string
}

export interface CalendarIntegration {
  id: string
  provider: 'google' | 'microsoft'
  providerUserId: string
  email: string
  displayName?: string
  accessToken: string
  refreshToken?: string
  tokenExpiry?: Date
  isActive: boolean
  syncEnabled: boolean
  defaultCalendarId?: string
  lastSyncAt?: Date
}

export interface TaskToEventOptions {
  calendarId?: string
  includePrepTime?: boolean
  addReminders?: boolean
  inviteParticipants?: boolean
  blockCalendar?: boolean
}

export interface SyncResult {
  success: boolean
  eventsCreated: number
  eventsUpdated: number
  eventsDeleted: number
  errors: string[]
}
EOF

    cat > src/lib/calendar/utils.ts << 'EOF'
import { v4 as uuidv4 } from 'uuid'
import ical from 'ical-generator'
import { CALENDAR_CONFIG, type EventCategory } from './config'
import type { CalendarEvent, TaskToEventOptions } from './types'
import { Task, Goal, Service, Student } from '@prisma/client'

// Convert IEP task to calendar event
export function taskToCalendarEvent(
  task: Task & {
    student: Pick<Student, 'name' | 'school'>
    goal?: Pick<Goal, 'goalArea'> | null
    service?: Pick<Service, 'serviceType'> | null
  },
  options: TaskToEventOptions = {}
): CalendarEvent {
  const category = task.type as EventCategory
  const categoryConfig = CALENDAR_CONFIG.eventCategories[category]
  
  // Calculate event duration
  const duration = task.duration || categoryConfig.duration
  const startTime = task.dueDate
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000)
  
  // Build event title
  let title = task.title
  if (task.student?.name) {
    title = `${task.title} - ${task.student.name}`
  }
  
  // Build description
  let description = task.description || ''
  if (task.student?.school) {
    description += `\\n\\nSchool: ${task.student.school}`
  }
  if (task.goal?.goalArea) {
    description += `\\n\\nGoal Area: ${task.goal.goalArea}`
  }
  if (task.service?.serviceType) {
    description += `\\n\\nService: ${task.service.serviceType}`
  }
  
  // Add preparation time if requested
  if (options.includePrepTime && category !== 'SERVICE_DELIVERY') {
    const prepTime = Math.min(30, duration / 2) // 30 min max prep time
    startTime.setTime(startTime.getTime() - prepTime * 60 * 1000)
    description += `\\n\\nNote: Includes ${prepTime} minutes preparation time`
  }
  
  return {
    title,
    description: description.trim(),
    startTime,
    endTime,
    location: task.student?.school,
    reminders: options.addReminders ? categoryConfig.reminders : undefined,
    colorId: categoryConfig.color,
    category: category,
  }
}

// Generate .ics file content
export function generateICSFile(events: CalendarEvent[], title = 'IEP Tasks'): string {
  const calendar = ical({ name: title, timezone: CALENDAR_CONFIG.defaults.timeZone })
  
  events.forEach((event) => {
    calendar.createEvent({
      start: event.startTime,
      end: event.endTime,
      summary: event.title,
      description: event.description,
      location: event.location,
      uid: uuidv4(),
      alarms: event.reminders?.map(minutes => ({
        type: 'display',
        trigger: minutes * 60, // convert to seconds
      })),
    })
  })
  
  return calendar.toString()
}

// Parse ICS file content
export function parseICSFile(icsContent: string): CalendarEvent[] {
  const ical = require('node-ical')
  const events: CalendarEvent[] = []
  
  const parsed = ical.parseICS(icsContent)
  
  for (const event of Object.values(parsed)) {
    if (event.type === 'VEVENT') {
      events.push({
        title: event.summary || 'Untitled Event',
        description: event.description,
        startTime: new Date(event.start),
        endTime: new Date(event.end),
        location: event.location,
        isAllDay: event.start.length === 8, // YYYYMMDD format indicates all-day
      })
    }
  }
  
  return events
}

// Check for calendar conflicts
export function findConflicts(
  newEvent: CalendarEvent,
  existingEvents: CalendarEvent[]
): CalendarEvent[] {
  return existingEvents.filter(event => {
    const newStart = newEvent.startTime.getTime()
    const newEnd = newEvent.endTime.getTime()
    const existingStart = event.startTime.getTime()
    const existingEnd = event.endTime.getTime()
    
    // Check for overlap
    return (newStart < existingEnd && newEnd > existingStart)
  })
}

// Suggest alternative times for conflicted events
export function suggestAlternativeTimes(
  originalEvent: CalendarEvent,
  conflicts: CalendarEvent[],
  workingHours = CALENDAR_CONFIG.defaults.workingHours
): Date[] {
  const suggestions: Date[] = []
  const eventDuration = originalEvent.endTime.getTime() - originalEvent.startTime.getTime()
  
  // Try the next few days
  for (let days = 0; days < 7; days++) {
    const baseDate = new Date(originalEvent.startTime)
    baseDate.setDate(baseDate.getDate() + days)
    
    // Try different times during working hours
    const workStart = new Date(baseDate)
    const [startHour, startMin] = workingHours.start.split(':').map(Number)
    workStart.setHours(startHour, startMin, 0, 0)
    
    const workEnd = new Date(baseDate)
    const [endHour, endMin] = workingHours.end.split(':').map(Number)
    workEnd.setHours(endHour, endMin, 0, 0)
    
    // Try every 30 minutes
    for (let time = workStart.getTime(); time + eventDuration <= workEnd.getTime(); time += 30 * 60 * 1000) {
      const proposedStart = new Date(time)
      const proposedEnd = new Date(time + eventDuration)
      
      const proposedEvent = {
        ...originalEvent,
        startTime: proposedStart,
        endTime: proposedEnd,
      }
      
      // Check if this time conflicts with existing events
      const hasConflict = findConflicts(proposedEvent, conflicts).length > 0
      
      if (!hasConflict) {
        suggestions.push(proposedStart)
        if (suggestions.length >= 3) break // Limit to 3 suggestions per day
      }
    }
    
    if (suggestions.length >= 10) break // Limit total suggestions
  }
  
  return suggestions
}

// Format duration for display
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
}

// Get next business day
export function getNextBusinessDay(date: Date): Date {
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  
  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1)
  }
  
  return nextDay
}

// Check if date is a business day
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5 // Monday to Friday
}

// Get business days between two dates
export function getBusinessDaysBetween(startDate: Date, endDate: Date): Date[] {
  const businessDays: Date[] = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    if (isBusinessDay(current)) {
      businessDays.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }
  
  return businessDays
}
EOF

    echo "✅ Calendar types and utilities created"
}

# Create calendar API routes
create_calendar_routes() {
    echo "🔄 Creating calendar API routes..."
    
    mkdir -p src/app/api/calendar
    
    # Google Calendar OAuth
    cat > src/app/api/calendar/google/auth/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/calendar/google'

export async function GET(request: NextRequest) {
  try {
    const googleService = new GoogleCalendarService()
    const authUrl = googleService.getAuthUrl()
    
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating Google Calendar auth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    )
  }
}
EOF

    cat > src/app/api/calendar/google/callback/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleCalendarService, saveGoogleIntegration } from '@/lib/calendar/google'
import { getCurrentTenantId } from '@/lib/db/tenant'
import { auth } from '@supabase/auth-helpers-nextjs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    if (error) {
      return NextResponse.redirect(new URL('/dashboard/calendar?error=access_denied', request.url))
    }
    
    if (!code) {
      return NextResponse.redirect(new URL('/dashboard/calendar?error=no_code', request.url))
    }
    
    const { data: { user } } = await auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    const tenantId = await getCurrentTenantId()
    if (!tenantId) {
      return NextResponse.redirect(new URL('/dashboard/calendar?error=no_tenant', request.url))
    }
    
    const googleService = new GoogleCalendarService()
    const tokens = await googleService.getTokens(code)
    
    googleService.setCredentials(tokens.access_token!, tokens.refresh_token)
    const userProfile = await googleService.getUserProfile()
    
    await saveGoogleIntegration(user.id, tenantId, tokens, userProfile)
    
    return NextResponse.redirect(new URL('/dashboard/calendar?success=google', request.url))
  } catch (error) {
    console.error('Error handling Google Calendar callback:', error)
    return NextResponse.redirect(new URL('/dashboard/calendar?error=callback_failed', request.url))
  }
}
EOF

    # Microsoft Calendar OAuth
    cat > src/app/api/calendar/microsoft/auth/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { MicrosoftCalendarService } from '@/lib/calendar/microsoft'

export async function GET(request: NextRequest) {
  try {
    const microsoftService = new MicrosoftCalendarService()
    const authUrl = await microsoftService.getAuthUrl()
    
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating Microsoft Calendar auth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    )
  }
}
EOF

    cat > src/app/api/calendar/microsoft/callback/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { MicrosoftCalendarService, saveMicrosoftIntegration } from '@/lib/calendar/microsoft'
import { getCurrentTenantId } from '@/lib/db/tenant'
import { auth } from '@supabase/auth-helpers-nextjs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    if (error) {
      return NextResponse.redirect(new URL('/dashboard/calendar?error=access_denied', request.url))
    }
    
    if (!code) {
      return NextResponse.redirect(new URL('/dashboard/calendar?error=no_code', request.url))
    }
    
    const { data: { user } } = await auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    const tenantId = await getCurrentTenantId()
    if (!tenantId) {
      return NextResponse.redirect(new URL('/dashboard/calendar?error=no_tenant', request.url))
    }
    
    const microsoftService = new MicrosoftCalendarService()
    const tokenResponse = await microsoftService.getTokens(code)
    
    microsoftService.setAccessToken(tokenResponse.accessToken)
    const userProfile = await microsoftService.getUserProfile()
    
    await saveMicrosoftIntegration(user.id, tenantId, tokenResponse, userProfile)
    
    return NextResponse.redirect(new URL('/dashboard/calendar?success=microsoft', request.url))
  } catch (error) {
    console.error('Error handling Microsoft Calendar callback:', error)
    return NextResponse.redirect(new URL('/dashboard/calendar?error=callback_failed', request.url))
  }
}
EOF

    # Calendar sync route
    cat > src/app/api/calendar/sync/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getCurrentTenantId } from '@/lib/db/tenant'
import { auth } from '@supabase/auth-helpers-nextjs'
import { GoogleCalendarService } from '@/lib/calendar/google'
import { MicrosoftCalendarService } from '@/lib/calendar/microsoft'
import { taskToCalendarEvent } from '@/lib/calendar/utils'

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const tenantId = await getCurrentTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }
    
    const { taskIds, options = {} } = await request.json()
    
    // Get tasks to sync
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        tenantId,
        isCalendarSynced: false,
      },
      include: {
        student: { select: { name: true, school: true } },
        goal: { select: { goalArea: true } },
        service: { select: { serviceType: true } },
      },
    })
    
    if (tasks.length === 0) {
      return NextResponse.json({ message: 'No tasks to sync' })
    }
    
    // Get active calendar integrations
    const integrations = await prisma.calendarIntegration.findMany({
      where: {
        tenantId,
        userId: user.id,
        isActive: true,
        syncEnabled: true,
      },
    })
    
    const results = {
      eventsCreated: 0,
      errors: [] as string[],
    }
    
    // Sync to each integrated calendar
    for (const integration of integrations) {
      try {
        if (integration.provider === 'GOOGLE') {
          const googleService = new GoogleCalendarService()
          googleService.setCredentials(integration.accessToken, integration.refreshToken || undefined)
          
          for (const task of tasks) {
            try {
              const event = taskToCalendarEvent(task, options)
              const createdEvent = await googleService.createEvent(event, integration.defaultCalendarId)
              
              // Update task with Google event ID
              await prisma.task.update({
                where: { id: task.id },
                data: {
                  googleEventId: createdEvent.id,
                  isCalendarSynced: true,
                },
              })
              
              results.eventsCreated++
            } catch (error) {
              results.errors.push(`Failed to create Google event for task ${task.id}: ${error}`)
            }
          }
        } else if (integration.provider === 'MICROSOFT') {
          const microsoftService = new MicrosoftCalendarService()
          microsoftService.setAccessToken(integration.accessToken)
          
          for (const task of tasks) {
            try {
              const event = taskToCalendarEvent(task, options)
              const createdEvent = await microsoftService.createEvent(event, integration.defaultCalendarId)
              
              // Update task with Outlook event ID
              await prisma.task.update({
                where: { id: task.id },
                data: {
                  outlookEventId: createdEvent.id,
                  isCalendarSynced: true,
                },
              })
              
              results.eventsCreated++
            } catch (error) {
              results.errors.push(`Failed to create Microsoft event for task ${task.id}: ${error}`)
            }
          }
        }
      } catch (error) {
        results.errors.push(`Integration error for ${integration.provider}: ${error}`)
      }
    }
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Error syncing calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendar events' },
      { status: 500 }
    )
  }
}
EOF

    echo "✅ Calendar API routes created"
}

# Create calendar setup documentation
create_calendar_docs() {
    echo "📚 Creating calendar setup documentation..."
    
    cat > CALENDAR_SETUP.md << 'EOF'
# Calendar Integration Setup Guide

This guide explains how to set up Google Calendar and Microsoft Graph API integrations for IEPandMe.

## Prerequisites

1. Google Cloud Console account
2. Microsoft Azure account (for Graph API)
3. Domain verification for production use

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure OAuth consent screen:
   - Choose "External" for testing
   - Fill in app information
   - Add scopes: `calendar`, `calendar.events`, `userinfo.email`, `userinfo.profile`
   - Add test users for development
4. Create OAuth client:
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:3000/api/calendar/google/callback`
   - For production: `https://yourdomain.com/api/calendar/google/callback`

### 3. Environment Variables

Add to your `.env.local`:
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback
```

## Microsoft Graph API Setup

### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Configure application:
   - Name: "IEPandMe Calendar Integration"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `http://localhost:3000/api/calendar/microsoft/callback`

### 2. Configure API Permissions

1. Go to "API permissions"
2. Add permissions:
   - Microsoft Graph > Delegated permissions
   - Add: `Calendars.ReadWrite`, `User.Read`
3. Grant admin consent (for organizational accounts)

### 3. Create Client Secret

1. Go to "Certificates & secrets"
2. Create new client secret
3. Copy the secret value (shown only once)

### 4. Environment Variables

Add to your `.env.local`:
```
MICROSOFT_CLIENT_ID=your_azure_app_id
MICROSOFT_CLIENT_SECRET=your_azure_client_secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/microsoft/callback
```

## Testing the Integration

### 1. Start Development Server

```bash
pnpm dev
```

### 2. Test OAuth Flows

1. Navigate to `/dashboard/calendar`
2. Click "Connect Google Calendar"
3. Complete OAuth flow
4. Repeat for Microsoft Calendar

### 3. Test Event Creation

1. Create a task in the dashboard
2. Use "Sync to Calendar" feature
3. Verify events appear in connected calendars

## Production Configuration

### 1. Domain Verification

- **Google**: Verify domain ownership in Google Search Console
- **Microsoft**: Configure proper redirect URIs in Azure

### 2. OAuth Consent Review

- **Google**: Submit app for verification if using sensitive scopes
- **Microsoft**: Configure proper publisher domain

### 3. Security Considerations

- Use HTTPS in production
- Implement proper token refresh logic
- Store tokens securely in database
- Monitor API usage limits

## API Usage Limits

### Google Calendar API
- 1,000,000 requests per day
- 100 requests per 100 seconds per user
- Quota can be increased by request

### Microsoft Graph API
- 10,000 requests per 10 minutes per app
- Throttling applies based on combination of tenant, user, and app

## Common Issues

### 1. "Invalid Grant" Errors
- Check redirect URI matches exactly
- Ensure clock synchronization
- Refresh tokens may expire

### 2. Permission Denied
- Verify API permissions are granted
- Check user has calendar access
- Confirm scopes in OAuth request

### 3. Token Expiry
- Implement automatic token refresh
- Handle refresh token expiry gracefully
- Re-authenticate users when needed

## Calendar Features

### Supported Operations
- ✅ Create events from IEP tasks
- ✅ Update existing events
- ✅ Delete events
- ✅ List calendars
- ✅ Check for conflicts
- ✅ Set reminders
- ✅ Add attendees

### Event Categories
- **IEP Reviews**: 2-hour meetings with 24h, 1h, 15min reminders
- **Goal Reviews**: 1-hour sessions with 1h, 15min reminders
- **Service Delivery**: 30-minute sessions with 15min reminders
- **Meetings**: 1.5-hour meetings with 1h, 15min reminders
- **Assessments**: 2-hour sessions with 24h, 1h reminders
- **Parent Contacts**: 30-minute calls with 15min reminders

### Export Options
- ✅ .ics file generation
- ✅ Calendar-specific exports
- ✅ Bulk event creation
- ✅ Recurring event support (future)

## Troubleshooting

### Enable Debug Logging
Add to `.env.local`:
```
DEBUG_CALENDAR=true
```

### Common Error Codes
- `401`: Authentication failure - check tokens
- `403`: Permission denied - verify scopes
- `429`: Rate limit exceeded - implement backoff
- `404`: Calendar/event not found - check IDs

### Support Resources
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Microsoft Graph Calendar API](https://docs.microsoft.com/en-us/graph/api/resources/calendar)
- [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
EOF

    echo "✅ Calendar setup documentation created"
}

# Main execution
main() {
    echo "🎯 Starting calendar integration setup..."
    
    check_requirements
    install_calendar_packages
    create_calendar_config
    create_google_calendar
    create_microsoft_graph
    create_calendar_types
    create_calendar_routes
    create_calendar_docs
    
    echo ""
    echo "🎉 Calendar integration setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Set up Google Cloud Console project (see CALENDAR_SETUP.md)"
    echo "2. Set up Microsoft Azure app registration"
    echo "3. Add OAuth credentials to .env.local"
    echo "4. Test integration in development environment"
    echo ""
    echo "🔗 OAuth Setup URLs:"
    echo "  Google Console: https://console.cloud.google.com/"
    echo "  Azure Portal: https://portal.azure.com/"
    echo ""
    echo "📚 Documentation:"
    echo "  See CALENDAR_SETUP.md for detailed setup instructions"
    echo "  OAuth flows available at /api/calendar/{provider}/auth"
    echo ""
    echo "🧪 Test the integration:"
    echo "  1. Start dev server: pnpm dev"
    echo "  2. Visit /dashboard/calendar"
    echo "  3. Connect your calendar accounts"
    echo "  4. Create tasks and sync to calendar"
}

main "$@"