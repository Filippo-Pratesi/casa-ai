import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/invoices/export-batch?year=2025&month=3
// Returns list of invoice metadata for client-side batch download.
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const url = new URL(req.url)
  const year = url.searchParams.get('year') ?? new Date().getFullYear().toString()
  const month = url.searchParams.get('month') // optional, 1-12

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('invoices')
    .select('id, numero_fattura, anno, cliente_nome, totale_documento, netto_a_pagare, status, data_emissione')
    .eq('workspace_id', profile.workspace_id)
    .eq('anno', parseInt(year, 10))
    .order('data_emissione', { ascending: true })

  // Filter by month using data_emissione date range
  if (month) {
    const m = parseInt(month, 10)
    if (m >= 1 && m <= 12) {
      const paddedMonth = String(m).padStart(2, '0')
      const yearInt = parseInt(year, 10)
      const dateFrom = `${yearInt}-${paddedMonth}-01`
      const lastDay = new Date(yearInt, m, 0).getDate()
      const dateTo = `${yearInt}-${paddedMonth}-${lastDay}`
      query = query.gte('data_emissione', dateFrom).lte('data_emissione', dateTo)
    }
  }

  const { data: invoices, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    invoices: (invoices ?? []).map((inv: {
      id: string
      numero_fattura: string
      anno: number
      cliente_nome: string
      totale_documento: number | null
      netto_a_pagare: number | null
      status: string
      data_emissione: string
    }) => ({
      id: inv.id,
      numero: inv.numero_fattura,
      anno: inv.anno,
      cliente: inv.cliente_nome,
      importo: inv.totale_documento,
      netto: inv.netto_a_pagare,
      status: inv.status,
      data_emissione: inv.data_emissione,
    })),
    total: (invoices ?? []).length,
  })
}
