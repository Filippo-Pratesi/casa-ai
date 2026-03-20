import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any).from('users').select('workspace_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const wid = profile.workspace_id

  // Fetch recent events from multiple sources in parallel
  const [
    propertyEvents,
    contactEvents,
    appointments,
    proposals,
    invoices,
  ] = await Promise.all([
    // Property events — last 20, with property address as subtitle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('property_events')
      .select('id, event_type, title, description, event_date, property_id, property:properties!property_events_property_id_fkey(address, city)')
      .eq('workspace_id', wid)
      .order('event_date', { ascending: false })
      .limit(20),

    // Contact events — last 20, with contact name as subtitle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('contact_events')
      .select('id, event_type, title, body, event_date, contact_id, contact:contacts!contact_events_contact_id_fkey(id, name)')
      .eq('workspace_id', wid)
      .order('event_date', { ascending: false })
      .limit(20),

    // Upcoming appointments — up to end of tomorrow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('appointments')
      .select('id, title, type, starts_at, contact_name, contact_id, status')
      .eq('workspace_id', wid)
      .gte('starts_at', new Date().toISOString())
      .lte('starts_at', (() => {
        const endOfTomorrow = new Date()
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
        endOfTomorrow.setHours(23, 59, 59, 999)
        return endOfTomorrow.toISOString()
      })())
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true })
      .limit(10),

    // Recent proposals — last 10
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('proposals')
      .select('id, buyer_name, status, created_at')
      .eq('workspace_id', wid)
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent invoices — last 10
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('invoices')
      .select('id, cliente_nome, status, created_at, numero_fattura, anno')
      .eq('workspace_id', wid)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // ─── Appointment type → Italian label ────────────────────────────────────
  const APPT_TYPE_IT: Record<string, string> = {
    viewing: 'Visita',
    meeting: 'Riunione',
    signing: 'Rogito / Firma',
    call: 'Chiamata',
    other: 'Appuntamento',
  }

  // ─── Proposal status → Italian label ──────────────────────────────────────
  const PROPOSAL_STATUS_IT: Record<string, string> = {
    bozza: 'Bozza',
    inviata: 'Inviata',
    accettata: 'Accettata',
    rifiutata: 'Rifiutata',
    scaduta: 'Scaduta',
    ritirata: 'Ritirata',
  }

  // ─── Invoice status → Italian label ──────────────────────────────────────
  const INVOICE_STATUS_IT: Record<string, string> = {
    bozza: 'Bozza',
    inviata: 'Inviata',
    pagata: 'Pagata',
    scaduta: 'Scaduta',
  }

  // ─── Normalize into unified FeedItem format ────────────────────────────────
  type FeedItem = {
    id: string
    source: 'property_event' | 'contact_event' | 'appointment' | 'proposal' | 'invoice'
    icon: string
    title: string
    subtitle?: string
    href: string
    timestamp: string
  }

  const feed: FeedItem[] = []

  // Property events
  for (const e of (propertyEvents.data ?? []) as Array<{
    id: string; event_type: string; title: string; description: string | null
    event_date: string; property_id: string
    property: { address: string; city: string } | null
  }>) {
    const location = e.property
      ? `${e.property.address}, ${e.property.city}`
      : undefined
    feed.push({
      id: `pe-${e.id}`,
      source: 'property_event',
      icon: 'building',
      title: e.title,
      subtitle: location,
      href: `/banca-dati/${e.property_id}`,
      timestamp: e.event_date,
    })
  }

  // Contact events
  for (const e of (contactEvents.data ?? []) as Array<{
    id: string; event_type: string; title: string; body: string | null
    event_date: string; contact_id: string
    contact: { id: string; name: string } | null
  }>) {
    feed.push({
      id: `ce-${e.id}`,
      source: 'contact_event',
      icon: 'user',
      title: e.title,
      subtitle: e.contact?.name ?? undefined,
      href: `/contacts/${e.contact_id}`,
      timestamp: e.event_date,
    })
  }

  // Appointments
  for (const a of (appointments.data ?? []) as Array<{
    id: string; title: string; type: string; starts_at: string
    contact_name: string | null; contact_id: string | null
  }>) {
    const typeLabel = APPT_TYPE_IT[a.type] ?? 'Appuntamento'
    feed.push({
      id: `ap-${a.id}`,
      source: 'appointment',
      icon: 'calendar',
      title: a.title,
      subtitle: [typeLabel, a.contact_name].filter(Boolean).join(' · '),
      href: `/calendar`,
      timestamp: a.starts_at,
    })
  }

  // Proposals
  for (const p of (proposals.data ?? []) as Array<{
    id: string; buyer_name: string; status: string; created_at: string
  }>) {
    feed.push({
      id: `pr-${p.id}`,
      source: 'proposal',
      icon: 'file-text',
      title: `Proposta — ${p.buyer_name}`,
      subtitle: PROPOSAL_STATUS_IT[p.status] ?? p.status,
      href: `/proposte/${p.id}`,
      timestamp: p.created_at,
    })
  }

  // Invoices
  for (const inv of (invoices.data ?? []) as Array<{
    id: string; cliente_nome: string; status: string; created_at: string
    numero_fattura: string; anno: number
  }>) {
    feed.push({
      id: `inv-${inv.id}`,
      source: 'invoice',
      icon: 'receipt',
      title: `Fattura ${inv.numero_fattura}/${inv.anno} — ${inv.cliente_nome}`,
      subtitle: INVOICE_STATUS_IT[inv.status] ?? inv.status,
      href: `/contabilita/${inv.id}`,
      timestamp: inv.created_at,
    })
  }

  // Sort descending by timestamp, take top 50
  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({ feed: feed.slice(0, 50) })
}
