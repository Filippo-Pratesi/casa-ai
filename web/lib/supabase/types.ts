export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'group_admin' | 'admin' | 'agent'
export type ListingStatus = 'draft' | 'published'
export type PropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'commercial'
  | 'land'
  | 'garage'
  | 'other'
export type Tone = 'standard' | 'luxury' | 'approachable' | 'investment'
export type ContactType = 'buyer' | 'seller' | 'renter' | 'landlord' | 'other'
export type PropertyStageType =
  | 'sconosciuto'
  | 'ignoto'
  | 'conosciuto'
  | 'incarico'
  | 'venduto'
  | 'locato'
export type OwnerDisposition =
  | 'non_definito'
  | 'non_vende'
  | 'vende_sicuramente'
  | 'sta_pensando'
  | 'sta_esplorando'
  | 'in_attesa'
  | 'da_ricontattare'
  | 'notizia_ricevuta'
  | 'incarico_firmato'
  | 'appena_acquistato'
export type PropertyTransactionType = 'vendita' | 'affitto'
export type LeaseType = '4_plus_4' | '3_plus_2' | 'transitorio' | 'foresteria' | 'altro'
export type PropertyEventType =
  | 'nota'
  | 'telefonata'
  | 'visita'
  | 'citofono'
  | 'email_inviata'
  | 'whatsapp_inviato'
  | 'riunione'
  | 'documento_caricato'
  | 'incarico_firmato'
  | 'proposta_ricevuta'
  | 'proposta_accettata'
  | 'proposta_rifiutata'
  | 'proprietario_identificato'
  | 'proprietario_cambiato'
  | 'cambio_stage'
  | 'annuncio_creato'
  | 'annuncio_pubblicato'
  | 'venduto'
  | 'locato'
  | 'contratto_scaduto'
  | 'archiviato'
  | 'ritorno'
  | 'valutazione_ai'
  | 'insight_ai'
  | 'altro'
export type Sentiment = 'positive' | 'neutral' | 'negative'
export type PropertyContactRole =
  | 'proprietario'
  | 'moglie_marito'
  | 'figlio_figlia'
  | 'vicino'
  | 'portiere'
  | 'amministratore'
  | 'avvocato'
  | 'commercialista'
  | 'precedente_proprietario'
  | 'inquilino'
  | 'venditore'
  | 'acquirente'
  | 'altro'
export type ContactEventType =
  | 'nota'
  | 'chiamata'
  | 'email'
  | 'appuntamento'
  | 'campagna_inviata'
  | 'immobile_proposto'
  | 'immobile_collegato'
  | 'stato_cambiato'
  | 'incarico_firmato'
  | 'vendita_conclusa'
  | 'proposta_inviata'
  | 'proposta_accettata'
  | 'proposta_rifiutata'
  | 'controproposta_ricevuta'
  | 'proposta_ritirata'
  | 'locazione_avviata'
  | 'locazione_conclusa'
  | 'contratto_scaduto'
  | 'contratto_in_scadenza'
export type InvoiceStatus = 'bozza' | 'inviata' | 'pagata' | 'scaduta'
export type RegimeFiscale = 'ordinario' | 'forfettario' | 'esente'
export type ProposalStatus =
  | 'bozza'
  | 'inviata'
  | 'accettata'
  | 'rifiutata'
  | 'scaduta'
  | 'controproposta'
  | 'ritirata'
export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'failed'

export interface Group {
  id: string
  name: string
  logo_url: string | null
  show_cross_agency_results: boolean
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  logo_url: string | null
  tone_default: Tone
  plan: 'trial' | 'starter' | 'growth' | 'network'
  stripe_customer_id: string | null
  group_id: string | null
  created_at: string
}

