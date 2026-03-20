import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/cron/lease-check
// Called daily (Vercel Cron or external scheduler).
// Checks lease_end_date for all locato properties and:
//   - Creates workspace notifications at 90/60/30/0 days before expiry
//   - Creates contact_events (contratto_in_scadenza / contratto_scaduto) for owner + tenant
//   - Creates property_event contratto_scaduto at day 0
//   - Avoids duplicate events (checks metadata.days_left in existing notifications)

const THRESHOLDS = [90, 60, 30, 0]

export async function GET(req: NextRequest) {
  // Validate cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find all active locato properties with a lease_end_date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: properties, error } = await (admin as any)
    .from('properties')
    .select('id, workspace_id, address, city, lease_end_date, tenant_contact_id, owner_contact_id, agent_id')
    .eq('stage', 'locato')
    .not('lease_end_date', 'is', null)

  if (error) {
    console.error('[lease-check] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let notificationsCreated = 0
  let eventsCreated = 0

  for (const property of (properties ?? [])) {
    const leaseEnd = new Date(property.lease_end_date as string)
    leaseEnd.setHours(0, 0, 0, 0)
    const diffMs = leaseEnd.getTime() - today.getTime()
    const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (!THRESHOLDS.includes(daysLeft)) continue

    const address = `${property.address ?? ''}${property.city ? `, ${property.city}` : ''}`
    const leaseEndLabel = leaseEnd.toLocaleDateString('it-IT')

    // Check if we already created a notification for this property + threshold
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (admin as any)
      .from('notifications')
      .select('id')
      .eq('workspace_id', property.workspace_id)
      .filter('metadata->>property_id', 'eq', property.id)
      .filter('metadata->>days_left', 'eq', String(daysLeft))
      .limit(1)

    if (existing && existing.length > 0) continue // already sent

    // Fetch all agents for workspace to notify
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agents } = await (admin as any)
      .from('users')
      .select('id, role')
      .eq('workspace_id', property.workspace_id)

    const notifType = daysLeft === 0 ? 'lease_expiry_today' : `lease_expiry_${daysLeft}`
    const notifTitle =
      daysLeft === 0
        ? `Contratto scaduto: ${address}`
        : `Contratto scade tra ${daysLeft} giorni: ${address}`
    const notifBody =
      daysLeft === 0
        ? `Il contratto di locazione per ${address} è scaduto oggi (${leaseEndLabel}). Azione richiesta.`
        : `Il contratto di locazione per ${address} scade il ${leaseEndLabel}. Verifica il rinnovo o disdetta.`

    // Workspace notifications for agents
    const agentIds: string[] = []
    for (const agent of agents ?? []) {
      if (daysLeft === 90) {
        // Only property's assigned agent at 90 days
        if (agent.id !== property.agent_id) continue
      }
      agentIds.push(agent.id as string)
    }

    if (agentIds.length > 0) {
      const notifInserts = agentIds.map((agentId) => ({
        workspace_id: property.workspace_id,
        agent_id: agentId,
        type: notifType,
        title: notifTitle,
        body: notifBody,
        read: false,
        metadata: { property_id: property.id, days_left: daysLeft, lease_end_date: property.lease_end_date },
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('notifications').insert(notifInserts)
      notificationsCreated += notifInserts.length
    }

    // Contact events for owner + tenant
    const contactEventType = daysLeft === 0 ? 'contratto_scaduto' : 'contratto_in_scadenza'
    const contactTitle =
      daysLeft === 0
        ? `Contratto di locazione scaduto: ${address}`
        : `Contratto di locazione scade tra ${daysLeft} giorni: ${address}`
    const contactBody =
      daysLeft === 0
        ? `Il contratto per ${address} è scaduto il ${leaseEndLabel}.`
        : `Il contratto per ${address} scade il ${leaseEndLabel}.`

    const contactInserts = []
    if (property.owner_contact_id) {
      contactInserts.push({
        workspace_id: property.workspace_id,
        contact_id: property.owner_contact_id,
        agent_id: property.agent_id ?? null,
        event_type: contactEventType,
        title: contactTitle,
        body: contactBody,
        related_property_id: property.id,
      })
    }
    if (property.tenant_contact_id) {
      contactInserts.push({
        workspace_id: property.workspace_id,
        contact_id: property.tenant_contact_id,
        agent_id: property.agent_id ?? null,
        event_type: contactEventType,
        title: contactTitle,
        body: contactBody,
        related_property_id: property.id,
      })
    }
    if (contactInserts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('contact_events').insert(contactInserts)
      eventsCreated += contactInserts.length
    }

    // Property event at day 0 only
    if (daysLeft === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('property_events').insert({
        workspace_id: property.workspace_id,
        property_id: property.id,
        agent_id: property.agent_id ?? null,
        event_type: 'contratto_scaduto',
        title: `Contratto di locazione scaduto: ${leaseEndLabel}`,
        description: `Il contratto per ${address} è scaduto. Verificare rinnovo o cambio stage.`,
        sentiment: 'neutral',
        metadata: { lease_end_date: property.lease_end_date },
      })
      eventsCreated++
    }
  }

  return NextResponse.json({
    ok: true,
    checked: (properties ?? []).length,
    notifications_created: notificationsCreated,
    events_created: eventsCreated,
  })
}
