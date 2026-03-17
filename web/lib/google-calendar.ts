import { createAdminClient } from '@/lib/supabase/admin'

interface TokenRow {
  google_access_token: string | null
  google_refresh_token: string | null
  google_token_expiry: string | null
}

interface GoogleEvent {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

/** Fetch a valid access token for the user, refreshing if expired */
export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single()

  if (!data) return null
  const row = data as TokenRow
  if (!row.google_access_token || !row.google_refresh_token) return null

  // Check if token is still valid (with 60s buffer)
  const expiry = row.google_token_expiry ? new Date(row.google_token_expiry) : null
  const isExpired = !expiry || expiry.getTime() - Date.now() < 60_000

  if (!isExpired) return row.google_access_token

  // Refresh the token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: row.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  const tokens = await res.json() as { access_token: string; expires_in: number }

  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('users')
    .update({
      google_access_token: tokens.access_token,
      google_token_expiry: newExpiry,
    })
    .eq('id', userId)

  return tokens.access_token
}

/** Push a CasaAI appointment to Google Calendar. Returns the Google event ID. */
export async function pushAppointmentToGoogle(
  appointment: { title: string; starts_at: string; ends_at: string | null; notes: string | null },
  userId: string
): Promise<string | null> {
  const token = await getValidGoogleToken(userId)
  if (!token) return null

  const event: GoogleEvent = {
    summary: appointment.title,
    description: appointment.notes ?? undefined,
    start: {
      dateTime: appointment.starts_at,
      timeZone: 'Europe/Rome',
    },
    end: {
      dateTime: appointment.ends_at ?? new Date(new Date(appointment.starts_at).getTime() + 3600_000).toISOString(),
      timeZone: 'Europe/Rome',
    },
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!res.ok) return null
  const data = await res.json() as { id: string }
  return data.id ?? null
}

/** Update an existing Google Calendar event */
export async function updateGoogleEvent(
  eventId: string,
  appointment: { title: string; starts_at: string; ends_at: string | null; notes: string | null },
  userId: string
): Promise<void> {
  const token = await getValidGoogleToken(userId)
  if (!token) return

  const event: GoogleEvent = {
    summary: appointment.title,
    description: appointment.notes ?? undefined,
    start: {
      dateTime: appointment.starts_at,
      timeZone: 'Europe/Rome',
    },
    end: {
      dateTime: appointment.ends_at ?? new Date(new Date(appointment.starts_at).getTime() + 3600_000).toISOString(),
      timeZone: 'Europe/Rome',
    },
  }

  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })
}

/** Delete a Google Calendar event */
export async function deleteGoogleEvent(eventId: string, userId: string): Promise<void> {
  const token = await getValidGoogleToken(userId)
  if (!token) return

  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** Fetch Google Calendar events in a time range */
export async function fetchGoogleEvents(
  userId: string,
  from: string,
  to: string
): Promise<Array<{ id: string; summary: string; start: string; end: string; description?: string }>> {
  const token = await getValidGoogleToken(userId)
  if (!token) return []

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', from)
  url.searchParams.set('timeMax', to)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '50')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []
  const data = await res.json() as { items: Array<{ id: string; summary?: string; start?: { dateTime?: string }; end?: { dateTime?: string }; description?: string }> }

  return (data.items ?? [])
    .filter(e => e.start?.dateTime && e.end?.dateTime)
    .map(e => ({
      id: e.id,
      summary: e.summary ?? '(senza titolo)',
      start: e.start!.dateTime!,
      end: e.end!.dateTime!,
      description: e.description,
    }))
}
