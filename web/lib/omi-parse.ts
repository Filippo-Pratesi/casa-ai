// OMI CSV parsing — runs in both browser and Node environments

export interface OmiRow {
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

export interface ParseResult {
  rows: OmiRow[]
  semestre: string
}

// Map OMI Descr_Tipologia to internal type names
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
  return OMI_TYPE_MAP[raw.toLowerCase().trim()] ?? null
}

function parseItalianNumber(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function extractSemestre(titleRow: string, filename: string): string {
  const fromTitle = titleRow.match(/Semestre\s+(\d{4})\/(\d)/i)
  if (fromTitle) return `${fromTitle[1]}_${fromTitle[2]}`
  const fromFile = filename.match(/_(\d{4})(\d)_/)
  if (fromFile) return `${fromFile[1]}_${fromFile[2]}`
  return 'sconosciuto'
}

export function parseOmiValoriCsv(
  text: string,
  filename: string
): ParseResult | { error: string } {
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lines = rawLines.filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return { error: 'File CSV vuoto o non valido' }
  }

  const semestre = extractSemestre(lines[0], filename)

  const headerRow = lines[1]
  if (!headerRow.includes(';')) {
    return { error: 'Formato CSV non riconosciuto: separatore ";" non trovato nell\'header' }
  }

  const headers = headerRow.split(';').map((h) => h.trim().toLowerCase())
  const idx = (name: string) => headers.indexOf(name)

  const colComuneDescr = idx('comune_descrizione')
  const colProv = idx('prov')
  const colZona = idx('zona')
  const colTipologia = idx('descr_tipologia')
  const colStato = idx('stato')
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
    if (cols.length < headers.length - 2) continue

    const comuneNome = (cols[colComuneDescr]?.trim() ?? '').toLowerCase()
    if (!comuneNome) continue

    const zona = cols[colZona]?.trim() ?? ''
    if (!zona) continue

    const tipo = normalizeOmiType(cols[colTipologia]?.trim() ?? '')
    if (!tipo) continue

    const stato = (cols[colStato]?.trim() ?? '').toLowerCase()

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

  return { rows, semestre }
}
