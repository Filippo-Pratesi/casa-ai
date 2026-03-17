'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface Listing {
  id: string
  address: string
  city: string
}

interface Contact {
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

const TYPE_LABELS: Record<string, string> = {
  viewing: 'Visita',
  meeting: 'Riunione',
  signing: 'Firma',
  call: 'Telefonata',
  other: 'Altro',
}

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

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  // Monday-based: 0=Mon … 6=Sun
  const startPad = (first.getDay() + 6) % 7
  const days: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Agent {
  id: string
  name: string
}

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
  const defaultDate = initial?.date ?? new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toDateInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const toTimeInput = (d: Date) =>
    `${pad(d.getHours())}:${pad(d.getMinutes())}`

  const [title, setTitle] = useState(editing?.title ?? '')
  const [type, setType] = useState<Appointment['type']>(editing?.type ?? 'viewing')
  const [date, setDate] = useState(
    editing ? toDateInput(new Date(editing.starts_at)) : toDateInput(defaultDate)
  )
  const [startTime, setStartTime] = useState(
    editing ? toTimeInput(new Date(editing.starts_at)) : '09:00'
  )
  const [endTime, setEndTime] = useState(
    editing?.ends_at ? toTimeInput(new Date(editing.ends_at)) : ''
  )
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
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
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
            {editing ? 'Modifica appuntamento' : 'Nuovo appuntamento'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100 transition-colors">
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Titolo *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="es. Visita appartamento Milano"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_LABELS) as Appointment['type'][]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    type === t
                      ? TYPE_COLORS[t]
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-neutral-600 mb-1">Data *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Inizio *</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Fine</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>

