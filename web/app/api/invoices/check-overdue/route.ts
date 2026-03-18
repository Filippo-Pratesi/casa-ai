import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/invoices/check-overdue — mark overdue invoices as scaduta
export async function POST() {
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
