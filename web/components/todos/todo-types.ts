export interface Todo {
  id: string
  title: string
  notes: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_by: string
  assigned_to: string
  created_at: string
}

export interface Member {
  id: string
  name: string
}

export interface TodosClientProps {
  initialTodos: Todo[]
  currentUserId: string
  members: Member[]
  memberMap: Record<string, string>
}

export const PRIORITY_CONFIG = {
  high:   { label: 'Alta',  color: 'text-red-500',   dot: 'bg-red-500',   ring: 'ring-red-200',   bg: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' },
  medium: { label: 'Media', color: 'text-amber-500', dot: 'bg-amber-400', ring: 'ring-amber-200', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800' },
  low:    { label: 'Bassa', color: 'text-green-500', dot: 'bg-green-400', ring: 'ring-green-200', bg: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' },
}

// Localized date formatting
export function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function tomorrowISO() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function nextWeekISO() {
  const d = new Date(); d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

export function isOverdue(due_date: string | null, completed: boolean) {
  if (!due_date || completed) return false
  return due_date < todayISO()
}

export function isToday(due_date: string | null) {
  return due_date === todayISO()
}

export function dueDateLabel(due_date: string | null) {
  if (!due_date) return null
  if (due_date === todayISO()) return 'Oggi'
  if (due_date === tomorrowISO()) return 'Domani'
  return fmtDate(due_date)
}