export interface User {
  id: string
  workspace_id: string
  name: string
  email: string
  role: UserRole
  group_id: string | null
  phone: string | null
  address: string | null
  partita_iva: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export interface Listing {
  id: string
  workspace_id: string
  agent_id: string
  property_type: PropertyType
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
  photos_urls: string[]
  vision_labels: Json
  generated_content: GeneratedContent | null
  status: ListingStatus
  property_id: string | null
  view_count: number
  share_count: number
  portal_click_count: number
  floor_plan_url: string | null
  match_stale: boolean
  created_at: string
}

export interface GeneratedContent {
  listing_it: string
  listing_en: string
  instagram: string
  facebook: string
  whatsapp: string
  email: string
}

export interface Contact {
  id: string
  workspace_id: string
  agent_id: string
  name: string
  email: string | null
  phone: string | null
  phone_normalized: string | null
  type: ContactType
  types: string[] | null
  roles: string[]
  city_of_residence: string | null
  address_of_residence: string | null
  notes: string | null
  budget_min: number | null
  budget_max: number | null
  preferred_cities: string[] | null
  preferred_types: string[] | null
  min_sqm: number | null
  min_rooms: number | null
  desired_features: string[] | null
  codice_fiscale: string | null
  partita_iva: string | null
  professione: string | null
  data_nascita: string | null
  privacy_consent: boolean | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  workspace_id: string
  agent_id: string
  address: string
  city: string
  latitude: number | null
  longitude: number | null
  zone: string | null
  sub_zone: string | null
  doorbell: string | null
  building_notes: string | null
  stage: PropertyStageType
  owner_disposition: OwnerDisposition
  transaction_type: PropertyTransactionType | null
  owner_contact_id: string | null
  property_type: PropertyType | null
  sqm: number | null
  rooms: number | null
  bathrooms: number | null
  floor: number | null
  total_floors: number | null
  condition: string | null
  features: string[]
  estimated_value: number | null
  incarico_type: string | null
  incarico_date: string | null
  incarico_expiry: string | null
  incarico_commission_percent: number | null
  incarico_notes: string | null
  foglio: string | null
  particella: string | null
  subalterno: string | null
  categoria_catastale: string | null
  rendita_catastale: number | null
  cadastral_data: Json | null
  cadastral_data_fetched_at: string | null
  listing_id: string | null
  lease_type: LeaseType | null
  lease_start_date: string | null
  lease_end_date: string | null
  monthly_rent: number | null
  monthly_rent_discounted: number | null
  discount_notes: string | null
  deposit: number | null
  tenant_contact_id: string | null
  lease_notes: string | null
  sold_at: string | null
  sold_to_contact_id: string | null
  sold_price: number | null
  labels: string[]
  ai_score: number
  ai_notes: Json
  metadata: Json
  created_at: string
  updated_at: string
}

export interface PropertyEvent {
  id: string
  workspace_id: string
  property_id: string
  agent_id: string | null
  event_type: PropertyEventType
  title: string
  description: string | null
  notes: string | null
  sentiment: Sentiment | null
  old_stage: PropertyStageType | null
  new_stage: PropertyStageType | null
  contact_id: string | null
  metadata: Json
  event_date: string
  created_at: string
}

export interface PropertyContact {
  id: string
  workspace_id: string
  property_id: string
  contact_id: string
  role: PropertyContactRole
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ContactEvent {
  id: string
  workspace_id: string
  contact_id: string
  agent_id: string | null
  event_type: ContactEventType
  title: string
  body: string | null
  related_property_id: string | null
  related_listing_id: string | null
  event_date: string
  created_at: string
}

export interface Zone {
  id: string
  workspace_id: string
  city: string
  name: string
  created_at: string
  updated_at: string
}

export interface SubZone {
  id: string
  workspace_id: string
  zone_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface AgentZone {
  id: string
  workspace_id: string
  agent_id: string
  zone_id: string
  sub_zone_id: string | null
  created_at: string
}

export interface Todo {
  id: string
  workspace_id: string
  created_by: string
  assigned_to: string
  title: string
  notes: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
}

export interface ListingPriceHistory {
  id: string
  listing_id: string
  old_price: number
  new_price: number
  changed_at: string
}

export interface ArchivedListing {
  id: string
  original_id: string
  workspace_id: string
  agent_id: string
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
  tone: string
  photos_urls: string[]
  generated_content: Json | null
  sold: boolean
  sold_to_contact_id: string | null
  sold_to_name: string | null
  archived_at: string
  archived_by_user_id: string
}

export interface ArchivedContact {
  id: string
  original_id: string
  workspace_id: string
  agent_id: string
  name: string
  type: string
  email: string | null
  phone: string | null
  city_of_residence: string | null
  address_of_residence: string | null
  notes: string | null
  budget_min: number | null
  budget_max: number | null
  preferred_cities: string[]
  preferred_types: string[]
  min_sqm: number | null
  min_rooms: number | null
  desired_features: string[]
  bought_listing: boolean
  bought_listing_id: string | null
  bought_listing_address: string | null
  archived_at: string
  archived_by_user_id: string
}

export interface Notification {
  id: string
  workspace_id: string
  agent_id: string
  type: string
  title: string
  body: string
  contact_id: string | null
  read: boolean
  created_at: string
}

export interface Campaign {
  id: string
  workspace_id: string
  created_by: string
  subject: string
  body_html: string
  body_text: string
  template: string
  recipient_filter: Json
  status: CampaignStatus
  sent_count: number
  opened_count: number
  created_at: string
  sent_at: string | null
}

export interface Invoice {
  id: string
  workspace_id: string
  agent_id: string
  numero_fattura: string
  anno: number
  progressivo: number
  contact_id: string | null
  listing_id: string | null
  cliente_nome: string
  cliente_indirizzo: string | null
  cliente_citta: string | null
  cliente_cap: string | null
  cliente_provincia: string | null
  cliente_codice_fiscale: string | null
  cliente_pec: string | null
  cliente_codice_sdi: string | null
  emittente_nome: string
  emittente_indirizzo: string | null
  emittente_citta: string | null
  emittente_cap: string | null
  emittente_provincia: string | null
  emittente_partita_iva: string | null
  emittente_codice_fiscale: string | null
  regime: RegimeFiscale
  descrizione: string
  imponibile: number
  aliquota_iva: number
  importo_iva: number
  ritenuta_acconto: boolean
  aliquota_ritenuta: number
  importo_ritenuta: number
  contributo_cassa: boolean
  aliquota_cassa: number
  importo_cassa: number
  totale_documento: number
  netto_a_pagare: number
  voci: Json
  metodo_pagamento: string
  iban: string | null
  data_emissione: string
  data_scadenza: string | null
  data_pagamento: string | null
  note: string | null
  status: InvoiceStatus
  sent_at: string | null
  sent_to_email: string | null
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: string
  workspace_id: string
  agent_id: string
  listing_id: string
  buyer_contact_id: string
  immobile_indirizzo: string
  immobile_citta: string
  immobile_tipo: string
  prezzo_richiesto: number
  proponente_nome: string
  proponente_codice_fiscale: string | null
  proponente_indirizzo: string | null
  proponente_telefono: string | null
  proponente_email: string | null
  proprietario_nome: string | null
  proprietario_codice_fiscale: string | null
  agente_nome: string
  agente_agenzia: string
  prezzo_offerto: number
  caparra_confirmatoria: number
  caparra_in_gestione_agenzia: boolean
  data_proposta: string
  validita_proposta: string
  data_rogito_proposta: string | null
  notaio_preferito: string | null
  note: string | null
  vincoli: Json
  numero_proposta: string
  anno: number
  progressivo: number
  status: ProposalStatus
  risposta_venditore: string | null
  data_risposta: string | null
  created_at: string
  updated_at: string
}

export interface MatchResult {
  id: string
  workspace_id: string
  property_id: string
  contact_id: string
  deterministic_score: number
  ai_adjustment: number
  combined_score: number
  ai_reason: string | null
  ai_confidence: string | null
  property_data_hash: string | null
  contact_data_hash: string | null
  property_events_cursor: string | null
  computed_at: string
  computation_version: number
  stale: boolean
}

export interface OmiQuotation {
  id: string
  codice_comune: string
  comune_nome: string
  provincia: string | null
  zona_omi: string
  tipo_immobile: string
  stato_conservazione: string | null
  valore_min_mq: number
  valore_max_mq: number
  semestre: string
  fonte: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: Group
        Insert: Omit<Group, 'id' | 'created_at'>
        Update: Partial<Omit<Group, 'id' | 'created_at'>>
      }
      workspaces: {
        Row: Workspace
        Insert: Omit<Workspace, 'id' | 'created_at'>
        Update: Partial<Omit<Workspace, 'id' | 'created_at'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      listings: {
        Row: Listing
        Insert: Omit<Listing, 'id' | 'created_at'>
        Update: Partial<Omit<Listing, 'id' | 'created_at'>>
      }
      contacts: {
        Row: Contact
        Insert: Omit<Contact, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>
      }
      properties: {
        Row: Property
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Property, 'id' | 'created_at' | 'updated_at'>>
      }
      property_events: {
        Row: PropertyEvent
        Insert: Omit<PropertyEvent, 'id' | 'created_at'>
        Update: Partial<Omit<PropertyEvent, 'id' | 'created_at'>>
      }
      property_contacts: {
        Row: PropertyContact
        Insert: Omit<PropertyContact, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PropertyContact, 'id' | 'created_at' | 'updated_at'>>
      }
      contact_events: {
        Row: ContactEvent
        Insert: Omit<ContactEvent, 'id' | 'created_at'>
        Update: Partial<Omit<ContactEvent, 'id' | 'created_at'>>
      }
      zones: {
        Row: Zone
        Insert: Omit<Zone, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Zone, 'id' | 'created_at' | 'updated_at'>>
      }
      sub_zones: {
        Row: SubZone
        Insert: Omit<SubZone, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SubZone, 'id' | 'created_at' | 'updated_at'>>
      }
      agent_zones: {
        Row: AgentZone
        Insert: Omit<AgentZone, 'id' | 'created_at'>
        Update: Partial<Omit<AgentZone, 'id' | 'created_at'>>
      }
      todos: {
        Row: Todo
        Insert: Omit<Todo, 'id' | 'created_at'>
        Update: Partial<Omit<Todo, 'id' | 'created_at'>>
      }
      listing_price_history: {
        Row: ListingPriceHistory
        Insert: Omit<ListingPriceHistory, 'id' | 'changed_at'>
        Update: Partial<Omit<ListingPriceHistory, 'id' | 'changed_at'>>
      }
      archived_listings: {
        Row: ArchivedListing
        Insert: Omit<ArchivedListing, 'id' | 'archived_at'>
        Update: Partial<Omit<ArchivedListing, 'id' | 'archived_at'>>
      }
      archived_contacts: {
        Row: ArchivedContact
        Insert: Omit<ArchivedContact, 'id' | 'archived_at'>
        Update: Partial<Omit<ArchivedContact, 'id' | 'archived_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      campaigns: {
        Row: Campaign
        Insert: Omit<Campaign, 'id' | 'created_at'>
        Update: Partial<Omit<Campaign, 'id' | 'created_at'>>
      }
      invoices: {
        Row: Invoice
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>
      }
      proposals: {
        Row: Proposal
        Insert: Omit<Proposal, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Proposal, 'id' | 'created_at' | 'updated_at'>>
      }
      match_results: {
        Row: MatchResult
        Insert: Omit<MatchResult, 'id' | 'computed_at'>
        Update: Partial<Omit<MatchResult, 'id' | 'computed_at'>>
      }
      omi_quotations: {
        Row: OmiQuotation
        Insert: Omit<OmiQuotation, 'id' | 'created_at'>
        Update: Partial<Omit<OmiQuotation, 'id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      property_type: PropertyType
      tone: Tone
      listing_status: ListingStatus
      contact_type: ContactType
      property_stage: PropertyStageType
      owner_disposition: OwnerDisposition
      property_transaction_type: PropertyTransactionType
      lease_type: LeaseType
      property_event_type: PropertyEventType
      sentiment: Sentiment
      property_contact_role: PropertyContactRole
      invoice_status: InvoiceStatus
      regime_fiscale: RegimeFiscale
      proposal_status: ProposalStatus
    }
  }
}
