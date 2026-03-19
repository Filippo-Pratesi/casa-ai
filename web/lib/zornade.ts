/**
 * Zornade API client — dati catastali e territoriali italiani.
 * Piano gratuito: 5.000 chiamate/mese.
 * Docs: https://zornade.com/documentation/
 */

// --- Types ---

export type ZornadeParcelQuery =
  | { type: 'point'; lat: number; lng: number }
  | { type: 'bbox'; bbox: [number, number, number, number] } // [minLon, minLat, maxLon, maxLat]
  | { type: 'fid'; fid: string }

export interface ZornadeParcel {
  fid: string
  gml_id: string
  municipality: string
  province: string
  region: string
  geometry: {
    type: string
    coordinates: number[][][]
  }
  classification: string // e.g. "agriculture", "residential"
  footprint_area_sqm: number
  elevation: number | null
  // Enriched data layers
  avg_age: number | null
  avg_family_size: number | null
  real_estate_potential_index: number | null
  economic_resilience_index: number | null
  flood_risk: string | null
  seismic_risk: string | null
  // Cadastral identifiers (when available)
  foglio: string | null
  particella: string | null
  categoria_catastale: string | null
}

export interface ZornadeResponse {
  parcels: ZornadeParcel[]
  count: number
}

export interface ZornadeError {
  error: string
  message: string
}

// --- Mapped output for casa-ai ---

export interface CadastralData {
  foglio: string | null
  particella: string | null
  categoria_catastale: string | null
  superficie_mq: number | null
  classificazione: string | null
  // Dati zona
  rischio_idrogeologico: string | null
  rischio_sismico: string | null
  indice_potenziale_immobiliare: number | null
  indice_resilienza_economica: number | null
  eta_media_zona: number | null
  dimensione_media_famiglia: number | null
  elevazione: number | null
  // Metadata
  fid: string
  comune: string
  provincia: string
  regione: string
  geometria: {
    type: string
    coordinates: number[][][]
  } | null
}

// --- Client ---

const ZORNADE_BASE_URL = 'https://app.zornade.com/functions/v1'

export async function fetchParcels(
  query: ZornadeParcelQuery
): Promise<{ data: ZornadeResponse | null; error: string | null }> {
  const apiKey = process.env.ZORNADE_API_KEY
  if (!apiKey) {
    return { data: null, error: 'ZORNADE_API_KEY non configurata' }
  }

  try {
    const res = await fetch(`${ZORNADE_BASE_URL}/get-parcels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(query),
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const text = await res.text()
      // Truncate HTML error pages to avoid huge error messages
      const shortError = text.startsWith('<!') ? `HTTP ${res.status}` : text.slice(0, 200)
      return { data: null, error: `Errore Zornade API (${res.status}): ${shortError}` }
    }

    const data = (await res.json()) as ZornadeResponse
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return { data: null, error: `Errore nella chiamata a Zornade: ${message}` }
  }
}

/**
 * Dato un punto GPS, restituisce i dati catastali mappati per casa-ai.
 * Restituisce la prima particella trovata.
 */
export async function getCadastralDataByCoordinates(
  lat: number,
  lng: number
): Promise<{ data: CadastralData | null; error: string | null }> {
  const { data, error } = await fetchParcels({
    type: 'point',
    lat,
    lng,
  })

  if (error || !data) {
    return { data: null, error: error ?? 'Nessuna risposta da Zornade' }
  }

  if (data.parcels.length === 0) {
    return { data: null, error: null } // Nessuna particella trovata (non e un errore)
  }

  const parcel = data.parcels[0]

  const cadastralData: CadastralData = {
    foglio: parcel.foglio ?? null,
    particella: parcel.particella ?? null,
    categoria_catastale: parcel.categoria_catastale ?? null,
    superficie_mq: parcel.footprint_area_sqm ?? null,
    classificazione: parcel.classification ?? null,
    rischio_idrogeologico: parcel.flood_risk ?? null,
    rischio_sismico: parcel.seismic_risk ?? null,
    indice_potenziale_immobiliare: parcel.real_estate_potential_index ?? null,
    indice_resilienza_economica: parcel.economic_resilience_index ?? null,
    eta_media_zona: parcel.avg_age ?? null,
    dimensione_media_famiglia: parcel.avg_family_size ?? null,
    elevazione: parcel.elevation ?? null,
    fid: parcel.fid,
    comune: parcel.municipality,
    provincia: parcel.province,
    regione: parcel.region,
    geometria: parcel.geometry ?? null,
  }

  return { data: cadastralData, error: null }
}
