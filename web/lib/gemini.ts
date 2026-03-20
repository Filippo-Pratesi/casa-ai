import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GeneratedContent, Tone } from '@/lib/supabase/types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

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
  features: string[]
  notes: string | null
  tone: Tone
}

interface PhotoPart {
  data: string    // base64
  mimeType: string
}

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  standard: 'professionale e diretto, adatto a un pubblico generale',
  luxury: 'sofisticato e aspirazionale — usa un linguaggio ricercato, evoca esclusività e prestigio, aggiungi dettagli sensoriali',
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

function buildPropertySummary(data: PropertyData): string {
  const floorInfo =
    data.property_type === 'apartment' && data.floor != null
      ? `Piano ${data.floor} di ${data.total_floors ?? '?'}`
      : null

  const featuresList = data.features
    .map((f) => FEATURE_LABELS[f] ?? f)
    .join(', ')

  return [
    `Tipo: ${data.property_type}`,
    `Indirizzo: ${data.address}, ${data.city}${data.neighborhood ? ` (${data.neighborhood})` : ''}`,
    floorInfo ? `Piano: ${floorInfo}` : null,
    `Prezzo: €${data.price.toLocaleString('it-IT')}`,
    `Superficie: ${data.sqm} m²`,
    `Locali: ${data.rooms}`,
    `Bagni: ${data.bathrooms}`,
    featuresList ? `Caratteristiche: ${featuresList}` : null,
    data.notes ? `Note agente: ${data.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildPrompt(data: PropertyData, photoCount: number): string {
  const summary = buildPropertySummary(data)
  const tone = TONE_DESCRIPTIONS[data.tone]

  return `Sei un esperto di marketing immobiliare italiano. Analizza i dati dell'immobile${photoCount > 0 ? ` e le ${photoCount} foto allegate` : ''} e genera tutti i contenuti di marketing richiesti.

DATI IMMOBILE:
${summary}

TONO RICHIESTO: ${tone}

Genera un oggetto JSON con esattamente questi 6 campi:
{
  "listing_it": "Descrizione professionale in italiano per portali immobiliari (200-300 parole). Inizia direttamente con la descrizione, non con 'Descrizione:' o simili.",
  "listing_en": "Traduzione inglese della descrizione sopra, stessa lunghezza e qualità.",
  "instagram": "Caption Instagram in italiano (max 150 parole). Tono: ${tone}. Includi call-to-action. Termina con esattamente 3 hashtag immobiliari italiani rilevanti.",
  "facebook": "Post Facebook in italiano (max 200 parole). Più narrativo dell'Instagram, con call-to-action finale tipo 'Contattaci per una visita'.",
  "whatsapp": "Messaggio broadcast WhatsApp in italiano (max 80 parole). Breve, diretto, coinvolgente. Include prezzo e caratteristiche principali.",
  "email": "Email in italiano per potenziali acquirenti (100-150 parole). Prima riga: 'Oggetto: [oggetto email]'. Poi testo formale ma non freddo."
}

IMPORTANTE: Rispondi SOLO con il JSON valido, senza markdown, senza \`\`\`json, senza testo aggiuntivo.`
}

export async function generateListingContent(
  propertyData: PropertyData,
  photos: PhotoPart[]
): Promise<GeneratedContent> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const prompt = buildPrompt(propertyData, photos.length)

  const imageParts = photos.map((photo) => ({
    inlineData: {
      data: photo.data,
      mimeType: photo.mimeType,
    },
  }))

  const result = await model.generateContent([prompt, ...imageParts])
  const text = result.response.text()

  // Strip markdown fences if Gemini adds them despite responseMimeType
  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  try {
    return JSON.parse(clean) as GeneratedContent
  } catch {
    throw new Error('Risposta AI non valida: il modello ha restituito un formato non riconosciuto')
  }
}

export async function regenerateTab(
  propertyData: PropertyData,
  photos: PhotoPart[],
  tab: keyof GeneratedContent,
  currentContent: GeneratedContent
): Promise<GeneratedContent> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const summary = buildPropertySummary(propertyData)
  const tone = TONE_DESCRIPTIONS[propertyData.tone]

  const tabInstructions: Record<keyof GeneratedContent, string> = {
    listing_it: 'Riscrivi la descrizione italiana per portali immobiliari (200-300 parole). Stile diverso, stessa qualità.',
    listing_en: 'Riscrivi la descrizione inglese (200-300 parole). Stile diverso, stessa qualità.',
    instagram: `Riscrivi la caption Instagram (max 150 parole). Tono: ${tone}. Termina con esattamente 3 hashtag diversi dai precedenti.`,
    facebook: `Riscrivi il post Facebook (max 200 parole). Approccio narrativo diverso. Tono: ${tone}.`,
    whatsapp: 'Riscrivi il messaggio WhatsApp (max 80 parole). Angolo diverso, stesso impatto.',
    email: 'Riscrivi l\'email (100-150 parole). Prima riga: \'Oggetto: [nuovo oggetto]\'. Stile diverso.',
  }

  const prompt = `Sei un esperto di marketing immobiliare italiano.

DATI IMMOBILE:
${summary}

TONO: ${tone}

Rigenera SOLO il campo "${tab}" con un approccio creativo diverso.
${tabInstructions[tab]}

Rispondi con un JSON che contiene SOLO il campo "${tab}":
{"${tab}": "..."}

IMPORTANTE: Solo JSON valido, nessun testo aggiuntivo.`

  const imageParts = photos.map((photo) => ({
    inlineData: { data: photo.data, mimeType: photo.mimeType },
  }))

  const result = await model.generateContent([prompt, ...imageParts])
  const text = result.response.text()
  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  let partial: Partial<GeneratedContent>
  try {
    partial = JSON.parse(clean) as Partial<GeneratedContent>
  } catch {
    throw new Error('Risposta AI non valida: il modello ha restituito un formato non riconosciuto')
  }

  return { ...currentContent, [tab]: partial[tab] ?? currentContent[tab] }
}
