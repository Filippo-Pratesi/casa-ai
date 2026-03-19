/**
 * 3eurotools.it API client — quotazioni OMI gratuite.
 * Nessuna autenticazione richiesta.
 * Rate limit: 100 req in coda, 1 ricarica ogni 3 sec.
 * Docs: https://3eurotools.it/api-quotazioni-immobiliari-omi
 */

// --- Types ---

export interface ThreeEuroQuotation {
  tipo_immobile: string
  stato_di_conservazione_mediano_della_zona: string
  prezzo_acquisto_min: number | null
  prezzo_acquisto_max: number | null
  prezzo_acquisto_medio: number | null
  prezzo_affitto_min: number | null
  prezzo_affitto_max: number | null
  prezzo_affitto_medio: number | null
}

export interface ThreeEuroResponse {
  [tipoImmobile: string]: ThreeEuroQuotation
}

export interface ThreeEuroParams {
  codice_comune: string
  zona_omi?: string
  tipo_immobile?: string
  metri_quadri?: number
  operazione?: 'acquisto' | 'affitto'
  anno?: number
}

// --- Client ---

const BASE_URL = 'https://3eurotools.it/api-quotazioni-immobiliari-omi/ricerca'

export async function fetchOmiQuotation(
  params: ThreeEuroParams
): Promise<{ data: ThreeEuroResponse | null; error: string | null }> {
  const searchParams = new URLSearchParams()
  searchParams.set('codice_comune', params.codice_comune)

  if (params.zona_omi) searchParams.set('zona_omi', params.zona_omi)
  if (params.tipo_immobile) searchParams.set('tipo_immobile', params.tipo_immobile)
  if (params.metri_quadri) searchParams.set('metri_quadri', String(params.metri_quadri))
  if (params.operazione) searchParams.set('operazione', params.operazione)
  if (params.anno) searchParams.set('anno', String(params.anno))

  try {
    const res = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const text = await res.text()
      return { data: null, error: `3eurotools error ${res.status}: ${text}` }
    }

    const data = (await res.json()) as ThreeEuroResponse
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return { data: null, error: `Errore nella chiamata a 3eurotools: ${message}` }
  }
}

// --- Mapping tipi immobile ---
// Mappa i property_type di casa-ai ai tipi di 3eurotools
export const PROPERTY_TYPE_TO_OMI: Record<string, string> = {
  apartment: 'abitazioni_civili',
  house: 'abitazioni_civili',
  villa: 'ville_e_villini',
  commercial: 'negozi',
  land: 'terreni_agricoli',
  garage: 'box',
  other: 'abitazioni_civili',
}
