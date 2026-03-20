import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProposalStatus } from '@/lib/supabase/types'

// POST /api/proposals/check-expired
// Called by a daily cron job (same pattern as /api/cron/lease-check).
// Register in vercel.json under "crons":
//   { "path": "/api/proposals/check-expired", "schedule": "0 2 * * *" }
// Auth: x-cron-secret header must match CRON_SECRET env var.
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  const auth = req.headers.get('x-cron-secret')
  if (auth !== cronSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Find all 'inviata' proposals where validita_proposta has passed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: expired, error } = await (admin as any)
    .from('proposals')
    .select('id, workspace_id')
    .eq('status', 'inviata')
    .lt('validita_proposta', today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!expired || expired.length === 0) return NextResponse.json({ updated: 0 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin as any)
    .from('proposals')
    .update({ status: 'scaduta' as ProposalStatus })
    .in('id', (expired as Array<{ id: string }>).map(p => p.id))

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ updated: expired.length })
}
