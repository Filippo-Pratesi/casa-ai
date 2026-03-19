import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/settings/omi-upload — Upload CSV OMI quotations
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

  // Parse multipart form
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file || !file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'File CSV obbligatorio' }, { status: 400 })
  }

  const text = await file.text()
  const lines = text.split('\n').filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return NextResponse.json({ error: 'File CSV vuoto o non valido' }, { status: 400 })
  }

  // Parse CSV header
  const separator = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(separator).map((h) => h.trim().replace(/"/g, '').toLowerCase())

  // Detect column mapping (AdE OMI CSV format)
  // Common column names in AdE exports: Codice_comune, Comune, Provincia, Zona, Tipo_Immobile,
  // Stato_conservazione, Val_Mercato_min, Val_Mercato_max, Semestre
  const colMap = detectColumns(headers)

  if (!colMap.codice_comune || !colMap.zona_omi || !colMap.tipo_immobile || !colMap.valore_min || !colMap.valore_max) {
    return NextResponse.json({
      error: `Formato CSV non riconosciuto. Colonne trovate: ${headers.join(', ')}. Servono: codice comune, zona OMI, tipo immobile, valore min, valore max.`
    }, { status: 400 })
  }

  // Parse rows
  const rows: Array<{
    codice_comune: string
    comune_nome: string
    provincia: string
    zona_omi: string
    tipo_immobile: string
    stato_conservazione: string | null
    valore_min_mq: number
    valore_max_mq: number
    semestre: string
  }> = []

  let detectedSemestre = ''

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], separator)
    if (cols.length < headers.length) continue

    const minVal = parseFloat(cols[colMap.valore_min]?.replace(',', '.') ?? '')
    const maxVal = parseFloat(cols[colMap.valore_max]?.replace(',', '.') ?? '')

    if (isNaN(minVal) || isNaN(maxVal) || minVal <= 0 || maxVal <= 0) continue

    const semestre = cols[colMap.semestre ?? -1]?.trim() ?? ''
    if (semestre && !detectedSemestre) detectedSemestre = semestre

    rows.push({
      codice_comune: cols[colMap.codice_comune]?.trim() ?? '',
      comune_nome: cols[colMap.comune_nome ?? -1]?.trim() ?? '',
      provincia: cols[colMap.provincia ?? -1]?.trim() ?? '',
      zona_omi: cols[colMap.zona_omi]?.trim() ?? '',
      tipo_immobile: cols[colMap.tipo_immobile]?.trim() ?? '',
      stato_conservazione: cols[colMap.stato_conservazione ?? -1]?.trim() || null,
      valore_min_mq: minVal,
      valore_max_mq: maxVal,
      semestre: semestre || detectedSemestre || 'sconosciuto',
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nessun record valido trovato nel CSV' }, { status: 400 })
  }

  // Batch insert (upsert) in chunks of 500
  const BATCH_SIZE = 500
  let insertedCount = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      ...r,
      fonte: 'csv',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('omi_quotations')
      .upsert(batch, {
        onConflict: 'codice_comune,zona_omi,tipo_immobile,stato_conservazione,semestre',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error('OMI upsert error:', error)
      // Continue with remaining batches
    } else {
      insertedCount += batch.length
    }
  }

  // Update app_config
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('app_config').upsert([
    { key: 'last_omi_semestre', value: JSON.stringify(detectedSemestre || 'sconosciuto'), updated_at: now },
    { key: 'last_omi_upload_date', value: JSON.stringify(now), updated_at: now },
    { key: 'omi_record_count', value: JSON.stringify(insertedCount), updated_at: now },
  ], { onConflict: 'key' })

  return NextResponse.json({
    count: insertedCount,
    semestre: detectedSemestre || 'sconosciuto',
    message: `Importati ${insertedCount} record quotazioni OMI`,
  })
}

// --- CSV column detection ---

function detectColumns(headers: string[]): {
  codice_comune: number
  comune_nome: number | null
  provincia: number | null
  zona_omi: number
  tipo_immobile: number
  stato_conservazione: number | null
  valore_min: number
  valore_max: number
  semestre: number | null
} {
  const find = (patterns: string[]) =>
    headers.findIndex((h) => patterns.some((p) => h.includes(p)))

  return {
    codice_comune: find(['codice_comune', 'cod_comune', 'comune_catastale', 'codcomune']),
    comune_nome: nullIfMissing(find(['comune', 'nome_comune', 'denominazione'])),
    provincia: nullIfMissing(find(['provincia', 'prov', 'sigla_prov'])),
    zona_omi: find(['zona', 'zona_omi', 'cod_zona', 'codzona']),
    tipo_immobile: find(['tipo', 'tipo_immobile', 'tipologia', 'descr_tipologia']),
    stato_conservazione: nullIfMissing(find(['stato', 'conservazione', 'stato_conservazione'])),
    valore_min: find(['val_mercato_min', 'valore_min', 'min', 'compr_min', 'loc_min']),
    valore_max: find(['val_mercato_max', 'valore_max', 'max', 'compr_max', 'loc_max']),
    semestre: nullIfMissing(find(['semestre', 'periodo', 'sem'])),
  }
}

function nullIfMissing(idx: number): number | null {
  return idx === -1 ? null : idx
}

function parseCsvLine(line: string, separator: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === separator && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}
