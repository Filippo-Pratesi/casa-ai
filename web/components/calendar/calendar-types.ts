// ── Types ─────────────────────────────────────────────────────────────────────

export interface Listing {
  id: string
  address: string
  city: string
}

export interface Contact {
  id: string
  name: string
}

export interface Agent {
  id: string
  name: string
}

export interface Appointment {
  id: string
  title: string
  type: 'acquisizione' | 'riunione' | 'atto' | 'visita' | 'altro'
  status: 'scheduled' | 'completed' | 'cancelled'
  starts_at: string
  ends_at: string | null
  notes: string | null
  contact_name: string | null
  listing_id: string | null
  contact_id: string | null
  agent_id?: string | null
}

export interface CalendarClientProps {
  userId: string
  role: string
  listings: Listing[]
  contacts: Contact[]
  agents?: Agent[]
  filterAgentId?: string
  filterAgentName?: string
}

export type ViewMode = 'month' | 'week'

// ── Constants ─────────────────────────────────────────────────────────────────

// TYPE_LABELS computed from i18n in each component

export const TYPE_COLORS: Record<string, string> = {
  visita: 'bg-blue-100 text-blue-800 border-blue-200',
  riunione: 'bg-purple-100 text-purple-800 border-purple-200',
  atto: 'bg-green-100 text-green-800 border-green-200',
  acquisizione: 'bg-amber-100 text-amber-800 border-amber-200',
  altro: 'bg-slate-100 text-slate-800 border-slate-200',
}

export const TYPE_DOT: Record<string, string> = {
  visita: 'bg-blue-500',
  riunione: 'bg-purple-500',
  atto: 'bg-green-500',
  acquisizione: 'bg-amber-500',
  altro: 'bg-slate-500',
}

export const AGENT_COLORS = [
  { pill: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  { pill: 'bg-violet-100 text-violet-800 border-violet-300', dot: 'bg-violet-500' },
  { pill: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  { pill: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' },
  { pill: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  { pill: 'bg-cyan-100 text-cyan-800 border-cyan-300', dot: 'bg-cyan-500' },
  { pill: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300', dot: 'bg-fuchsia-500' },
  { pill: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' },
]

export function agentColorIndex(agentId: string): number {
  let h = 0
  for (let i = 0; i < agentId.length; i++) {
    h = (h * 31 + agentId.charCodeAt(i)) >>> 0
  }
  return h % AGENT_COLORS.length
}

// MONTH_NAMES / DAY_NAMES computed from i18n in CalendarClient

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const days: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

export function getWeekDays(anchor: Date): Date[] {
  const dow = (anchor.getDay() + 6) % 7 // Mon=0
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(anchor)
    d.setDate(anchor.getDate() - dow + i)
    days.push(d)
  }
  return days
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}
