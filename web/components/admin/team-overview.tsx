'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileText, UserRound, TrendingUp, Trophy, BarChart2, ChevronRight, BadgeCheck, CalendarDays, ChevronDown } from 'lucide-react'
import { ExportCsvButton } from '@/components/admin/export-csv-button'
import { TeamCalendar } from '@/components/admin/team-calendar'

export interface AgentRawData {
  id: string
  name: string
  email: string
  role: string
  joinedAt: string
  listings: { created_at: string; has_content: boolean }[]
  contacts: { created_at: string }[]
  soldListings: { archived_at: string }[]
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

function getLast12Months(): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(monthKey(d))
  }
  return result
}

// Quick date range presets
type Preset = 'month' | 'quarter' | 'year' | 'all'

function getPresetRange(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const cur = monthKey(now)
  if (preset === 'month') return { from: cur, to: cur }
  if (preset === 'quarter') {
    const q = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { from: monthKey(q), to: cur }
  }
  if (preset === 'year') {
    return { from: `${now.getFullYear()}-01`, to: cur }
  }
  // 'all' — very wide range
  return { from: '2020-01', to: cur }
}

function medalColor(rank: number) {
  if (rank === 1) return 'text-amber-500'
  if (rank === 2) return 'text-neutral-400'
  if (rank === 3) return 'text-amber-700'
  return 'text-neutral-300'
}

function medalBg(rank: number) {
  if (rank === 1) return 'bg-amber-50 border-amber-200'
  if (rank === 2) return 'bg-neutral-50 border-neutral-200'
  if (rank === 3) return 'bg-orange-50 border-orange-200'
  return 'bg-white border-neutral-100'
}

type Metric = 'sold' | 'listings' | 'contacts'


interface AgentStats {
  agent: AgentRawData
  listings: number
  content: number
  contacts: number
  sold: number
}

function computeStats(agents: AgentRawData[], filterFn: (d: string) => boolean, metric: Metric = 'sold'): AgentStats[] {
  return agents.map((agent) => {
    const listings = agent.listings.filter((l) => filterFn(l.created_at)).length
    const content = agent.listings.filter((l) => filterFn(l.created_at) && l.has_content).length
    const contacts = agent.contacts.filter((c) => filterFn(c.created_at)).length
    const sold = agent.soldListings.filter((s) => filterFn(s.archived_at)).length
    return { agent, listings, content, contacts, sold }
  }).sort((a, b) => {
    if (metric === 'listings') return b.listings - a.listings
    if (metric === 'contacts') return b.contacts - a.contacts
    return b.sold - a.sold
  })
}

function metricValue(row: AgentStats, metric: Metric): number {
  if (metric === 'listings') return row.listings
  if (metric === 'contacts') return row.contacts
  return row.sold
}

function metricSubLabel(row: AgentStats, metric: Metric): string {
  if (metric === 'listings') return `${row.sold} venduti`
  if (metric === 'contacts') return `${row.listings} imm`
  return `${row.listings} imm · ${row.contacts} cli`
}

