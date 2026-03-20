import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

// POST /api/proposals/[id]/respond
// body: { action: 'accettata' | 'rifiutata' | 'ritirata' }
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id, role').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let body: { action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const allowed = ['accettata', 'rifiutata', 'ritirata', 'inviata']
  if (!body.action || !allowed.includes(body.action)) {
    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('proposals')
    .select('status, agent_id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Proposta non trovata' }, { status: 404 })

  const isOwner = existing.agent_id === user.id
  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  // State machine: validate allowed transitions
  const allowedTransitions: Record<string, string[]> = {
    bozza: ['inviata', 'ritirata'],
    inviata: ['accettata', 'rifiutata', 'controproposta', 'scaduta', 'ritirata'],
    controproposta: ['accettata', 'rifiutata', 'ritirata'],
  }
  const currentStatus = (existing as { status: string }).status
  const validTargets = allowedTransitions[currentStatus] ?? []
  if (validTargets.length > 0 && !validTargets.includes(body.action!)) {
    return NextResponse.json(
      { error: `Transizione non valida: da '${currentStatus}' non si può passare a '${body.action}'` },
      { status: 422 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('proposals')
    .update({ status: body.action, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, numero_proposta, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
