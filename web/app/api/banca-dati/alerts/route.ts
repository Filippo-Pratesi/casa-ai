import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Days without event before an alert is triggered
const STALE_DAYS = 30

// POST /api/banca-dati/alerts — generate smart alerts for the workspace
// Returns count of notifications created
export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const cutoffDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const todayStr = new Date().toISOString().split('T')[0]

  // 1. Find properties in conosciuto/incarico with last event older than cutoff
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staleProps } = await (admin as any)
    .from('properties')
    .select('id, address, city, stage, agent_id, workspace_id')
    .eq('workspace_id', profile.workspace_id)
    .in('stage', ['conosciuto', 'incarico'])

  const stalePropertyIds: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const prop of (staleProps ?? []) as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentEvents } = await (admin as any)
      .from('property_events')
      .select('id')
      .eq('property_id', prop.id)
      .gte('event_date', cutoffDate)
      .limit(1)
    if (!recentEvents || recentEvents.length === 0) {
      stalePropertyIds.push(prop.id)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stalePropertiesFiltered = ((staleProps ?? []) as any[]).filter((p: any) => stalePropertyIds.includes(p.id))

  // 2. Contacts with birthday in next 7 days (linked to workspace)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allContacts } = await (admin as any)
    .from('contacts')
    .select('id, name, date_of_birth, agent_id')
    .eq('workspace_id', profile.workspace_id)
    .not('date_of_birth', 'is', null)

  const today = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingBirthdays = ((allContacts ?? []) as any[]).filter((c: any) => {
    if (!c.date_of_birth) return false
    const [, mm, dd] = (c.date_of_birth as string).split('-').map(Number)
    let next = new Date(today.getFullYear(), mm - 1, dd)
    if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
    const diff = Math.ceil((next.getTime() - today.setHours(0, 0, 0, 0)) / 86400000)
    return diff >= 0 && diff <= 7
  })

  // 3. Build dedup key: one notification per (agent, property/contact, day) max
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingToday } = await (admin as any)
    .from('notifications')
    .select('body')
    .eq('workspace_id', profile.workspace_id)
    .gte('created_at', `${todayStr}T00:00:00`)

  const existingBodies = new Set<string>((existingToday ?? []).map((n: { body: string }) => n.body))

  const toInsert: {
    workspace_id: string
    agent_id: string
    type: string
    title: string
    body: string
    read: boolean
  }[] = []

  // Stale property alerts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const prop of stalePropertiesFiltered as any[]) {
    const body = `Nessun aggiornamento su ${prop.address}, ${prop.city} da ${STALE_DAYS}+ giorni (stage: ${prop.stage})`
    if (existingBodies.has(body)) continue
    const agentId = prop.agent_id ?? user.id
    toInsert.push({
      workspace_id: profile.workspace_id,
      agent_id: agentId,
      type: 'property_stale',
      title: `Immobile inattivo: ${prop.address}`,
      body,
      read: false,
    })
  }

  // Birthday alerts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const contact of upcomingBirthdays as any[]) {
    const [, mm, dd] = (contact.date_of_birth as string).split('-').map(Number)
    let next = new Date(today.getFullYear(), mm - 1, dd)
    if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
    const diff = Math.ceil((next.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
    const when = diff === 0 ? 'oggi' : `tra ${diff} giorn${diff === 1 ? 'o' : 'i'}`
    const body = `Compleanno di ${contact.name} ${when}`
    if (existingBodies.has(body)) continue
    const agentId = contact.agent_id ?? user.id
    toInsert.push({
      workspace_id: profile.workspace_id,
      agent_id: agentId,
      type: 'birthday',
      title: `🎂 Compleanno: ${contact.name}`,
      body,
      read: false,
    })
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ created: 0, message: 'Nessun nuovo alert' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('notifications').insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ created: toInsert.length })
}

// GET /api/banca-dati/alerts — trigger alerts and return count (convenience)
export async function GET(req: NextRequest) {
  return POST(req)
}