export function TeamOverview({
  agents,
  isAdmin,
  currentUserId,
}: {
  agents: AgentRawData[]
  isAdmin: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  const METRICS = [
    { id: 'sold' as Metric, label: t('team.metric.sold') },
    { id: 'listings' as Metric, label: t('team.metric.listings') },
    { id: 'contacts' as Metric, label: t('team.metric.contacts') },
  ]
  const now = new Date()
  const currentMonth = monthKey(now)
  const currentYear = `${now.getFullYear()}`

  const [view, setView] = useState<'classifica' | 'calendario'>('classifica')
  const [metric, setMetric] = useState<Metric>('sold')
  const [preset, setPreset] = useState<Preset>('month')
  const [filterFrom, setFilterFrom] = useState(currentMonth)
  const [filterTo, setFilterTo] = useState(currentMonth)
  const [filterAgentId, setFilterAgentId] = useState<string>('')

  function applyPreset(p: Preset) {
    setPreset(p)
    const range = getPresetRange(p)
    setFilterFrom(range.from)
    setFilterTo(range.to)
  }

  function handleCustomFrom(val: string) {
    setPreset('month') // clear preset indicator when manually editing
    setFilterFrom(val)
  }

  function handleCustomTo(val: string) {
    setPreset('month')
    setFilterTo(val)
  }

  const rangeFilterFn = useMemo(() => {
    return (d: string) => d >= filterFrom && d <= filterTo
  }, [filterFrom, filterTo])

  // Optionally narrow to a single agent for leaderboard
  const filteredAgents = useMemo(() =>
    filterAgentId ? agents.filter(a => a.id === filterAgentId) : agents,
    [agents, filterAgentId]
  )

  const monthStats = useMemo(() =>
    computeStats(filteredAgents, rangeFilterFn, metric),
    [filteredAgents, rangeFilterFn, metric]
  )

  const yearStats = useMemo(() =>
    computeStats(agents, (d) => d.startsWith(currentYear), metric),
    [agents, currentYear, metric]
  )

  const monthTotals = useMemo(() => ({
    listings: monthStats.reduce((s, r) => s + r.listings, 0),
    content: monthStats.reduce((s, r) => s + r.content, 0),
    contacts: monthStats.reduce((s, r) => s + r.contacts, 0),
    sold: monthStats.reduce((s, r) => s + r.sold, 0),
  }), [monthStats])

  const csvRows = yearStats.map(({ agent }) => ({
    name: agent.name,
    email: agent.email,
    role: agent.role,
    listingsTotal: agent.listings.length,
    listingsThisMonth: monthStats.find(r => r.agent.id === agent.id)?.listings ?? 0,
    generatedTotal: agent.listings.filter(l => l.has_content).length,
    contactsTotal: agent.contacts.length,
    joinedAt: agent.joinedAt,
  }))

  const rangeLabel = filterFrom === filterTo
    ? monthLabel(filterFrom)
    : `${monthLabel(filterFrom)} – ${monthLabel(filterTo)}`

  function openAgentProfile(agentId: string) {
    router.push(`/admin/agents/${agentId}`)
  }

  const calendarAgents = agents.map(a => ({ id: a.id, name: a.name }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        {/* Left: title + view switcher */}
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-neutral-500 text-sm mt-0.5">Performance e competizione del workspace</p>
          </div>
          {/* View switcher — always left */}
          <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setView('classifica')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'classifica' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
            >
              <Trophy className="h-3.5 w-3.5" />
              Classifica
            </button>
            <button
              type="button"
              onClick={() => setView('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'calendario' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendario
            </button>
          </div>
        </div>

        {/* Right: classifica-only controls */}
        {view === 'classifica' && (
          <div className="flex flex-col gap-2 items-end">
            {/* Metric selector */}
            <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    metric === m.id
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Dynamic filter row */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Quick presets */}
              <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden text-xs">
                {([['month', 'Mese'], ['quarter', 'Trim.'], ['year', 'Anno'], ['all', 'Sempre']] as [Preset, string][]).map(([p, label]) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`px-2.5 py-1.5 font-medium transition-colors ${
                      preset === p ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom date range */}
              <div className="flex items-center gap-1">
                <input
                  type="month"
                  value={filterFrom}
                  onChange={e => handleCustomFrom(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                />
                <span className="text-xs text-neutral-400">–</span>
                <input
                  type="month"
                  value={filterTo}
                  onChange={e => handleCustomTo(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                />
              </div>

              {/* Agent filter */}
              <div className="relative">
                <select
                  value={filterAgentId}
                  onChange={e => setFilterAgentId(e.target.value)}
                  className="appearance-none rounded-lg border border-neutral-200 bg-white px-3 py-1.5 pr-7 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  <option value="">Tutti gli agenti</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400" />
              </div>

              {isAdmin && <ExportCsvButton rows={csvRows} month={rangeLabel} />}
            </div>
          </div>
        )}
      </div>

      {/* ── Calendario Team ── */}
      {view === 'calendario' && (
        <TeamCalendar agents={calendarAgents} />
      )}

      {/* ── Classifica ── */}
      {view === 'classifica' && <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <UserRound className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-xs text-neutral-500">Agenti</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{monthTotals.listings}</p>
                <p className="text-xs text-neutral-500">Imm. nel periodo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{monthTotals.content}</p>
                <p className="text-xs text-neutral-500">Contenuti AI</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <BadgeCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{monthTotals.sold}</p>
                <p className="text-xs text-neutral-500">Venduti nel periodo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" />
              Classifica — {rangeLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monthStats.map((row, i) => {
              const isMe = row.agent.id === currentUserId
              return (
                <button
                  key={row.agent.id}
                  type="button"
                  onClick={() => openAgentProfile(row.agent.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${medalBg(i + 1)} ${isMe ? 'ring-2 ring-neutral-900' : ''}`}
                >
                  <span className={`text-lg font-bold w-6 text-center shrink-0 ${medalColor(i + 1)}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-neutral-200">{getInitials(row.agent.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{row.agent.name}{isMe ? ' (tu)' : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{metricValue(row, metric)}</p>
                    <p className="text-[10px] text-neutral-400">{metricSubLabel(row, metric)}</p>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-blue-500" />
              Classifica — {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {yearStats.map((row, i) => {
              const isMe = row.agent.id === currentUserId
              return (
                <button
                  key={row.agent.id}
                  type="button"
                  onClick={() => openAgentProfile(row.agent.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${medalBg(i + 1)} ${isMe ? 'ring-2 ring-neutral-900' : ''}`}
                >
                  <span className={`text-lg font-bold w-6 text-center shrink-0 ${medalColor(i + 1)}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-neutral-200">{getInitials(row.agent.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{row.agent.name}{isMe ? ' (tu)' : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{metricValue(row, metric)}</p>
                    <p className="text-[10px] text-neutral-400">{metricSubLabel(row, metric)}</p>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4 text-neutral-500" />
            Dettaglio agenti — {rangeLabel}
            <span className="text-xs text-neutral-400 font-normal ml-1">Clicca per il profilo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_72px_72px_72px] gap-2 px-3 pb-2 border-b border-neutral-100">
              <p className="text-xs text-neutral-400 uppercase tracking-wider">Agente</p>
              <p className="text-xs text-neutral-400 uppercase tracking-wider text-right">Imm.</p>
              <p className="text-xs text-neutral-400 uppercase tracking-wider text-right">Clienti</p>
              <p className="text-xs text-neutral-400 uppercase tracking-wider text-right">Venduti</p>
            </div>
            {monthStats.map(({ agent, listings, contacts, sold }) => {
              const isMe = agent.id === currentUserId
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => openAgentProfile(agent.id)}
                  className={`w-full grid grid-cols-[1fr_72px_72px_72px] gap-2 items-center rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 group ${isMe ? 'ring-1 ring-inset ring-neutral-300' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px] bg-neutral-200">{getInitials(agent.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {agent.name}{isMe ? ' (tu)' : ''}
                        <ChevronRight className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </p>
                      <Badge variant={agent.role === 'admin' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1.5 mt-0.5">
                        {agent.role === 'admin' ? 'Admin' : 'Agente'}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-right">{listings}</p>
                  <p className="text-sm font-semibold text-right">{contacts}</p>
                  <p className={`text-sm font-semibold text-right ${sold > 0 ? 'text-green-600' : 'text-neutral-400'}`}>{sold}</p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
      </>}
    </div>
  )
}
