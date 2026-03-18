'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, Phone } from 'lucide-react'

export interface TeamAgent {
  id: string
  name: string
}

interface TeamAppointment {
  id: string
  agent_id: string
  title: string
  type: string
  status: string
  starts_at: string
  ends_at: string | null
  contact_name: string | null
}

type ViewMode = 'week' | 'month'

const AGENT_PALETTE = [
  { bg: 'bg-blue-500',    light: 'bg-blue-50 border-blue-200 text-blue-900',    dot: 'bg-blue-500',    chip: 'bg-blue-500 text-white',    chipOff: 'bg-blue-50 text-blue-500 border border-blue-200' },
  { bg: 'bg-purple-500',  light: 'bg-purple-50 border-purple-200 text-purple-900',  dot: 'bg-purple-500',  chip: 'bg-purple-500 text-white',  chipOff: 'bg-purple-50 text-purple-500 border border-purple-200' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-900', dot: 'bg-emerald-500', chip: 'bg-emerald-500 text-white', chipOff: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  { bg: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200 text-amber-900',   dot: 'bg-amber-500',   chip: 'bg-amber-500 text-white',   chipOff: 'bg-amber-50 text-amber-600 border border-amber-200' },
  { bg: 'bg-rose-500',    light: 'bg-rose-50 border-rose-200 text-rose-900',    dot: 'bg-rose-500',    chip: 'bg-rose-500 text-white',    chipOff: 'bg-rose-50 text-rose-500 border border-rose-200' },
  { bg: 'bg-cyan-500',    light: 'bg-cyan-50 border-cyan-200 text-cyan-900',    dot: 'bg-cyan-500',    chip: 'bg-cyan-500 text-white',    chipOff: 'bg-cyan-50 text-cyan-600 border border-cyan-200' },
]

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const days: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
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

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function TeamCalendar({ agents }: { agents: TeamAgent[] }) {
  const today = new Date()
  const [view, setView] = useState<ViewMode>('week')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [appointments, setAppointments] = useState<TeamAppointment[]>([])
  const [loading, setLoading] = useState(true)
  // all ON by default
  const [visibleAgents, setVisibleAgents] = useState<Set<string>>(() => new Set(agents.map(a => a.id)))

  // Restore view preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('team-calendar-view') as ViewMode | null
      if (saved === 'week' || saved === 'month') setView(saved)
    } catch { /* ignore */ }
  }, [])

  function setViewAndSave(v: ViewMode) {
    setView(v)
    try { localStorage.setItem('team-calendar-view', v) } catch { /* ignore */ }
  }

  const agentColorMap = useMemo(() => {
    const map = new Map<string, typeof AGENT_PALETTE[0]>()
    agents.forEach((a, i) => map.set(a.id, AGENT_PALETTE[i % AGENT_PALETTE.length]))
    return map
  }, [agents])

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(year, month, 1).toISOString()
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
      const res = await fetch(`/api/appointments?from=${from}&to=${to}`)
      if (!res.ok) return
      const data = await res.json()
      setAppointments(data.appointments ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  function toggleAgent(agentId: string) {
    setVisibleAgents(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) next.delete(agentId)
      else next.add(agentId)
      return next
    })
  }

  function toggleAll() {
    if (visibleAgents.size === agents.length) setVisibleAgents(new Set())
    else setVisibleAgents(new Set(agents.map(a => a.id)))
  }

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

  const visibleAppts = useMemo(
    () => appointments.filter(a => visibleAgents.has(a.agent_id) && a.status !== 'cancelled'),
    [appointments, visibleAgents]
  )

  const apptsByDay = useMemo(() => {
    const map = new Map<string, TeamAppointment[]>()
    for (const a of visibleAppts) {
      const key = new Date(a.starts_at).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [visibleAppts])

  const selectedDayAppts = useMemo(
    () => visibleAppts
      .filter(a => isSameDay(new Date(a.starts_at), selectedDay))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [visibleAppts, selectedDay]
  )

  const weekDays = getWeekDays(selectedDay)
  const weekLabel = `${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
  const days = getMonthDays(year, month)

  return (
    <div className="space-y-4">
      {/* Agent toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={toggleAll}
          className="rounded-full px-3 py-1 text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          {visibleAgents.size === agents.length ? 'Nascondi tutti' : 'Mostra tutti'}
        </button>
        {agents.map(agent => {
          const palette = agentColorMap.get(agent.id)!
          const isOn = visibleAgents.has(agent.id)
          return (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                isOn ? palette.chip : palette.chipOff
              }`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[9px] font-bold">
                {getInitials(agent.name)}
              </span>
              {agent.name.split(' ')[0]}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Nav + view switcher */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <button onClick={prevPeriod} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold">
                  {view === 'week' ? weekLabel : `${MONTH_NAMES[month]} ${year}`}
                </h2>
                <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                  {(['week', 'month'] as ViewMode[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setViewAndSave(v)}
                      className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                        view === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {v === 'week' ? 'Settimana' : 'Mese'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={nextPeriod} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

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
                <div className="grid grid-cols-7 min-h-[200px]">
                  {weekDays.map(day => {
                    const dayAppts = (apptsByDay.get(day.toDateString()) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                    const isSel = isSameDay(day, selectedDay)
                    const agentDots = [...new Set(dayAppts.map(a => a.agent_id))]
                    return (
                      <div
                        key={day.toDateString()}
                        onClick={() => setSelectedDay(day)}
                        className={`border-r border-border/40 p-1.5 space-y-0.5 cursor-pointer transition-colors min-h-[100px] ${isSel ? 'bg-muted/30' : 'hover:bg-muted/20'}`}
                      >
                        {dayAppts.map(a => {
                          const palette = agentColorMap.get(a.agent_id)
                          return (
                            <div
                              key={a.id}
                              className={`rounded-md border px-1.5 py-1 text-[10px] truncate ${palette?.light ?? 'bg-muted/50 border-border text-muted-foreground'}`}
                            >
                              <div className="flex items-center gap-0.5">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${palette?.dot ?? 'bg-muted-foreground/40'}`} />
                                <span className="font-medium">{formatTime(a.starts_at)}</span>
                              </div>
                              <p className="truncate leading-tight mt-0.5">{a.title}</p>
                            </div>
                          )
                        })}
                        {agentDots.length === 0 && (
                          <div className="h-4" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Month view */}
            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-border">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((day, i) => {
                    if (!day) return <div key={`pad-${i}`} className="min-h-[72px] border-b border-r border-border/40" />
                    const key = day.toDateString()
                    const dayAppts = apptsByDay.get(key) ?? []
                    const isToday = isSameDay(day, today)
                    const isSelected = isSameDay(day, selectedDay)
                    const agentDots = [...new Set(dayAppts.map(a => a.agent_id))]

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(day)}
                        className={`min-h-[72px] border-b border-r border-border/40 p-2 text-left transition-colors hover:bg-muted/30 ${
                          isSelected ? 'bg-[oklch(0.57_0.20_33)] hover:opacity-90' : ''
                        }`}
                      >
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isSelected ? 'text-white' : isToday ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'text-foreground'
                        }`}>
                          {day.getDate()}
                        </span>
                        {agentDots.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {agentDots.slice(0, 4).map(agentId => {
                              const palette = agentColorMap.get(agentId)
                              const count = dayAppts.filter(a => a.agent_id === agentId).length
                              return (
                                <span
                                  key={agentId}
                                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                    isSelected ? 'bg-white/25 text-white' : palette ? palette.chip : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {isSelected ? '' : getInitials(agents.find(a => a.id === agentId)?.name ?? '')}
                                  {count > 1 && <span>{count}</span>}
                                </span>
                              )
                            })}
                            {agentDots.length > 4 && (
                              <span className={`text-[9px] ${isSelected ? 'text-white/60' : 'text-muted-foreground'}`}>
                                +{agentDots.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Day panel */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold capitalize">
            {formatDate(selectedDay.toISOString())}
          </h3>

          {loading ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">Carico…</p>
            </div>
          ) : selectedDayAppts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">Nessun appuntamento</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayAppts.map(appt => {
                const palette = agentColorMap.get(appt.agent_id)
                const agent = agents.find(a => a.id === appt.agent_id)
                return (
                  <div
                    key={appt.id}
                    className={`rounded-xl border px-3 py-2.5 ${palette?.light ?? 'bg-muted/50 border-border'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${palette?.bg ?? 'bg-muted-foreground'}`}>
                        {getInitials(agent?.name ?? '?')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{appt.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-70">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTime(appt.starts_at)}
                            {appt.ends_at && ` – ${formatTime(appt.ends_at)}`}
                          </span>
                        </div>
                        {appt.contact_name && (
                          <p className="flex items-center gap-0.5 text-[10px] opacity-60 mt-0.5 truncate">
                            <Phone className="h-2.5 w-2.5 shrink-0" />
                            {appt.contact_name}
                          </p>
                        )}
                        <p className="text-[10px] opacity-50 mt-0.5">{agent?.name}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
