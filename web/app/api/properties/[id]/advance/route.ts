import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_STAGES = ['sconosciuto', 'ignoto', 'conosciuto', 'incarico', 'venduto', 'locato', 'disponibile']

async function getWorkspaceAndRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('users')
    .select('workspace_id, role')
    .eq('id', userId)
    .single()
  return data as { workspace_id: string; role: string } | null
}

// POST /api/properties/[id]/advance — advance or regress property stage
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(supabase, user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const targetStage = typeof body.target_stage === 'string' ? body.target_stage : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() || null : null

  if (!VALID_STAGES.includes(targetStage)) {
    return NextResponse.json({ error: 'Fase non valida' }, { status: 400 })
  }

  // Fetch current property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property, error: fetchError } = await (supabase as any)
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (fetchError || !property) {
    return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })
  }

  const p = property as Record<string, unknown>
  const oldStage = p.stage as string

  // Validate stage-specific requirements
  const validationError = validateStageAdvance(p, targetStage, reason)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  // If target is venduto, check for accepted proposals (allow with reason)
  if (targetStage === 'venduto' && !reason) {
    const hasProposal = await checkAcceptedProposal(supabase, p, userProfile.workspace_id)
    if (!hasProposal) {
      return NextResponse.json(
        { error: 'Nessuna proposta accettata trovata. Fornire un motivo per procedere.' },
        { status: 400 }
      )
    }
  }

  // Build update payload
  const updatePayload = buildUpdatePayload(targetStage)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (supabase as any)
    .from('properties')
    .update({ stage: targetStage, ...updatePayload })
    .eq('id', id)
    .eq('workspace_id', userProfile.workspace_id)
    .select('*')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: "Errore nell'aggiornamento della fase" }, { status: 500 })
  }

  // Create cambio_stage event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('property_events')
    .insert({
      workspace_id: userProfile.workspace_id,
      property_id: id,
      agent_id: user.id,
      event_type: 'cambio_stage',
      title: `Fase cambiata: ${oldStage} → ${targetStage}`,
      description: reason ?? null,
      old_stage: oldStage,
      new_stage: targetStage,
      metadata: { old_stage: oldStage, new_stage: targetStage, reason },
    })

  return NextResponse.json({ property: updated })
}

function validateStageAdvance(
  property: Record<string, unknown>,
  targetStage: string,
  reason: string | null
): string | null {
  if (targetStage === 'ignoto') {
    const hasDetail = property.sqm || property.rooms || property.property_type
    if (!hasDetail) {
      return 'Per passare a "ignoto" è necessario inserire almeno un dettaglio (mq, vani o tipo immobile)'
    }
  }

  if (targetStage === 'conosciuto') {
    if (!property.owner_contact_id) {
      return 'Per passare a "conosciuto" è necessario identificare il proprietario'
    }
  }

  if (targetStage === 'incarico') {
    if (!property.incarico_type) {
      return "Il tipo di incarico è obbligatorio per passare alla fase 'incarico'"
    }
    if (!property.incarico_date) {
      return "La data di incarico è obbligatoria"
    }
    if (!property.incarico_commission_percent) {
      return "La percentuale di provvigione è obbligatoria per l'incarico"
    }
  }

  if (targetStage === 'locato') {
    if (!property.lease_type) {
      return 'Il tipo di contratto è obbligatorio per passare a "locato"'
    }
    if (!property.lease_start_date) {
      return 'La data di inizio locazione è obbligatoria'
    }
    if (!property.lease_end_date) {
      return 'La data di fine locazione è obbligatoria'
    }
    if (!property.monthly_rent) {
      return 'Il canone mensile è obbligatorio per passare a "locato"'
    }
  }

  if (targetStage === 'disponibile') {
    if (property.stage !== 'locato') {
      return 'La fase "disponibile" è raggiungibile solo da "locato"'
    }
  }

  void reason
  return null
}

async function checkAcceptedProposal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  property: Record<string, unknown>,
  workspaceId: string
): Promise<boolean> {
  if (!property.listing_id) return false
  const { data } = await supabase
    .from('proposals')
    .select('id')
    .eq('listing_id', property.listing_id)
    .eq('workspace_id', workspaceId)
    .eq('status', 'accettata')
    .limit(1)
  return Array.isArray(data) && data.length > 0
}

function buildUpdatePayload(targetStage: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (targetStage === 'incarico') {
    payload.owner_disposition = 'incarico_firmato'
  }

  if (targetStage === 'venduto') {
    payload.sold_at = new Date().toISOString()
  }

  return payload
}
