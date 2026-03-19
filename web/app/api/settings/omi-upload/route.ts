import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OmiRow } from '@/lib/omi-parse'

// POST /api/settings/omi-upload — Upsert a batch of parsed OMI rows (JSON)
// Parsing happens client-side; this route only does the DB upsert.
export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  // Admin check
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof = profile as any
  if (!prof || (prof.role !== 'admin' && prof.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Solo gli amministratori possono caricare i dati OMI' }, { status: 403 })
  }

  // Parse JSON body
  let body: { rows: OmiRow[]; semestre: string; isFinal?: boolean; totalCount?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta non valido' }, { status: 400 })
  }

  const { rows, semestre, isFinal, totalCount } = body

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Nessun record nel batch' }, { status: 400 })
  }
  if (!semestre) {
    return NextResponse.json({ error: 'Semestre mancante' }, { status: 400 })
  }

  // Upsert batch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('omi_quotations')
    .upsert(rows, {
      onConflict: 'codice_comune,zona_omi,tipo_immobile,stato_conservazione,semestre,operazione',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('OMI upsert error:', error)
    return NextResponse.json({ error: `Errore DB: ${error.message}` }, { status: 500 })
  }

  // On final batch, update app_config metadata
  if (isFinal) {
    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('app_config').upsert([
      { key: 'last_omi_semestre', value: JSON.stringify(semestre), updated_at: now },
      { key: 'last_omi_upload_date', value: JSON.stringify(now), updated_at: now },
      { key: 'omi_record_count', value: JSON.stringify(totalCount ?? rows.length), updated_at: now },
    ], { onConflict: 'key' })
  }

  return NextResponse.json({ ok: true, count: rows.length })
}
