/**
 * DeepSeek text generation — used during testing phase.
 * DeepSeek v3 is text-only (no vision). Photos stored in Supabase but not sent to AI.
 *
 * In production: swap for a vision-capable model (Gemini 1.5 Pro / GPT-4o)
 * that receives photo base64 and returns richer, photo-aware content.
 */

import type { GeneratedContent, Tone } from '@/lib/supabase/types'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

const CONDITION_LABELS: Record<string, string> = {
  ottimo: 'Ottimo stato',
  buono: 'Buono stato',
  sufficiente: 'Stato sufficiente',
  da_ristrutturare: 'Da ristrutturare',
}

interface PropertyData {
  property_type: string
  floor: number | null
  total_floors: number | null
  address: string
  city: string
  neighborhood: string | null
  price: number
  sqm: number
  rooms: number
  bathrooms: number
  condition: string | null
  features: string[]
  notes: string | null
  tone: Tone
}

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  standard: 'professionale e diretto, adatto a un pubblico generale',
  luxury: 'sofisticato e aspirazionale — usa un linguaggio ricercato, evoca esclusività e prestigio',
  approachable: 'caldo, amichevole e accessibile, come se parlassi con un amico',
  investment: 'orientato al rendimento — enfatizza posizione, potenziale di rivalutazione e redditività',
}

const FEATURE_LABELS: Record<string, string> = {
  terrace: 'terrazzo',
  garage: 'garage',
  elevator: 'ascensore',
  parking: 'posto auto',
  renovated_kitchen: 'cucina ristrutturata',
  sea_view: 'vista mare',
  garden: 'giardino',
  storage: 'ripostiglio',
  cellar: 'cantina',
  panoramic_view: 'vista panoramica',
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
  other: 'Immobile',
}

