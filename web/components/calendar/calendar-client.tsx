'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useI18n } from '@/lib/i18n/context'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Listing {
  id: string
  address: string
  city: string
}

interface Contact {
  id: string
  name: string
}

interface Agent {
  id: string
  name: string
}

interface Appointment {
  id: string
  title: string
  type: 'viewing' | 'meeting' | 'signing' | 'call' | 'other'
  status: 'scheduled' | 'completed' | 'cancelled'
  starts_at: string
  ends_at: string | null
  notes: string | null
  contact_name: string | null
  listing_id: string | null
  contact_id: string | null
  agent_id?: string | null
}

interface CalendarClientProps {
  userId: string
  role: string
  listings: Listing[]
  contacts: Contact[]
  agents?: Agent[]
  filterAgentId?: string
  filterAgentName?: string
}

type ViewMode = 'month' | 'week'

// ── Constants ─────────────────────────────────────────────────────────────────

// TYPE_LABELS computed from i18n in each component

const TYPE_COLORS: Record<string, string> = {
  viewing: 'bg-blue-100 text-blue-800 border-blue-200',
  meeting: 'bg-purple-100 text-purple-800 border-purple-200',
  signing: 'bg-green-100 text-green-800 border-green-200',
  call: 'bg-amber-100 text-amber-800 border-amber-200',
  other: 'bg-neutral-100 text-neutral-700 border-neutral-200',
}

const TYPE_DOT: Record<string, string> = {
  viewing: 'bg-blue-500',
  meeting: 'bg-purple-500',
  signing: 'bg-green-500',
  call: 'bg-amber-500',
  other: 'bg-neutral-400',
}

