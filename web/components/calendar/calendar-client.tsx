'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useI18n } from '@/lib/i18n/context'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CalendarClientProps, Appointment, ViewMode } from './calendar-types'
import {
  TYPE_COLORS,
  TYPE_DOT,
  AGENT_COLORS,
  agentColorIndex,
  getMonthDays,
  getWeekDays,
  formatTime,
  formatDate,
  isSameDay,
} from './calendar-types'
import { AppointmentModal } from './appointment-modal'
import { AppointmentCard } from './appointment-card'

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
  const [view, setView] = useState<ViewMode>('week')
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
  const showAgentBar = !!agents && agents.length > 1

  // Restore preferences from localStorage — defaults: week view, hide other agents
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('calendar-view') as ViewMode | null
      if (savedView === 'month' || savedView === 'week') setView(savedView)
      const savedHidden = localStorage.getItem('calendar-hidden-agents')
      if (savedHidden) {
        setHiddenAgents(new Set(JSON.parse(savedHidden)))
      }
      // If no saved agent preference and admin: hide all others by default
      else if (isAdmin && agents?.length) {
        setHiddenAgents(new Set(agents.map(a => a.id).filter(id => id !== userId)))
      }
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  function hideAllAgents() {
    if (!agents) return
    const all = new Set(agents.map(a => a.id))
    setHiddenAgents(all)
    try { localStorage.setItem('calendar-hidden-agents', JSON.stringify([...all])) } catch { /* ignore */ }
  }

  function showAllAgents() {
    setHiddenAgents(new Set())
    try { localStorage.setItem('calendar-hidden-agents', JSON.stringify([])) } catch { /* ignore */ }
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
          <h1 className="text-xl font-extrabold tracking-tight">
            Calendario
            {filterAgentName && <span className="ml-2 text-muted-foreground font-normal">— {filterAgentName}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {showAgentBar ? 'Tutti gli agenti del workspace' : 'I tuoi appuntamenti'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="flex rounded-xl border border-border bg-muted/50 p-0.5 text-xs">
            {(['month', 'week'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewAndSave(v)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-all duration-150 capitalize ${
                  view === v ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v === 'month' ? 'Mese' : 'Settimana'}
              </button>
            ))}
          </div>
          <button onClick={() => openNewModal(selectedDay)} className="btn-ai inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" />
            Nuovo
          </button>
        </div>
      </div>

      {/* Color legend — appointment types */}
      {!showAgentBar && (
        <div className="flex items-center gap-4 flex-wrap rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Legenda:</span>
          {[
            { type: 'visita', label: 'Visita', dot: 'bg-blue-500' },
            { type: 'riunione', label: 'Riunione', dot: 'bg-purple-500' },
            { type: 'atto', label: 'Atto', dot: 'bg-green-500' },
            { type: 'acquisizione', label: 'Acquisizione', dot: 'bg-amber-500' },
            { type: 'altro', label: 'Altro', dot: 'bg-slate-500' },
          ].map(item => (
            <span key={item.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`cal-legend-dot ${item.dot}`} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      {/* Agent filter bar (admin only) */}
      {showAgentBar && agents && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Agenti:</span>
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
                    ? 'border-border bg-muted/40 text-muted-foreground/50'
                    : colors.pill
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${hidden ? 'bg-muted-foreground/20' : colors.dot}`} />
                {agent.name}
              </button>
            )
          })}
          <div className="ml-1 flex items-center gap-1">
            <button
              onClick={hideAllAgents}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
            >
              Nascondi tutti
            </button>
            <button
              onClick={showAllAgents}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
            >
              Mostra tutti
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Calendar grid */}
        <div>
          <div className={`rounded-2xl border border-border bg-card shadow-sm overflow-hidden relative${loading ? ' opacity-60 pointer-events-none' : ''}`}>
            {loading && <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[oklch(0.57_0.20_33)] to-transparent animate-pulse z-10" />}
            {/* Period nav */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <button onClick={prevPeriod} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <h2 className="text-sm font-semibold">
                {view === 'week' ? weekLabel : `${MONTH_NAMES[month]} ${year}`}
              </h2>
              <button onClick={nextPeriod} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Month view */}
            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-border">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {getMonthDays(year, month).map((day, i) => {
                    if (!day) return <div key={`pad-${i}`} className="min-h-[72px] border-b border-r border-border/40 bg-muted/20" />
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
                        className={`group/day min-h-[72px] border-b border-r border-border/40 p-2 text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-[oklch(0.57_0.20_33)] hover:bg-[oklch(0.52_0.20_33)]'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-150 ${
                          isSelected
                            ? 'text-white'
                            : isToday
                              ? 'bg-[oklch(0.57_0.20_33)] text-white'
                              : 'text-foreground group-hover/day:bg-muted'
                        }`}>
                          {day.getDate()}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayAppts.slice(0, 2).map(a => {
                            const typeDot = TYPE_DOT[a.type] ?? 'bg-muted-foreground/40'
                            return (
                              <div
                                key={a.id}
                                className={`flex items-center gap-1 rounded px-1 py-0.5 ${isSelected ? 'bg-white/20' : 'bg-black/[0.03]'}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : typeDot}`} />
                                <span className={`text-[10px] truncate leading-tight ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                                  {formatTime(a.starts_at)} {a.title}
                                </span>
                              </div>
                            )
                          })}
                          {dayAppts.length > 2 && (
                            <span className={`text-[10px] pl-1 ${isSelected ? 'text-white/60' : 'text-muted-foreground'}`}>
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
                <div className="grid grid-cols-7 border-b border-border">
                  {weekDays.map(day => {
                    const isToday = isSameDay(day, today)
                    const isSel = isSameDay(day, selectedDay)
                    return (
                      <button
                        key={day.toDateString()}
                        onClick={() => setSelectedDay(day)}
                        className={`py-3 text-center transition-all duration-150 ${isSel ? 'bg-[oklch(0.57_0.20_33)]' : 'hover:bg-muted/50'}`}
                      >
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${isSel ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {DAY_NAMES[(day.getDay() + 6) % 7]}
                        </p>
                        <p className={`mt-0.5 text-base font-bold ${isSel ? 'text-white' : isToday ? 'text-[oklch(0.57_0.20_33)]' : ''}`}>
                          {day.getDate()}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-7 min-h-[calc(100vh-220px)]">
                  {weekDays.map(day => {
                    const dayAppts = (apptsByDay.get(day.toDateString()) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                    const isSel = isSameDay(day, selectedDay)
                    function handleDayClick() {
                      setSelectedDay(day)
                    }
                    return (
                      <div
                        key={day.toDateString()}
                        onClick={handleDayClick}
                        onDoubleClick={() => { setSelectedDay(day); setModalInitialDate(day); setEditingAppt(undefined); setShowModal(true) }}
                        className={`border-r border-border/40 p-1.5 space-y-1 cursor-pointer transition-colors min-h-[300px] relative group ${isSel ? 'bg-muted/30' : 'hover:bg-muted/20'}`}
                      >
                        {dayAppts.map(a => {
                          const cardBg = (showAgentBar && a.agent_id)
                            ? AGENT_COLORS[agentColorIndex(a.agent_id)].pill
                            : (TYPE_COLORS[a.type] ?? 'bg-muted text-muted-foreground border-border')
                          const typeDot = TYPE_DOT[a.type] ?? 'bg-muted-foreground/40'
                          return (
                            <div
                              key={a.id}
                              onClick={e => { e.stopPropagation(); openEditModal(a) }}
                              title={`${formatTime(a.starts_at)} ${a.title}`}
                              className={`rounded-md border p-2 cursor-pointer hover:opacity-80 transition-opacity min-h-[40px] ${cardBg}`}
                            >
                              <div className="flex items-center gap-1">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${typeDot}`} />
                                <span className="text-[10px] font-medium truncate">{formatTime(a.starts_at)}</span>
                              </div>
                              <p className="text-[10px] whitespace-normal line-clamp-2 leading-tight mt-0.5">{a.title}</p>
                            </div>
                          )
                        })}
                        {dayAppts.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 pointer-events-none text-2xl text-muted-foreground">+</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Day detail panel — more breathing room */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-sm font-bold capitalize tracking-tight">
                {formatDate(selectedDay.toISOString())}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedDayAppts.length > 0 ? `${selectedDayAppts.length} appuntament${selectedDayAppts.length === 1 ? 'o' : 'i'}` : 'Nessun appuntamento'}
              </p>
            </div>
            <button
              onClick={() => openNewModal(selectedDay)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[oklch(0.57_0.20_33)] hover:bg-[oklch(0.57_0.20_33/0.08)] transition-colors border border-[oklch(0.57_0.20_33/0.2)]"
              title="Aggiungi appuntamento"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuovo
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(n => (
                <div key={n} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : selectedDayAppts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-muted/30 to-muted/10 p-8 text-center">
              <div className="mb-3 mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nessun appuntamento</p>
              <button
                onClick={() => openNewModal(selectedDay)}
                className="mt-3 text-xs font-medium text-[oklch(0.57_0.20_33)] hover:underline underline-offset-2 transition-colors"
              >
                Aggiungi uno →
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDayAppts.map((a, idx) => (
                <div key={a.id} className={`animate-in-${Math.min(idx + 1, 8)}`}>
                  <AppointmentCard
                    appt={a}
                    listings={listings}
                    agentColor={getAgentColor(a.agent_id)}
                    onStatusChange={handleStatusChange}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Google Calendar events */}
          {selectedDayGoogleEvents.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">G</span>
                Da Google Calendar
              </p>
              {selectedDayGoogleEvents.map(e => (
                <div key={e.id} className="rounded-xl border border-border bg-muted/30 px-4 py-3 hover:shadow-sm transition-shadow">
                  <p className="text-sm font-medium truncate">{e.summary}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(e.start)}{e.end && ` – ${formatTime(e.end)}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Add appointment CTA at bottom */}
          <button
            onClick={() => openNewModal(selectedDay)}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[oklch(0.57_0.20_33/0.3)] bg-[oklch(0.57_0.20_33/0.04)] px-4 py-3 text-sm font-semibold text-[oklch(0.57_0.20_33)] hover:bg-[oklch(0.57_0.20_33/0.08)] hover:border-[oklch(0.57_0.20_33/0.5)] transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Aggiungi appuntamento
          </button>
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
