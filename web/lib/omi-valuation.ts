/**
 * Logica di quotazione immobiliare ibrida.
 *
 * Priorita:
 * 1. CSV OMI locale (tabella omi_quotations) se presente e recente (< 12 mesi)
 * 2. 3eurotools.it API con cache (TTL 30 giorni)
 * 3. Null se entrambi falliscono
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { fetchOmiQuotation, PROPERTY_TYPE_TO_OMI } from './3eurotools'

// --- Types ---

export interface ValuationResult {
  valore_min: number
  valore_max: number
  valore_min_mq: number
  valore_max_mq: number
  semestre: string
  fonte: 'csv_omi' | 'api_3eurotools'
  stato_conservazione: string | null
  disclaimer: string
}

export interface ValuationParams {
  codice_comune: string
  zona_omi: string
  tipo_immobile: string // property_type di casa-ai (apartment, house, villa, etc.)
  sqm: number
  stato_conservazione?: string
  operazione?: 'acquisto' | 'affitto'
}

// --- Constants ---

const MAX_CSV_AGE_MONTHS = 12
const API_CACHE_TTL_DAYS = 30
const DISCLAIMER = 'Stima indicativa basata su quotazioni OMI dell\'Agenzia delle Entrate. Non costituisce perizia o valutazione certificata.'

// --- Helper: Supabase admin client ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAdminClient(): any {
  return createAdminClient()
}

// --- Strategy 1: CSV locale ---

async function getFromLocalCsv(
  params: ValuationParams
): Promise<ValuationResult | null> {
  const supabase = getAdminClient()
  const omiType = PROPERTY_TYPE_TO_OMI[params.tipo_immobile] ?? 'abitazioni_civili'

  // Check if we have recent CSV data
  const { data: config } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'last_omi_upload_date')
    .single()

  if (config?.value) {
    const uploadDate = new Date(config.value as string)
    const monthsAgo = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsAgo > MAX_CSV_AGE_MONTHS) {
      return null // CSV troppo vecchio
    }
  } else {
    return null // Nessun CSV caricato
  }

  // Query quotazioni — match by comune_nome (case-insensitive) + zona_omi + tipo
  const operazione = params.operazione ?? 'acquisto'
  let query = supabase
    .from('omi_quotations')
    .select('valore_min_mq, valore_max_mq, semestre, stato_conservazione')
    .ilike('comune_nome', params.codice_comune.trim())
    .eq('zona_omi', params.zona_omi)
    .eq('tipo_immobile', omiType)
    .eq('operazione', operazione)
    .eq('fonte', 'csv')
    .order('semestre', { ascending: false })
    .limit(1)

  if (params.stato_conservazione) {
    query = query.eq('stato_conservazione', params.stato_conservazione.toLowerCase())
  }

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    return null
  }

  const row = data[0]
  const minMq = Number(row.valore_min_mq)
  const maxMq = Number(row.valore_max_mq)

  return {
    valore_min: Math.round(minMq * params.sqm),
    valore_max: Math.round(maxMq * params.sqm),
    valore_min_mq: minMq,
    valore_max_mq: maxMq,
    semestre: row.semestre,
    fonte: 'csv_omi',
    stato_conservazione: row.stato_conservazione,
    disclaimer: DISCLAIMER,
  }
}

// --- Strategy 2: 3eurotools API con cache ---

async function getFromApi(
  params: ValuationParams
): Promise<ValuationResult | null> {
  const supabase = getAdminClient()
  const omiType = PROPERTY_TYPE_TO_OMI[params.tipo_immobile] ?? 'abitazioni_civili'
  const operazione = params.operazione ?? 'acquisto'

  // Check cache
  const { data: cached } = await supabase
    .from('omi_api_cache')
    .select('response, semestre, fetched_at')
    .eq('codice_comune', params.codice_comune)
    .eq('zona_omi', params.zona_omi)
    .eq('tipo_immobile', omiType)
    .eq('operazione', operazione)
    .single()

  if (cached?.response && cached.fetched_at) {
    const fetchedAt = new Date(cached.fetched_at)
    const daysAgo = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo < API_CACHE_TTL_DAYS) {
      return extractFromApiResponse(cached.response, params.sqm, cached.semestre, omiType)
    }
  }

  // Call 3eurotools
  const { data: apiResponse, error } = await fetchOmiQuotation({
    codice_comune: params.codice_comune,
    zona_omi: params.zona_omi,
    tipo_immobile: omiType,
    metri_quadri: params.sqm,
    operazione,
  })

  if (error || !apiResponse) {
    return null
  }

  // Upsert cache
  await supabase
    .from('omi_api_cache')
    .upsert(
      {
        codice_comune: params.codice_comune,
        zona_omi: params.zona_omi,
        tipo_immobile: omiType,
        operazione,
        response: apiResponse,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'codice_comune,zona_omi,tipo_immobile,operazione' }
    )

  return extractFromApiResponse(apiResponse, params.sqm, null, omiType)
}

function extractFromApiResponse(
  response: Record<string, unknown>,
  sqm: number,
  semestre: string | null,
  omiType: string
): ValuationResult | null {
  // 3eurotools restituisce un oggetto con tipi immobile come chiavi
  const entry = response[omiType] as Record<string, unknown> | undefined
  if (!entry) {
    // Prova la prima chiave disponibile
    const firstKey = Object.keys(response)[0]
    if (!firstKey) return null
    const fallback = response[firstKey] as Record<string, unknown>
    return buildResult(fallback, sqm, semestre)
  }
  return buildResult(entry, sqm, semestre)
}

function buildResult(
  entry: Record<string, unknown>,
  sqm: number,
  semestre: string | null
): ValuationResult | null {
  const minMq = Number(entry.prezzo_acquisto_min ?? entry.prezzo_affitto_min ?? 0)
  const maxMq = Number(entry.prezzo_acquisto_max ?? entry.prezzo_affitto_max ?? 0)

  if (minMq === 0 && maxMq === 0) return null

  return {
    valore_min: Math.round(minMq * sqm),
    valore_max: Math.round(maxMq * sqm),
    valore_min_mq: minMq,
    valore_max_mq: maxMq,
    semestre: semestre ?? 'ultimo disponibile',
    fonte: 'api_3eurotools',
    stato_conservazione: (entry.stato_di_conservazione_mediano_della_zona as string) ?? null,
    disclaimer: DISCLAIMER,
  }
}

// --- Main function ---

export async function getValuation(
  params: ValuationParams
): Promise<{ data: ValuationResult | null; error: string | null }> {
  try {
    // 1. Prova CSV locale
    const csvResult = await getFromLocalCsv(params)
    if (csvResult) {
      return { data: csvResult, error: null }
    }

    // 2. Fallback: 3eurotools API
    const apiResult = await getFromApi(params)
    if (apiResult) {
      return { data: apiResult, error: null }
    }

    return { data: null, error: null } // Nessuna quotazione disponibile (non e un errore)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return { data: null, error: `Errore nel calcolo della quotazione: ${message}` }
  }
}