const AGENT_COLORS = [
  { pill: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  { pill: 'bg-violet-100 text-violet-800 border-violet-300', dot: 'bg-violet-500' },
  { pill: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  { pill: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' },
  { pill: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  { pill: 'bg-cyan-100 text-cyan-800 border-cyan-300', dot: 'bg-cyan-500' },
  { pill: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300', dot: 'bg-fuchsia-500' },
  { pill: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' },
]

function agentColorIndex(agentId: string): number {
  let h = 0
  for (let i = 0; i < agentId.length; i++) {
    h = (h * 31 + agentId.charCodeAt(i)) >>> 0
  }
  return h % AGENT_COLORS.length
}

// MONTH_NAMES / DAY_NAMES computed from i18n in CalendarClient

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const days: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function getWeekDays(anchor: Date): Date[] {
  const dow = (anchor.getDay() + 6) % 7 // Mon=0
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(anchor)
    d.setDate(anchor.getDate() - dow + i)
    days.push(d)
  }
  return days
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ── Appointment Modal ─────────────────────────────────────────────────────────

interface ModalProps {
  listings: Listing[]
  contacts: Contact[]
  agents?: Agent[]
  currentUserId: string
  initial?: { date?: Date }
  editing?: Appointment
  onClose: () => void
  onSaved: () => void
}

function AppointmentModal({ listings, contacts, agents, currentUserId, initial, editing, onClose, onSaved }: ModalProps) {
  const { t } = useI18n()
  const typeLabels: Record<string, string> = {
    viewing: t('calendar.type.viewing'),
    meeting: t('calendar.type.meeting'),
    signing: t('calendar.type.signing'),
    call: t('calendar.type.call'),
    other: t('calendar.type.other'),
  }
  const defaultDate = initial?.date ?? new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

  const [title, setTitle] = useState(editing?.title ?? '')
  const [type, setType] = useState<Appointment['type']>(editing?.type ?? 'viewing')
  const [date, setDate] = useState(editing ? toDateInput(new Date(editing.starts_at)) : toDateInput(defaultDate))
  const [startTime, setStartTime] = useState(editing ? toTimeInput(new Date(editing.starts_at)) : '09:00')
  const [endTime, setEndTime] = useState(editing?.ends_at ? toTimeInput(new Date(editing.ends_at)) : '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [contactId, setContactId] = useState(editing?.contact_id ?? '')
  const [listingId, setListingId] = useState(editing?.listing_id ?? '')
  const [assignedAgentId, setAssignedAgentId] = useState(currentUserId)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date || !startTime) return
    setLoading(true)
    try {
      const starts_at = new Date(`${date}T${startTime}:00`).toISOString()
      const ends_at = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : null
      const selectedContact = contacts.find(c => c.id === contactId)
      const body: Record<string, unknown> = {
        title: title.trim(),
        type,
        starts_at,
        ends_at,
        notes: notes.trim() || null,
        contact_id: contactId || null,
        contact_name: selectedContact?.name ?? null,
        listing_id: listingId || null,
        agent_id: assignedAgentId || null,
      }
      const url = editing ? `/api/appointments/${editing.id}` : '/api/appointments'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? 'Errore nel salvataggio')
        return
      }
      toast.success(editing ? 'Appuntamento aggiornato' : 'Appuntamento creato')
      onSaved()
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            {editing ? t('calendar.modal.editAppt') : t('calendar.modal.newAppt')}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100 transition-colors">
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">{t('calendar.modal.title')}</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder={t('calendar.modal.titlePlaceholder')}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">{t('calendar.modal.type')}</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(typeLabels) as Appointment['type'][]).map(apptType => (
                <button
                  key={apptType}
                  type="button"
                  onClick={() => setType(apptType)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    type === apptType ? TYPE_COLORS[apptType] : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                  }`}
                >
                  {typeLabels[apptType]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('calendar.modal.date')}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('calendar.modal.start')}</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('calendar.modal.end')}</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
            </div>
          </div>
          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('calendar.modal.client')}</label>
              <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300">
                <option value="">{t('calendar.modal.none')}</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {listings.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('calendar.modal.listing')}</label>
              <select value={listingId} onChange={e => setListingId(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300">
                <option value="">{t('calendar.modal.none')}</option>
                {listings.map(l => <option key={l.id} value={l.id}>{l.address}, {l.city}</option>)}
              </select>
            </div>
          )}
          {agents && agents.length > 1 && !editing && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('calendar.modal.assignTo')}</label>
              <select value={assignedAgentId} onChange={e => setAssignedAgentId(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300">
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.id === currentUserId ? t('calendar.modal.you') : ''}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">{t('calendar.modal.notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={t('calendar.modal.notesPlaceholder')} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading} className="flex-1 h-9 text-sm">
              {loading ? t('calendar.modal.saving') : editing ? t('calendar.modal.update') : t('calendar.modal.create')}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-sm px-4">{t('calendar.modal.cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Appointment Card ──────────────────────────────────────────────────────────

interface CardProps {
  appt: Appointment
  listings: Listing[]
  agentColor?: string
  onStatusChange: (id: string, status: Appointment['status']) => void
  onEdit: (appt: Appointment) => void
  onDelete: (id: string) => void
}

function AppointmentCard({ appt, listings, agentColor, onStatusChange, onEdit, onDelete }: CardProps) {
  const { t } = useI18n()
  const listing = appt.listing_id ? listings.find(l => l.id === appt.listing_id) : null
  const isCancelled = appt.status === 'cancelled'
  const isCompleted = appt.status === 'completed'
  const colorClass = agentColor ?? TYPE_COLORS[appt.type]

  return (
    <div className={`rounded-xl border px-4 py-3 transition-all duration-150 hover:shadow-md ${isCancelled ? 'opacity-50' : ''} ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[appt.type]}`} />
            <span className="text-xs font-medium opacity-80">{t(`calendar.type.${appt.type}`)}</span>
          </div>
          <p className={`text-sm font-semibold truncate ${isCancelled ? 'line-through' : ''}`}>{appt.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs opacity-70">
              <Clock className="h-3 w-3" />
              {formatTime(appt.starts_at)}
              {appt.ends_at && ` – ${formatTime(appt.ends_at)}`}
            </span>
            {appt.contact_name && (
              <span className="flex items-center gap-1 text-xs opacity-70 truncate">
                <Phone className="h-3 w-3 shrink-0" />
                {appt.contact_name}
              </span>
            )}
          </div>
          {listing && (
            <span className="flex items-center gap-1 text-xs opacity-70 mt-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {listing.address}
            </span>
          )}
          {appt.notes && <p className="text-xs opacity-60 mt-1 line-clamp-1">{appt.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {appt.status === 'scheduled' && (
            <>
              <button onClick={() => onStatusChange(appt.id, 'completed')} title="Completato" className="rounded-lg p-1 hover:bg-black/10 transition-colors">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onStatusChange(appt.id, 'cancelled')} title="Annulla" className="rounded-lg p-1 hover:bg-black/10 transition-colors">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {(isCompleted || isCancelled) && (
            <button onClick={() => onStatusChange(appt.id, 'scheduled')} title="Ripristina" className="rounded-lg p-1 hover:bg-black/10 transition-colors text-xs font-medium opacity-60">↩</button>
          )}
          <button onClick={() => onEdit(appt)} title="Modifica" className="rounded-lg p-1 hover:bg-black/10 transition-colors">
            <Calendar className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(appt.id)} title="Elimina" className="rounded-lg p-1 hover:bg-black/10 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CalendarClient({ listings, contacts, agents, role, userId, filterAgentId, filterAgentName }: CalendarClientProps) {
  const { t } = useI18n()
  const MONTH_NAMES = useMemo(() => [
    t('calendar.month.jan'), t('calendar.month.feb'), t('calendar.month.mar'),
    t('calendar.month.apr'), t('calendar.month.may'), t('calendar.month.jun'),
    t('calendar.month.jul'), t('calendar.month.aug'), t('calendar.month.sep'),
    t('calendar.month.oct'), t('calendar.month.nov'), t('calendar.month.dec'),
  ], [t])
  const DAY_NAMES = useMemo(() => [
    t('calendar.day.mon'), t('calendar.day.tue'), t('calendar.day.wed'),
    t('calendar.day.thu'), t('calendar.day.fri'), t('calendar.day.sat'), t('calendar.day.sun'),
  ], [t])
  const today = new Date()
  const [view, setView] = useState<ViewMode>('month')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>()
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>()
  const [hiddenAgents, setHiddenAgents] = useState<Set<string>>(new Set())
  const [googleEvents, setGoogleEvents] = useState<Array<{ id: string; summary: string; start: string; end: string }>>([])

  const isAdmin = role === 'admin' || role === 'group_admin'
  const showAgentBar = isAdmin && !!agents && agents.length > 1

  // Restore preferences from localStorage
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('calendar-view') as ViewMode | null
      if (savedView === 'month' || savedView === 'week') setView(savedView)
      const savedHidden = localStorage.getItem('calendar-hidden-agents')
      if (savedHidden) setHiddenAgents(new Set(JSON.parse(savedHidden)))
    } catch { /* ignore */ }
  }, [])

  function setViewAndSave(v: ViewMode) {
    setView(v)
    try { localStorage.setItem('calendar-view', v) } catch { /* ignore */ }
  }

  function toggleAgent(agentId: string) {
    setHiddenAgents(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) next.delete(agentId)
      else next.add(agentId)
      try { localStorage.setItem('calendar-hidden-agents', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(year, month, 1).toISOString()
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
      const url = `/api/appointments?from=${from}&to=${to}`
      const [apptRes, gcalRes] = await Promise.all([
        fetch(url),
        fetch(`/api/calendar/google-events?from=${from}&to=${to}`),
      ])
      if (apptRes.ok) setAppointments((await apptRes.json()).appointments ?? [])
      if (gcalRes.ok) setGoogleEvents((await gcalRes.json()).events ?? [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  // Filter by hidden agents
  const visibleAppointments = appointments.filter(a => !a.agent_id || !hiddenAgents.has(a.agent_id))

  function prevPeriod() {
    if (view === 'week') {
      const d = new Date(selectedDay)
      d.setDate(d.getDate() - 7)
      setSelectedDay(d)
      if (d.getMonth() !== month || d.getFullYear() !== year) {
        setMonth(d.getMonth())
        setYear(d.getFullYear())
      }
    } else {
      if (month === 0) { setYear(y => y - 1); setMonth(11) }
      else setMonth(m => m - 1)
    }
  }

  function nextPeriod() {
    if (view === 'week') {
      const d = new Date(selectedDay)
      d.setDate(d.getDate() + 7)
      setSelectedDay(d)
      if (d.getMonth() !== month || d.getFullYear() !== year) {
        setMonth(d.getMonth())
        setYear(d.getFullYear())
      }
    } else {
      if (month === 11) { setYear(y => y + 1); setMonth(0) }
      else setMonth(m => m + 1)
    }
  }

  async function handleStatusChange(id: string, status: Appointment['status']) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('Errore'); return }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Errore nella cancellazione'); return }
    toast.success('Appuntamento eliminato')
    setAppointments(prev => prev.filter(a => a.id !== id))
  }

  function openNewModal(date?: Date) {
    setEditingAppt(undefined)
    setModalInitialDate(date)
    setShowModal(true)
  }

  function openEditModal(appt: Appointment) {
    setEditingAppt(appt)
    setModalInitialDate(undefined)
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditingAppt(undefined) }
  function onSaved() { closeModal(); fetchAppointments() }

  function getAgentColor(agentId: string | null | undefined): string {
    if (!agentId || !showAgentBar) return ''
    const idx = agentColorIndex(agentId)
    return AGENT_COLORS[idx].pill
  }

  // Build day→appointments map
  const apptsByDay = new Map<string, Appointment[]>()
  for (const a of visibleAppointments) {
    const key = new Date(a.starts_at).toDateString()
    if (!apptsByDay.has(key)) apptsByDay.set(key, [])
    apptsByDay.get(key)!.push(a)
  }

  const selectedDayAppts = visibleAppointments
    .filter(a => isSameDay(new Date(a.starts_at), selectedDay))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  const selectedDayGoogleEvents = googleEvents
    .filter(e => isSameDay(new Date(e.start), selectedDay))
    .sort((a, b) => a.start.localeCompare(b.start))

  const weekDays = getWeekDays(selectedDay)

  // Week view: current week label
  const weekLabel = `${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]}${weekDays[0].getMonth() !== weekDays[6].getMonth() ? '' : ''} – ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Calendario
            {filterAgentName && <span className="ml-2 text-neutral-400 font-normal">— {filterAgentName}</span>}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {showAgentBar ? 'Tutti gli agenti del workspace' : 'I tuoi appuntamenti'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="flex rounded-xl border border-neutral-200 bg-neutral-50 p-0.5 text-xs">
            {(['month', 'week'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewAndSave(v)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-all duration-150 capitalize ${
                  view === v ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {v === 'month' ? 'Mese' : 'Settimana'}
              </button>
            ))}
          </div>
          <Button onClick={() => openNewModal(selectedDay)} size="sm" className="h-9 gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Nuovo
          </Button>
        </div>
      </div>

      {/* Agent filter bar (admin only) */}
      {showAgentBar && agents && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-400 font-medium">Agenti:</span>
          {agents.map(agent => {
            const idx = agentColorIndex(agent.id)
            const colors = AGENT_COLORS[idx]
            const hidden = hiddenAgents.has(agent.id)
            return (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                  hidden
                    ? 'border-neutral-200 bg-white text-neutral-400 line-through'
                    : colors.pill
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${hidden ? 'bg-neutral-300' : colors.dot}`} />
                {agent.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
            {/* Period nav */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
              <button onClick={prevPeriod} className="rounded-lg p-1.5 hover:bg-neutral-100 transition-colors">
                <ChevronLeft className="h-4 w-4 text-neutral-600" />
              </button>
              <h2 className="text-sm font-semibold text-neutral-900">
                {view === 'week' ? weekLabel : `${MONTH_NAMES[month]} ${year}`}
              </h2>
              <button onClick={nextPeriod} className="rounded-lg p-1.5 hover:bg-neutral-100 transition-colors">
                <ChevronRight className="h-4 w-4 text-neutral-600" />
              </button>
            </div>

            {/* Month view */}
            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-neutral-100">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wide">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {getMonthDays(year, month).map((day, i) => {
                    if (!day) return <div key={`pad-${i}`} className="min-h-[72px] border-b border-r border-neutral-50 bg-neutral-50/50" />
                    const key = day.toDateString()
                    const dayAppts = apptsByDay.get(key) ?? []
                    const isToday = isSameDay(day, today)
                    const isSelected = isSameDay(day, selectedDay)
                    const firstAppt = dayAppts[0]
                    const tooltipText = dayAppts.map(a => `${formatTime(a.starts_at)} ${a.title}`).join('\n')

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(day)}
                        title={tooltipText || undefined}
                        className={`group/day min-h-[72px] border-b border-r border-neutral-50 p-2 text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900 hover:bg-neutral-800'
                            : 'hover:bg-blue-50/60 hover:border-blue-100'
                        }`}
                      >
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-150 ${
                          isSelected
                            ? 'text-white'
                            : isToday
                              ? 'bg-neutral-900 text-white'
                              : 'text-neutral-700 group-hover/day:bg-blue-100 group-hover/day:text-blue-800'
                        }`}>
                          {day.getDate()}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayAppts.slice(0, 2).map(a => {
                            const dotColor = (showAgentBar && a.agent_id)
                              ? AGENT_COLORS[agentColorIndex(a.agent_id)].dot
                              : TYPE_DOT[a.type]
                            return (
                              <div
                                key={a.id}
                                className={`flex items-center gap-1 rounded px-1 py-0.5 ${isSelected ? 'bg-white/20' : 'bg-black/[0.03]'}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : dotColor}`} />
                                <span className={`text-[10px] truncate leading-tight ${isSelected ? 'text-white' : 'text-neutral-600'}`}>
                                  {formatTime(a.starts_at)} {a.title}
                                </span>
                              </div>
                            )
                          })}
                          {dayAppts.length > 2 && (
                            <span className={`text-[10px] pl-1 ${isSelected ? 'text-white/60' : 'text-neutral-400'}`}>
                              +{dayAppts.length - 2} altri
                            </span>
                          )}
                          {dayAppts.length === 0 && firstAppt === undefined && (
                            <div className="h-1" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Week view */}
            {view === 'week' && (
              <>
                <div className="grid grid-cols-7 border-b border-neutral-100">
                  {weekDays.map(day => {
                    const isToday = isSameDay(day, today)
                    const isSel = isSameDay(day, selectedDay)
                    return (
                      <button
                        key={day.toDateString()}
                        onClick={() => setSelectedDay(day)}
                        className={`py-3 text-center transition-all duration-150 ${isSel ? 'bg-neutral-900' : 'hover:bg-neutral-50'}`}
                      >
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${isSel ? 'text-white/60' : 'text-neutral-400'}`}>
                          {DAY_NAMES[(day.getDay() + 6) % 7]}
                        </p>
                        <p className={`mt-0.5 text-base font-bold ${isSel ? 'text-white' : isToday ? 'text-blue-600' : 'text-neutral-800'}`}>
                          {day.getDate()}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-7 min-h-[280px]">
                  {weekDays.map(day => {
                    const dayAppts = (apptsByDay.get(day.toDateString()) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                    const isSel = isSameDay(day, selectedDay)
                    return (
                      <div
                        key={day.toDateString()}
                        onClick={() => setSelectedDay(day)}
                        className={`border-r border-neutral-50 p-1.5 space-y-1 cursor-pointer transition-colors ${isSel ? 'bg-neutral-50' : 'hover:bg-blue-50/40'}`}
                      >
                        {dayAppts.map(a => {
                          const dotColor = (showAgentBar && a.agent_id)
                            ? AGENT_COLORS[agentColorIndex(a.agent_id)].dot
                            : TYPE_DOT[a.type]
                          return (
                            <div
                              key={a.id}
                              onClick={e => { e.stopPropagation(); openEditModal(a) }}
                              title={`${formatTime(a.starts_at)} ${a.title}`}
                              className={`rounded-md border px-1.5 py-1 cursor-pointer hover:opacity-80 transition-opacity ${TYPE_COLORS[a.type]}`}
                            >
                              <div className="flex items-center gap-1">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
                                <span className="text-[10px] font-medium truncate">{formatTime(a.starts_at)}</span>
                              </div>
                              <p className="text-[10px] truncate leading-tight mt-0.5">{a.title}</p>
                            </div>
                          )
                        })}
                        {dayAppts.length === 0 && (
                          <button
                            onClick={e => { e.stopPropagation(); openNewModal(day) }}
                            className="w-full h-8 flex items-center justify-center text-neutral-300 hover:text-neutral-400 transition-colors"
                            title="Aggiungi appuntamento"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 capitalize">
              {formatDate(selectedDay.toISOString())}
            </h3>
            <button
              onClick={() => openNewModal(selectedDay)}
              className="rounded-lg p-1.5 hover:bg-neutral-100 transition-colors"
              title="Aggiungi appuntamento"
            >
              <Plus className="h-4 w-4 text-neutral-500" />
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-6 text-center">
              <p className="text-sm text-neutral-400">Carico…</p>
            </div>
          ) : selectedDayAppts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <p className="text-sm text-neutral-400">Nessun appuntamento</p>
              <button
                onClick={() => openNewModal(selectedDay)}
                className="mt-2 text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors"
              >
                Aggiungi uno
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayAppts.map(a => (
                <AppointmentCard
                  key={a.id}
                  appt={a}
                  listings={listings}
                  agentColor={getAgentColor(a.agent_id)}
                  onStatusChange={handleStatusChange}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Google Calendar events */}
          {selectedDayGoogleEvents.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-bold text-neutral-500">G</span>
                Da Google Calendar
              </p>
              {selectedDayGoogleEvents.map(e => (
                <div key={e.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 hover:shadow-sm transition-shadow">
                  <p className="text-sm font-medium text-neutral-700 truncate">{e.summary}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatTime(e.start)}{e.end && ` – ${formatTime(e.end)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AppointmentModal
          listings={listings}
          contacts={contacts}
          agents={agents}
          currentUserId={userId}
          initial={modalInitialDate ? { date: modalInitialDate } : undefined}
          editing={editingAppt}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
