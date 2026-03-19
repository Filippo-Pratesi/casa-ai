export const TONE_LABELS: Record<string, string> = {
  standard: 'Standard',
  luxury: 'Luxury',
  approachable: 'Accessibile',
  investment: 'Investimento',
}

export const TYPE_COLORS: Record<string, string> = {
  apartment: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  house: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  villa: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  commercial: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  land: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  garage: 'bg-muted text-muted-foreground border-border',
  other: 'bg-muted text-muted-foreground border-border',
}

export const TYPE_ACTIVE: Record<string, string> = {
  apartment: 'bg-blue-600 text-white border-blue-600',
  house: 'bg-green-600 text-white border-green-600',
  villa: 'bg-purple-600 text-white border-purple-600',
  commercial: 'bg-orange-600 text-white border-orange-600',
  land: 'bg-amber-500 text-white border-amber-500',
  garage: 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]',
  other: 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]',
}

export const PLACEHOLDER_GRADIENTS: Record<string, string> = {
  apartment: 'from-[oklch(0.57_0.20_33/0.15)] via-[oklch(0.60_0.18_28/0.10)] to-[oklch(0.55_0.16_40/0.20)]',
  house: 'from-[oklch(0.55_0.14_145/0.18)] via-[oklch(0.60_0.12_160/0.10)] to-[oklch(0.57_0.14_130/0.20)]',
  villa: 'from-[oklch(0.55_0.17_290/0.18)] via-[oklch(0.57_0.16_300/0.10)] to-[oklch(0.52_0.18_280/0.20)]',
  commercial: 'from-[oklch(0.60_0.18_50/0.18)] via-[oklch(0.62_0.16_40/0.10)] to-[oklch(0.57_0.18_60/0.20)]',
  land: 'from-[oklch(0.70_0.14_75/0.18)] via-[oklch(0.72_0.12_80/0.10)] to-[oklch(0.66_0.14_70/0.20)]',
  garage: 'from-[oklch(0.57_0.20_33/0.10)] via-[oklch(0.55_0.16_40/0.06)] to-[oklch(0.55_0.14_45/0.14)]',
  other: 'from-[oklch(0.57_0.20_33/0.10)] via-[oklch(0.55_0.16_40/0.06)] to-[oklch(0.55_0.14_45/0.14)]',
}

export interface Listing {
  id: string
  address: string
  city: string
  price: number
  sqm: number
  rooms: number
  property_type: string
  tone: string
  floor: number | null
  photos_urls: string[] | null
  generated_content: unknown
  created_at: string
  agent: { name: string } | null
}

export interface Stats {
  listings: number
  contacts: number
  appointments: number
  aiContent: number
  bancaDati: number
}

export interface DashboardClientProps {
  listings: Listing[]
  stats: Stats
  isAdmin: boolean
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}
