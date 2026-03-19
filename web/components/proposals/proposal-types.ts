export interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city_of_residence: string | null
}

export interface Listing {
  id: string
  address: string
  city: string
  property_type: string
  price: number | null
}

export type ConditionType = 'mutuo' | 'vendita_immobile' | 'perizia' | 'personalizzata'

export interface Vincolo {
  tipo: ConditionType
  descrizione?: string
  importo_mutuo?: number
  nome_banca?: string
  indirizzo_immobile_vendita?: string
}

export interface ProposalFormProps {
  contacts: Contact[]
  listings: Listing[]
  nextNumber: { anno: number; progressivo: number; numero_proposta: string }
  workspaceName: string
  agentName: string
  mode: 'create' | 'edit'
  initialData?: Record<string, unknown>
  proposalId?: string
}

export const conditionLabels: Record<ConditionType, string> = {
  mutuo: 'Soggetta alla concessione del mutuo',
  vendita_immobile: "Soggetta alla vendita dell'immobile del proponente",
  perizia: 'Soggetta a perizia bancaria positiva',
  personalizzata: 'Condizione personalizzata',
}

export const today = new Date().toISOString().split('T')[0]
// Default validity: 7 days from today
export const defaultValidity = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