function buildPropertySummary(data: PropertyData): string {
  const floorInfo =
    data.property_type === 'apartment' && data.floor != null
      ? `Piano ${data.floor} di ${data.total_floors ?? '?'}`
      : null

  const featuresList = data.features
    .map((f) => FEATURE_LABELS[f] ?? f)
    .join(', ')

  return [
    `Tipo: ${TYPE_LABELS[data.property_type] ?? data.property_type}`,
    `Indirizzo: ${data.address}, ${data.city}${data.neighborhood ? ` (${data.neighborhood})` : ''}`,
    floorInfo ? `Piano: ${floorInfo}` : null,
    `Prezzo: €${data.price.toLocaleString('it-IT')}`,
    `Superficie: ${data.sqm} m²`,
    `Locali: ${data.rooms}`,
    `Bagni: ${data.bathrooms}`,
    featuresList ? `Caratteristiche: ${featuresList}` : null,
    data.condition ? `Stato: ${CONDITION_LABELS[data.condition] ?? data.condition}` : null,
    data.notes ? `Note agente: ${data.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

async function callDeepSeek(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  let res: Response
  try {
    res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.75,
      max_tokens: 2000,
    }),
  })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    // Do not forward raw API error body to callers — may contain quota/account details
    throw new Error(`DeepSeek API error ${res.status}`)
  }

  const json = await res.json() as { choices: { message: { content: string } }[] }
  return json.choices[0].message.content
}

const REQUIRED_CONTENT_KEYS: Array<keyof GeneratedContent> = [
  'listing_it', 'listing_en', 'instagram', 'facebook', 'whatsapp', 'email',
]

function validateGeneratedContent(raw: unknown): GeneratedContent {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('AI response is not an object')
  }
  const obj = raw as Record<string, unknown>
  for (const key of REQUIRED_CONTENT_KEYS) {
    if (typeof obj[key] !== 'string' || !obj[key]) {
      throw new Error(`AI response missing required field: ${key}`)
    }
  }
  return obj as unknown as GeneratedContent
}

export async function generateListingContent(
  data: PropertyData
): Promise<GeneratedContent> {
  const summary = buildPropertySummary(data)
  const tone = TONE_DESCRIPTIONS[data.tone]

  const system = `Sei un esperto di marketing immobiliare italiano con anni di esperienza nella vendita di immobili di pregio. Generi testi persuasivi, accurati e ottimizzati per ogni canale di comunicazione. Rispondi sempre e solo con JSON valido.`

  const user = `Genera tutti i contenuti di marketing per questo immobile.

DATI IMMOBILE:
${summary}

TONO RICHIESTO: ${tone}

Restituisci un oggetto JSON con esattamente questi 6 campi:
{
  "listing_it": "Descrizione professionale in italiano per portali immobiliari (200-300 parole). Inizia direttamente con la descrizione senza intestazioni.",
  "listing_en": "Traduzione inglese della descrizione sopra, stessa lunghezza e qualità.",
  "instagram": "Caption Instagram in italiano (max 150 parole). Tono: ${tone}. Usa emoji pertinenti (🏠🔑✨💎🌊🌿 ecc.) in modo naturale — 4-6 emoji totali sparsi nel testo. Coinvolgente, con call-to-action. Termina con esattamente 3 hashtag immobiliari italiani rilevanti.",
  "facebook": "Post Facebook in italiano (max 200 parole). Narrativo, con 2-3 emoji strategici per enfatizzare i punti chiave (es. ✅ per i plus, 📍 per la posizione, 💶 per il prezzo). Call-to-action finale tipo 'Contattaci per una visita'.",
  "whatsapp": "Messaggio broadcast WhatsApp in italiano (max 80 parole). Breve e diretto. Usa 3-4 emoji come 🏠 🔑 💰 ✅ per strutturare visivamente il messaggio. Include prezzo e caratteristiche principali.",
  "email": "Email in italiano per potenziali acquirenti (100-150 parole). Prima riga: 'Oggetto: [oggetto email]'. Poi testo formale ma non freddo."
}

IMPORTANTE: Solo JSON valido, nessun testo aggiuntivo.`

  const raw = await callDeepSeek(system, user)
  return validateGeneratedContent(JSON.parse(raw))
}

export async function regenerateTab(
  data: PropertyData,
  tab: keyof GeneratedContent,
  currentContent: GeneratedContent
): Promise<GeneratedContent> {
  const summary = buildPropertySummary(data)
  const tone = TONE_DESCRIPTIONS[data.tone]

  const tabInstructions: Record<keyof GeneratedContent, string> = {
    listing_it: 'Riscrivi la descrizione italiana per portali immobiliari (200-300 parole). Approccio e struttura diversi rispetto alla versione precedente.',
    listing_en: 'Riscrivi la descrizione inglese (200-300 parole). Approccio e struttura diversi.',
    instagram: `Riscrivi la caption Instagram (max 150 parole). Tono: ${tone}. Usa 4-6 emoji pertinenti (🏠🔑✨💎🌊🌿 ecc.) sparsi nel testo. Termina con 3 hashtag diversi dai precedenti.`,
    facebook: `Riscrivi il post Facebook (max 200 parole). Approccio narrativo diverso. Tono: ${tone}. Usa 2-3 emoji strategici (✅ 📍 💶 ecc.).`,
    whatsapp: 'Riscrivi il messaggio WhatsApp (max 80 parole). Angolo diverso. Usa 3-4 emoji come 🏠 🔑 💰 ✅ per strutturare visivamente il messaggio.',
    email: "Riscrivi l'email (100-150 parole). Prima riga: 'Oggetto: [nuovo oggetto creativo]'. Stile diverso.",
  }

  const system = `Sei un esperto di marketing immobiliare italiano. Rispondi sempre e solo con JSON valido.`

  const user = `Rigenera il campo "${tab}" per questo immobile.

DATI IMMOBILE:
${summary}

TONO: ${tone}

VERSIONE PRECEDENTE (da non ripetere):
${currentContent[tab]}

ISTRUZIONE: ${tabInstructions[tab]}

Rispondi con JSON contenente SOLO il campo "${tab}":
{"${tab}": "..."}`

  const raw = await callDeepSeek(system, user)
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const updated = typeof parsed[tab] === 'string' && parsed[tab] ? parsed[tab] as string : currentContent[tab]

  return { ...currentContent, [tab]: updated }
}
