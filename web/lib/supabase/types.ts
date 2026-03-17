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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      property_type: PropertyType
      tone: Tone
      listing_status: ListingStatus
    }
  }
}
