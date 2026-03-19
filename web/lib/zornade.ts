/**
 * Zornade API client — dati catastali e territoriali italiani.
 * Endpoint: GET /parcels?lat=X&lng=Y
 * Auth: x-api-key header
 */

// --- Types (actual API response shape) ---

export interface ZornadeParcel {
  fid: number
  gml_id: string
  label: string | null
  nationalcadastralreference: string | null
  administrativeunit: string | null // codice comune (es. "D730")
  footprint_sqm: number | null
  area_m2: number | null
  comune_name: string | null
  comune_id: number | null
  municipality_name: string | null
  region_name: string | null
  province_name: string | null
  province_code: string | null
  postal_code: string | null
  final_class: string | null // "residential", "recreation", "agriculture", ...
  final_subtype: string | null
  flood_risk: number | null    // 0 = basso, 1 = alto
  landslide_risk: number | null
  seismic_risk: number | null  // 0.0–1.0 (accelerazione sismica)
  average_family_size: string | null
  average_age: string | null
  real_estate_potential_index: string | null
  economic_resilience_index: string | null
  elevation_min: number | null
  elevation_max: number | null
  geom_geojson: string | null  // GeoJSON string
}

export interface ZornadeResponse {
  data: ZornadeParcel[]
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
    coordinates: unknown
  } | null
}

// --- Helpers ---

function floodRiskLabel(value: number | null): string | null {
  if (value === null) return null
  if (value >= 1) return 'Alto'
  if (value >= 0.5) return 'Medio'
  return 'Basso'
}

function seismicRiskLabel(value: number | null): string | null {
  if (value === null) return null
  // Accelerazione sismica ag (g): zona 1 >0.25, zona 2 0.15–0.25, zona 3 0.05–0.15, zona 4 <0.05
  if (value > 0.25) return 'Alto (Zona 1)'
  if (value > 0.15) return 'Medio-alto (Zona 2)'
  if (value > 0.05) return 'Medio-basso (Zona 3)'
  return 'Basso (Zona 4)'
}

// --- Client ---

const ZORNADE_BASE_URL = 'https://wupqwfqjfpwrapgnogjv.supabase.co/functions/v1/api-gateway/api/v1'

export async function fetchParcels(
  lat: number,
  lng: number
): Promise<{ data: ZornadeResponse | null; error: string | null }> {
  const apiKey = process.env.ZORNADE_API_KEY
  if (!apiKey) {
    return { data: null, error: 'ZORNADE_API_KEY non configurata' }
  }

  try {
    const res = await fetch(`${ZORNADE_BASE_URL}/parcels?lat=${lat}&lng=${lng}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const text = await res.text()
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
  const { data, error } = await fetchParcels(lat, lng)

  if (error || !data) {
    return { data: null, error: error ?? 'Nessuna risposta da Zornade' }
  }

  if (!data.data || data.data.length === 0) {
    return { data: null, error: null } // Nessuna particella trovata (non e un errore)
  }

  const parcel = data.data[0]

  // Parse geometry from GeoJSON string if present
  let geometria: CadastralData['geometria'] = null
  if (parcel.geom_geojson) {
    try {
      const parsed = JSON.parse(parcel.geom_geojson) as { type: string; coordinates: unknown }
      geometria = parsed
    } catch {
      // ignore parse errors
    }
  }

  const cadastralData: CadastralData = {
    foglio: null, // not returned by Zornade API
    particella: parcel.label ?? null,
    categoria_catastale: null, // not returned by Zornade API
    superficie_mq: parcel.footprint_sqm ?? parcel.area_m2 ?? null,
    classificazione: parcel.final_class ?? null,
    rischio_idrogeologico: floodRiskLabel(parcel.flood_risk),
    rischio_sismico: seismicRiskLabel(parcel.seismic_risk),
    indice_potenziale_immobiliare: parcel.real_estate_potential_index != null
      ? Number(parcel.real_estate_potential_index)
      : null,
    indice_resilienza_economica: parcel.economic_resilience_index != null
      ? Number(parcel.economic_resilience_index)
      : null,
    eta_media_zona: parcel.average_age != null ? Number(parcel.average_age) : null,
    dimensione_media_famiglia: parcel.average_family_size != null
      ? Number(parcel.average_family_size)
      : null,
    elevazione: parcel.elevation_max ?? parcel.elevation_min ?? null,
    fid: String(parcel.fid),
    comune: parcel.municipality_name ?? parcel.comune_name ?? '',
    provincia: parcel.province_name ?? '',
    regione: parcel.region_name ?? '',
    geometria,
  }

  return { data: cadastralData, error: null }
}
