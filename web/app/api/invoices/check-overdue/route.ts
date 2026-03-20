import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/invoices/check-overdue — mark overdue invoices as scaduta
// Protected by CRON_SECRET header to prevent unauthorized calls
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('x-cron-secret')
    if (authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('invoices')
    .update({ status: 'scaduta' })
    .eq('status', 'inviata')
    .lt('data_scadenza', today)
    .not('data_scadenza', 'is', null)
    .select('id, numero_fattura')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: data?.length ?? 0, invoices: data ?? [] })
}