          {/* Contact */}
          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Cliente</label>
              <select
                value={contactId}
                onChange={e => setContactId(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <option value="">— Nessuno —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Listing */}
          {listings.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Immobile</label>
              <select
                value={listingId}
                onChange={e => setListingId(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <option value="">— Nessuno —</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id}>{l.address}, {l.city}</option>
                ))}
              </select>
            </div>
          )}

          {/* Assign to agent (admin only) */}
          {agents && agents.length > 1 && !editing && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Assegna a</label>
              <select
                value={assignedAgentId}
                onChange={e => setAssignedAgentId(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.id === currentUserId ? ' (tu)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Note</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Note opzionali…"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading} className="flex-1 h-9 text-sm">
              {loading ? 'Salvo…' : editing ? 'Aggiorna' : 'Crea appuntamento'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-sm px-4">
              Annulla
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Appointment card ──────────────────────────────────────────────────────────

interface CardProps {
  appt: Appointment
  listings: Listing[]
  onStatusChange: (id: string, status: Appointment['status']) => void
  onEdit: (appt: Appointment) => void
  onDelete: (id: string) => void
}

function AppointmentCard({ appt, listings, onStatusChange, onEdit, onDelete }: CardProps) {
  const listing = appt.listing_id ? listings.find(l => l.id === appt.listing_id) : null
  const isCancelled = appt.status === 'cancelled'
  const isCompleted = appt.status === 'completed'

  return (
    <div className={`rounded-xl border px-4 py-3 transition-opacity ${
      isCancelled ? 'opacity-50' : ''
    } ${TYPE_COLORS[appt.type]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[appt.type]}`} />
            <span className="text-xs font-medium opacity-80">{TYPE_LABELS[appt.type]}</span>
          </div>
          <p className={`text-sm font-semibold truncate ${isCancelled ? 'line-through' : ''}`}>
            {appt.title}
          </p>
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
          {appt.notes && (
            <p className="text-xs opacity-60 mt-1 line-clamp-1">{appt.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {appt.status === 'scheduled' && (
            <>
              <button
                onClick={() => onStatusChange(appt.id, 'completed')}
                title="Completato"
                className="rounded-lg p-1 hover:bg-black/10 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onStatusChange(appt.id, 'cancelled')}
                title="Annulla"
                className="rounded-lg p-1 hover:bg-black/10 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {(isCompleted || isCancelled) && (
            <button
              onClick={() => onStatusChange(appt.id, 'scheduled')}
              title="Ripristina"
              className="rounded-lg p-1 hover:bg-black/10 transition-colors text-xs font-medium opacity-60"
            >
              ↩
            </button>
          )}
          <button
            onClick={() => onEdit(appt)}
            title="Modifica"
            className="rounded-lg p-1 hover:bg-black/10 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(appt.id)}
            title="Elimina"
            className="rounded-lg p-1 hover:bg-black/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CalendarClient({ listings, contacts, agents, role, userId, filterAgentId, filterAgentName }: CalendarClientProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>()
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>()

  // For admins: active agent filter (undefined = all)
  const [activeAgentId, setActiveAgentId] = useState<string | undefined>(filterAgentId)
  const isAdmin = role === 'admin'
  const [googleEvents, setGoogleEvents] = useState<Array<{ id: string; summary: string; start: string; end: string }>>([])

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(year, month, 1).toISOString()
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
      let url = `/api/appointments?from=${from}&to=${to}`
      if (activeAgentId) url += `&agent_id=${activeAgentId}`
      const [apptRes, gcalRes] = await Promise.all([
        fetch(url),
        fetch(`/api/calendar/google-events?from=${from}&to=${to}`),
      ])
      if (apptRes.ok) {
        const data = await apptRes.json()
        setAppointments(data.appointments ?? [])
      }
      if (gcalRes.ok) {
        const gcal = await gcalRes.json()
        setGoogleEvents(gcal.events ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [year, month, activeAgentId])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
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

  function closeModal() {
    setShowModal(false)
    setEditingAppt(undefined)
  }

  function onSaved() {
    closeModal()
    fetchAppointments()
  }

  const days = getMonthDays(year, month)

  const apptsByDay = new Map<string, Appointment[]>()
  for (const a of appointments) {
    const key = new Date(a.starts_at).toDateString()
    if (!apptsByDay.has(key)) apptsByDay.set(key, [])
    apptsByDay.get(key)!.push(a)
  }

  const selectedDayAppts = appointments
    .filter(a => isSameDay(new Date(a.starts_at), selectedDay))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  const selectedDayGoogleEvents = googleEvents
    .filter(e => isSameDay(new Date(e.start), selectedDay))
    .sort((a, b) => a.start.localeCompare(b.start))

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Calendario
            {filterAgentName && (
              <span className="ml-2 text-neutral-400 font-normal">— {filterAgentName}</span>
            )}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {activeAgentId ? `Appuntamenti di ${filterAgentName ?? 'agente'}` : 'Tutti gli appuntamenti del workspace'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Admin toggle: all / by agent */}
          {isAdmin && filterAgentId && (
            <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setActiveAgentId(filterAgentId)}
                className={`px-3 py-1.5 font-medium transition-colors ${activeAgentId === filterAgentId ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
              >
                {filterAgentName ?? 'Agente'}
              </button>
              <button
                type="button"
                onClick={() => setActiveAgentId(undefined)}
                className={`px-3 py-1.5 font-medium transition-colors ${!activeAgentId ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
              >
                Tutti
              </button>
            </div>
          )}
          {isAdmin && !filterAgentId && (
            <a
              href="/admin"
              className="text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors"
            >
              ← Team
            </a>
          )}
          <Button onClick={() => openNewModal()} size="sm" className="h-9 gap-1.5">
            <Plus className="h-4 w-4" />
            Nuovo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-neutral-100 transition-colors">
                <ChevronLeft className="h-4 w-4 text-neutral-600" />
              </button>
              <h2 className="text-sm font-semibold text-neutral-900">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-neutral-100 transition-colors">
                <ChevronRight className="h-4 w-4 text-neutral-600" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-neutral-100">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-neutral-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} className="min-h-[72px] border-b border-r border-neutral-50" />
                const key = day.toDateString()
                const dayAppts = apptsByDay.get(key) ?? []
                const isToday = isSameDay(day, today)
                const isSelected = isSameDay(day, selectedDay)

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[72px] border-b border-r border-neutral-50 p-2 text-left transition-colors hover:bg-neutral-50 ${
                      isSelected ? 'bg-neutral-900 hover:bg-neutral-800' : ''
                    }`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isSelected
                        ? 'text-white'
                        : isToday
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-700'
                    }`}>
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayAppts.slice(0, 2).map(a => (
                        <div
                          key={a.id}
                          className={`flex items-center gap-1 rounded px-1 py-0.5 ${
                            isSelected ? 'bg-white/20' : TYPE_COLORS[a.type].replace('border-', 'border-opacity-0 border-')
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : TYPE_DOT[a.type]}`} />
                          <span className={`text-[10px] truncate leading-tight ${isSelected ? 'text-white' : ''}`}>
                            {formatTime(a.starts_at)} {a.title}
                          </span>
                        </div>
                      ))}
                      {dayAppts.length > 2 && (
                        <span className={`text-[10px] ${isSelected ? 'text-white/60' : 'text-neutral-400'}`}>
                          +{dayAppts.length - 2} altri
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
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
                <div key={e.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-sm font-medium text-neutral-700 truncate">{e.summary}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatTime(e.start)}
                    {e.end && ` – ${formatTime(e.end)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
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
