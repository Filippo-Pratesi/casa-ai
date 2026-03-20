/**
 * Contact Event Types and Constants
 * Defines cronistoria (contact history) event types and utilities
 */

export const EVENT_TYPES = {
  nota: 'nota',
  chiamata: 'chiamata',
  email: 'email',
  appuntamento: 'appuntamento',
  campagna_inviata: 'campagna_inviata',
  immobile_proposto: 'immobile_proposto',
  // Auto-events: contact/property linking
  immobile_collegato: 'immobile_collegato',
  stato_cambiato: 'stato_cambiato',
  incarico_firmato: 'incarico_firmato',
  vendita_conclusa: 'vendita_conclusa',
  // Auto-events: proposals
  proposta_inviata: 'proposta_inviata',
  proposta_accettata: 'proposta_accettata',
  proposta_rifiutata: 'proposta_rifiutata',
  controproposta_ricevuta: 'controproposta_ricevuta',
  proposta_ritirata: 'proposta_ritirata',
  // Auto-events: lease
  locazione_avviata: 'locazione_avviata',
  locazione_conclusa: 'locazione_conclusa',
  contratto_scaduto: 'contratto_scaduto',
  contratto_in_scadenza: 'contratto_in_scadenza',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

export interface ContactEvent {
  id: string
  workspace_id: string
  contact_id: string
  agent_id: string | null
  event_type: EventType
  title: string
  body: string | null
  related_property_id: string | null
  related_listing_id: string | null
  event_date: string
  created_at: string
}

export interface ContactEventWithAgent extends ContactEvent {
  agent_name: string | null
}

/**
 * Event type display labels (Italian)
 */
export const EVENT_LABELS: Record<EventType, string> = {
  nota: 'Nota',
  chiamata: 'Chiamata',
  email: 'Email',
  appuntamento: 'Appuntamento',
  campagna_inviata: 'Campagna inviata',
  immobile_proposto: 'Immobile proposto',
  immobile_collegato: 'Immobile collegato',
  stato_cambiato: 'Tipo contatto cambiato',
  incarico_firmato: 'Incarico firmato',
  vendita_conclusa: 'Vendita conclusa',
  proposta_inviata: 'Proposta inviata',
  proposta_accettata: 'Proposta accettata',
  proposta_rifiutata: 'Proposta rifiutata',
  controproposta_ricevuta: 'Controproposta ricevuta',
  proposta_ritirata: 'Proposta ritirata',
  locazione_avviata: 'Locazione avviata',
  locazione_conclusa: 'Locazione conclusa',
  contratto_scaduto: 'Contratto scaduto',
  contratto_in_scadenza: 'Contratto in scadenza',
}

/**
 * Event type colors for UI display
 * Uses Tailwind CSS color classes
 */
export const EVENT_COLORS: Record<EventType, string> = {
  nota: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  chiamata: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
  email: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  appuntamento: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  campagna_inviata: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  immobile_proposto: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
  immobile_collegato: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
  stato_cambiato: 'bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-400',
  incarico_firmato: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  vendita_conclusa: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  proposta_inviata: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
  proposta_accettata: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  proposta_rifiutata: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  controproposta_ricevuta: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
  proposta_ritirata: 'bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-400',
  locazione_avviata: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  locazione_conclusa: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  contratto_scaduto: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  contratto_in_scadenza: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
}

/**
 * Event type icons (lucide-react icon names)
 */
export const EVENT_ICON_NAMES: Record<EventType, string> = {
  nota: 'FileText',
  chiamata: 'Phone',
  email: 'Mail',
  appuntamento: 'Calendar',
  campagna_inviata: 'Megaphone',
  immobile_proposto: 'Home',
  immobile_collegato: 'Home',
  stato_cambiato: 'RefreshCw',
  incarico_firmato: 'PenLine',
  vendita_conclusa: 'CheckCircle2',
  proposta_inviata: 'Send',
  proposta_accettata: 'ThumbsUp',
  proposta_rifiutata: 'ThumbsDown',
  controproposta_ricevuta: 'ArrowLeftRight',
  proposta_ritirata: 'Undo2',
  locazione_avviata: 'KeyRound',
  locazione_conclusa: 'KeyRound',
  contratto_scaduto: 'AlertCircle',
  contratto_in_scadenza: 'Clock',
}

/**
 * Logical event sequence templates per contact type
 * Provides realistic interaction history for seeding and testing
 */
export const EVENT_TEMPLATES = {
  buyer: {
    nota: [
      'Cliente interessato a acquistare. Compilato form online con preferenze. Segue-up necessario.',
      'Discussione su budget, timeline, e preferenze. Cliente molto disponibile a riunioni. Interesse confermato.',
      'Cliente ha visitato 2 proprietà interessanti. Feedback positivo su una. Desideroso di approfondire. Timeline: decisione entro 2 settimane.',
      'Cliente ha deciso di fare offerta per una proprietà. Pre-approvazione mutuo in corso. Previsione closing tra 6-8 settimane. Momentum positivo.',
      'Contattare per aggiornamento su stato ispezione e mutuo. Atteso timeline finale per closing.',
    ],
    chiamata: [
      'Prima telefonata di consultazione - Discussione su esigenze, budget, e preferenze',
      'Telefonata di aggiornamento settimanale - Progressi, feedback sulle visite, e prossimi step',
      'Telefonata per discutere offerta, condizioni di negoziazione, e timeline mutuo',
    ],
    email: [
      'Email inviata con catalogo, schede tecniche, e 3-5 proprietà che corrispondono ai criteri',
      'Email con nuovi annunci settimanali potenzialmente rilevanti',
    ],
    appuntamento: [
      'Riunione in agenzia per valutare opzioni, discutere strategy di ricerca, e stabilire timeline',
      'Visita guidata di proprietà interessante',
    ],
  },
  seller: {
    nota: [
      "Proprietario interessato a vendere. Contatto iniziale molto promettente. Visita preliminare consigliata.",
      "Visione preliminare dell'immobile concordata. Proprietario organizzato. Quotazione di mercato discussa.",
      "Valutazione preliminare completata. Prezzo di mercato concordato. Proprietario pronto per pubblicare annuncio online.",
      "Annuncio pubblicato su 5 piattaforme. Già ricevute 4 richieste di visita per il prossimo weekend. Response molto positivo.",
      "Due visite proprietà programmate per il weekend. Proprietario molto disponibile. Monitorare feedback potenziali acquirenti.",
    ],
    chiamata: [
      "Prima telefonata per concordare visione preliminare dell'immobile",
      "Telefonata per discutere valutazione, strategie di marketing, e timeline",
      "Aggiornamento settimanale su visite ricevute, feedback potenziali acquirenti, e offerte",
    ],
    email: [
      "Email inviata con valutazione di mercato e strategie di pricing",
      "Email con report settimanale su visite ricevute e engagement",
    ],
    appuntamento: [
      "Riunione per valutazione preliminare dell'immobile",
      "Incontro con potenziali acquirenti interessati",
    ],
  },
  renter: {
    nota: [
      "Inquilino interessato a locare. Necessita urgentemente tra 1-2 mesi. Buona potenziale.",
      "Discussi requisiti di locazione. Cliente ha dichiarato disponibilità economica. Referenze da verificare.",
      "Cliente ha visitato appartamento disponibile. Ha fatto buona impressione ai proprietari. In attesa di decision.",
      "Contratto di locazione praticamente concordato. Cliente molto soddisfatto. Inizio previsto per il mese prossimo.",
      "Controllare status firma documenti finali. Deposito cauzione già ricevuto. Chiavi pronte per consegna.",
    ],
    chiamata: [
      "Prima consulenza telefonica - Discussione su requisiti, budget, e timeline urgenza",
      "Telefonata per coordinare visita appartamento e discussare termini",
      "Aggiornamento su status documentazione, contratto, e prossimi step",
    ],
    email: [
      "Email inviata con lista proprietà disponibili per locazione",
      "Email con documentazione contrattuale e requisiti necessari",
    ],
    appuntamento: [
      "Visita guidata dell'appartamento in locazione",
      "Riunione per firmare contratto e coordinarsi su trasloco",
    ],
  },
  landlord: {
    nota: [
      "Proprietario che desidera affittare. Immobile in buone condizioni. Interesse alto.",
      "Discussione su condizioni di locazione, costi di gestione, e profilo inquilino ideale. Molto collaborativo.",
      "Proprietario soddisfatto della documentazione e agenzia. Pronto a procedere con contratto di locazione.",
      "Inquilino identificato e approvato dopo screening approfondito. Documentazione completa raccolta. Contratto di locazione pronto.",
      "Contattare per confermare data esatta trasloco dell'inquilino. Supporto amministrativo coordinato.",
    ],
    chiamata: [
      'Prima telefonata di consultazione su gestione della proprietà e termini di locazione',
      'Telefonata per discutere profilo inquilino ideale e condizioni contrattuali',
      'Aggiornamento settimanale su candidati, screening, e timeline',
    ],
    email: [
      'Email inviata con proposte di gestione proprietà',
      'Email con modello contratto di locazione e documentazione richiesta',
    ],
    appuntamento: [
      'Riunione per discutere strategia di locazione e profilo inquilino',
      'Meeting con inquilino per presentazione proprietà',
    ],
  },
} as const

/**
 * Description for each event type
 * Useful for documentation and onboarding
 */
export const EVENT_TYPE_DESCRIPTIONS: Record<EventType, string> = {
  nota: 'Nota personale o aggiornamento di status sulla situazione del cliente',
  chiamata: 'Telefonata o conversazione diretta con il cliente',
  email: 'Comunicazione via email al cliente',
  appuntamento: 'Appuntamento fisico o riunione programmata con il cliente',
  campagna_inviata: 'Newsletter, campagna email, o comunicazione di massa inviata',
  immobile_proposto: 'Immobile o proprietà proposto/a al cliente',
  immobile_collegato: 'Immobile collegato a questo contatto nella Banca Dati',
  stato_cambiato: 'Tipo contatto modificato (es. acquirente → venditore)',
  incarico_firmato: 'Contratto di incarico firmato per un immobile',
  vendita_conclusa: 'Vendita di un immobile conclusa con successo',
  proposta_inviata: 'Proposta di acquisto inviata al venditore',
  proposta_accettata: 'Proposta di acquisto accettata',
  proposta_rifiutata: 'Proposta di acquisto rifiutata',
  controproposta_ricevuta: 'Controproposta ricevuta dal venditore',
  proposta_ritirata: 'Proposta di acquisto ritirata',
  locazione_avviata: 'Contratto di locazione avviato per un immobile',
  locazione_conclusa: 'Contratto di locazione concluso',
  contratto_scaduto: 'Contratto di locazione scaduto',
  contratto_in_scadenza: 'Contratto di locazione in prossima scadenza',
}

/**
 * Helper to get event type from string (case-insensitive)
 */
export function parseEventType(value: string): EventType | null {
  const normalized = value.toLowerCase().trim()
  return Object.values(EVENT_TYPES).find(t => t === normalized) as EventType | undefined || null
}

/**
 * Get all event types
 */
export function getAllEventTypes(): EventType[] {
  return Object.values(EVENT_TYPES)
}

/**
 * Check if a value is a valid event type
 */
export function isValidEventType(value: unknown): value is EventType {
  return typeof value === 'string' && Object.values(EVENT_TYPES).includes(value as EventType)
}
