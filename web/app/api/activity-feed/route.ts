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
    // Property events (last 20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('property_events')
      .select('id, type, content, created_at, property_id, agent_id')
      .eq('workspace_id', wid)
      .order('created_at', { ascending: false })
      .limit(20),

    // Contact events (last 20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('contact_events')
      .select('id, type, content, created_at, contact_id, agent_id')
      .eq('workspace_id', wid)
      .order('created_at', { ascending: false })
      .limit(20),

    // Upcoming appointments (next 7 days)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('appointments')
      .select('id, title, type, starts_at, contact_name')
      .eq('workspace_id', wid)
      .gte('starts_at', new Date().toISOString())
      .lte('starts_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),

    // Recent proposals (last 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('proposals')
      .select('id, buyer_name, status, created_at, prezzo_offerto')
      .eq('workspace_id', wid)
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent invoices (last 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('invoices')
      .select('id, cliente_nome, status, created_at, importo_totale, numero_fattura, anno')
      .eq('workspace_id', wid)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Normalize all events into a single format
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

  // Map property events
  for (const e of propertyEvents.data ?? []) {
    feed.push({
      id: `pe-${e.id}`,
      source: 'property_event',
      icon: 'building',
      title: e.content ?? e.type,
      href: `/banca-dati/${e.property_id}`,
      timestamp: e.created_at,
    })
  }

  // Map contact events
  for (const e of contactEvents.data ?? []) {
    feed.push({
      id: `ce-${e.id}`,
      source: 'contact_event',
      icon: 'user',
      title: e.content ?? e.type,
      href: `/contacts/${e.contact_id}`,
      timestamp: e.created_at,
    })
  }

  // Map appointments
  for (const a of appointments.data ?? []) {
    feed.push({
      id: `ap-${a.id}`,
      source: 'appointment',
      icon: 'calendar',
      title: a.title,
      subtitle: a.contact_name,
      href: `/calendar`,
      timestamp: a.starts_at,
    })
  }

  // Map proposals
  for (const p of proposals.data ?? []) {
    feed.push({
      id: `pr-${p.id}`,
      source: 'proposal',
      icon: 'file-text',
      title: `Proposta — ${p.buyer_name}`,
      subtitle: p.status,
      href: `/proposte/${p.id}`,
      timestamp: p.created_at,
    })
  }

  // Map invoices
  for (const inv of invoices.data ?? []) {
    feed.push({
      id: `inv-${inv.id}`,
      source: 'invoice',
      icon: 'receipt',
      title: `Fattura N. ${inv.numero_fattura}/${inv.anno} — ${inv.cliente_nome}`,
      subtitle: inv.status,
      href: `/contabilita/${inv.id}`,
      timestamp: inv.created_at,
    })
  }

  // Sort all by timestamp descending and take top 50
  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const trimmed = feed.slice(0, 50)

  return NextResponse.json({ feed: trimmed })
}
