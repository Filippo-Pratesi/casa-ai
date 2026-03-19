import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unzipSync } from 'fflate'

// POST /api/settings/omi-upload — Upload CSV OMI quotations (ZIP or single CSV)
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

  if (!file) {
    return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
  }

  const name = file.name.toLowerCase()
  if (!name.endsWith('.csv') && !name.endsWith('.zip')) {
    return NextResponse.json({ error: 'Il file deve essere in formato CSV o ZIP' }, { status: 400 })
  }

  // Extract VALORI CSV text from ZIP or read directly
  let csvText: string
  let sourceFilename = name

  if (name.endsWith('.zip')) {
    const buf = new Uint8Array(await file.arrayBuffer())
    let zipFiles: Record<string, Uint8Array>
    try {
      zipFiles = unzipSync(buf)
    } catch {
      return NextResponse.json({ error: 'File ZIP non valido o corrotto' }, { status: 400 })
    }

    // Find the VALORI csv inside the ZIP (case-insensitive)
    const valoriEntry = Object.entries(zipFiles).find(([k]) =>
      k.toUpperCase().includes('VALORI') && k.toUpperCase().endsWith('.CSV')
    )
    if (!valoriEntry) {
      return NextResponse.json({
        error: 'Nessun file *_VALORI.csv trovato nello ZIP. Assicurati di caricare il file scaricato dal portale OMI.'
      }, { status: 400 })
    }
    sourceFilename = valoriEntry[0]
    csvText = new TextDecoder('utf-8').decode(valoriEntry[1])
  } else {
    csvText = await file.text()
  }

  // Parse the OMI CSV
  const result = parseOmiValoriCsv(csvText, sourceFilename)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const { rows, semestre } = result

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nessun record valido trovato nel file VALORI' }, { status: 400 })
  }

  // Batch upsert in chunks of 500
  const BATCH_SIZE = 500
  let insertedCount = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('omi_quotations')
      .upsert(batch, {
        onConflict: 'codice_comune,zona_omi,tipo_immobile,stato_conservazione,semestre,operazione',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error('OMI upsert error:', error)
    } else {
      insertedCount += batch.length
    }
  }

  // Update app_config metadata
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('app_config').upsert([
    { key: 'last_omi_semestre', value: JSON.stringify(semestre), updated_at: now },
    { key: 'last_omi_upload_date', value: JSON.stringify(now), updated_at: now },
    { key: 'omi_record_count', value: JSON.stringify(insertedCount), updated_at: now },
  ], { onConflict: 'key' })

  return NextResponse.json({
    count: insertedCount,
    semestre,
    message: `Importati ${insertedCount} record quotazioni OMI (${semestre})`,
  })
}

// --- OMI CSV parsing ---

interface OmiRow {
  codice_comune: string
  comune_nome: string
  provincia: string
  zona_omi: string
  tipo_immobile: string
  stato_conservazione: string
  valore_min_mq: number
  valore_max_mq: number
  semestre: string
  operazione: string
  fonte: string
}

