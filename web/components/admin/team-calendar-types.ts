export interface TeamAgent {
  id: string
  name: string
}

export interface TeamAppointment {
  id: string
  agent_id: string
  title: string
  type: string
  status: string
  starts_at: string
  ends_at: string | null
  contact_name: string | null
}

export type ViewMode = 'week' | 'month'

export const AGENT_PALETTE = [
  { bg: 'bg-blue-500',    light: 'bg-blue-50 border-blue-200 text-blue-900',    dot: 'bg-blue-500',    chip: 'bg-blue-500 text-white',    chipOff: 'bg-blue-50 text-blue-500 border border-blue-200' },
  { bg: 'bg-purple-500',  light: 'bg-purple-50 border-purple-200 text-purple-900',  dot: 'bg-purple-500',  chip: 'bg-purple-500 text-white',  chipOff: 'bg-purple-50 text-purple-500 border border-purple-200' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-900', dot: 'bg-emerald-500', chip: 'bg-emerald-500 text-white', chipOff: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  { bg: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200 text-amber-900',   dot: 'bg-amber-500',   chip: 'bg-amber-500 text-white',   chipOff: 'bg-amber-50 text-amber-600 border border-amber-200' },
  { bg: 'bg-rose-500',    light: 'bg-rose-50 border-rose-200 text-rose-900',    dot: 'bg-rose-500',    chip: 'bg-rose-500 text-white',    chipOff: 'bg-rose-50 text-rose-500 border border-rose-200' },
  { bg: 'bg-cyan-500',    light: 'bg-cyan-50 border-cyan-200 text-cyan-900',    dot: 'bg-cyan-500',    chip: 'bg-cyan-500 text-white',    chipOff: 'bg-cyan-50 text-cyan-600 border border-cyan-200' },
]

export const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
export const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const days: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
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

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}