function parseOmiValoriCsv(
  text: string,
  filename: string
): { rows: OmiRow[]; semestre: string } | { error: string } {
  // Normalize line endings
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lines = rawLines.filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return { error: 'File CSV vuoto o non valido' }
  }

  // Row 0: title row — extract semestre
  // e.g. "Quotazioni Immobiliari : Valori di Mercato - Semestre 2025/2 - elaborazione del 19-MAR-26"
  const titleRow = lines[0]
  const semestre = extractSemestre(titleRow, filename)

  // Row 1: header row
  const headerRow = lines[1]
  if (!headerRow.includes(';')) {
    return { error: 'Formato CSV non riconosciuto: separatore ";" non trovato nell\'header' }
  }

  const headers = headerRow.split(';').map((h) => h.trim().toLowerCase())

  // Locate required columns by name
  const idx = (name: string) => headers.indexOf(name)

  const colComuneCat = idx('comune_cat')        // catasto code (A2AA, F205...)
  const colComuneDescr = idx('comune_descrizione') // city name
  const colProv = idx('prov')
  const colZona = idx('zona')                   // OMI zone code (B1, C1...)
  const colTipologia = idx('descr_tipologia')   // type description
  const colStato = idx('stato')                 // NORMALE / OTTIMO / SCADENTE
  const colStatoPrev = idx('stato_prev')        // P = previsionale (kept for reference)
  const colComprMin = idx('compr_min')
  const colComprMax = idx('compr_max')
  const colLocMin = idx('loc_min')
  const colLocMax = idx('loc_max')

  if (colComuneDescr === -1 || colZona === -1 || colTipologia === -1 || colComprMin === -1 || colComprMax === -1) {
    return {
      error: `Colonne OMI non trovate. Colonne presenti: ${headers.join(', ')}. Assicurati di caricare il file *_VALORI.csv (non _ZONE.csv).`
    }
  }

  const rows: OmiRow[] = []

  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i].split(';')
    if (cols.length < headers.length - 2) continue // allow trailing empty cols

    // Note: Stato_prev=P (previsionale) rows are included — the 2025/2 dataset is entirely previsionale

    const comuneNome = (cols[colComuneDescr]?.trim() ?? '').toLowerCase()
    if (!comuneNome) continue

    const zona = cols[colZona]?.trim() ?? ''
    if (!zona) continue

    const tipologiaRaw = cols[colTipologia]?.trim() ?? ''
    const tipo = normalizeOmiType(tipologiaRaw)
    if (!tipo) continue // skip types we don't map (agricultural land etc.)

    const stato = (cols[colStato]?.trim() ?? '').toLowerCase()

    // Purchase prices (Compr_min/max)
    const comprMin = parseItalianNumber(cols[colComprMin])
    const comprMax = parseItalianNumber(cols[colComprMax])
    if (comprMin > 0 && comprMax > 0) {
      rows.push({
        codice_comune: comuneNome,
        comune_nome: comuneNome,
        provincia: cols[colProv]?.trim() ?? '',
        zona_omi: zona,
        tipo_immobile: tipo,
        stato_conservazione: stato,
        valore_min_mq: comprMin,
        valore_max_mq: comprMax,
        semestre,
        operazione: 'acquisto',
        fonte: 'csv',
      })
    }

    // Rental prices (Loc_min/max) — if columns present
    if (colLocMin !== -1 && colLocMax !== -1) {
      const locMin = parseItalianNumber(cols[colLocMin])
      const locMax = parseItalianNumber(cols[colLocMax])
      if (locMin > 0 && locMax > 0) {
        rows.push({
          codice_comune: comuneNome,
          comune_nome: comuneNome,
          provincia: cols[colProv]?.trim() ?? '',
          zona_omi: zona,
          tipo_immobile: tipo,
          stato_conservazione: stato,
          valore_min_mq: locMin,
          valore_max_mq: locMax,
          semestre,
          operazione: 'affitto',
          fonte: 'csv',
        })
      }
    }
  }

  // Attach comune_cat if available (for reference)
  if (colComuneCat !== -1) {
    // Not stored separately — comune_nome is used for lookup
    void colComuneCat
  }

  return { rows, semestre }
}

// Extract semestre string from title row or filename
function extractSemestre(titleRow: string, filename: string): string {
  // From title: "Semestre 2025/2" → "2025_2"
  const fromTitle = titleRow.match(/Semestre\s+(\d{4})\/(\d)/i)
  if (fromTitle) return `${fromTitle[1]}_${fromTitle[2]}`

  // From filename: "QI_1350045_1_20252_VALORI.csv" → "2025_2"
  const fromFile = filename.match(/_(\d{4})(\d)_/)
  if (fromFile) return `${fromFile[1]}_${fromFile[2]}`

  return 'sconosciuto'
}

// Parse Italian decimal format: "1.234,56" → 1234.56 or "520" → 520
function parseItalianNumber(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

// Map OMI Descr_Tipologia to internal type names (matching PROPERTY_TYPE_TO_OMI targets)
const OMI_TYPE_MAP: Record<string, string> = {
  'abitazioni civili': 'abitazioni_civili',
  'ville e villini': 'ville_e_villini',
  'box': 'box',
  'negozi': 'negozi',
  'uffici': 'uffici',
  'magazzini': 'magazzini',
  'capannoni industriali': 'capannoni_industriali',
  'capannoni tipici': 'capannoni_tipici',
  'posti auto coperti': 'posti_auto_coperti',
  'posti auto scoperti': 'posti_auto_scoperti',
  'laboratori': 'laboratori',
}

function normalizeOmiType(raw: string): string | null {
  const lower = raw.toLowerCase().trim()
  return OMI_TYPE_MAP[lower] ?? null
}
