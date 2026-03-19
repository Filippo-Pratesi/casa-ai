import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BarChart3, TrendingUp, Users, Clock, Building2, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { AnalyticsAgentFilter } from '@/components/analytics/analytics-agent-filter'

export const metadata = { title: 'Analytics — CasaAI' }

const STAGE_LABELS: Record<string, string> = {
  sconosciuto: 'Sconosciuto', ignoto: 'Non contattato', conosciuto: 'Conosciuto',
  incarico: 'Incarico', venduto: 'Venduto', locato: 'Locato', disponibile: 'Disponibile',
}

const STAGE_COLORS: Record<string, string> = {
  sconosciuto: 'bg-gray-400',
  ignoto: 'bg-slate-500',
  conosciuto: 'bg-blue-400',
  incarico: 'bg-amber-500',
  venduto: 'bg-green-500',
  locato: 'bg-purple-500',
  disponibile: 'bg-teal-400',
}

const STAGE_ORDER = ['sconosciuto', 'ignoto', 'conosciuto', 'incarico', 'venduto', 'locato', 'disponibile']

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) redirect('/auth/setup')

  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'

  // Agents list (for filter dropdown — admin only)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agentsData } = isAdmin ? await (admin as any)
    .from('users')
    .select('id, name')
    .eq('workspace_id', profile.workspace_id)
    .order('name') : { data: [] }
  const agents = (agentsData ?? []) as { id: string; name: string }[]

  const params = await searchParams
  const selectedAgentId = params.agent_id ?? ''

  // Properties — optionally filtered by agent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let propsQuery = (admin as any)
    .from('properties')
    .select('id, stage, agent_id, updated_at, created_at')
    .eq('workspace_id', profile.workspace_id)

  if (selectedAgentId) {
    propsQuery = propsQuery.eq('agent_id', selectedAgentId)
  }

  const { data: propsData } = await propsQuery

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProps = (propsData ?? []) as any[]
  const total = allProps.length

  // Count by stage
  const countByStage: Record<string, number> = {}
  for (const p of allProps) {
    countByStage[p.stage] = (countByStage[p.stage] ?? 0) + 1
  }
  const maxCount = Math.max(...Object.values(countByStage), 1)

  // A4: Avg days since updated per stage — guard invalid dates
  const now = Date.now()
  const avgDaysByStage: Record<string, number> = {}
  for (const stage of STAGE_ORDER) {
    const stageProps = allProps.filter((p: { stage: string }) => p.stage === stage)
    if (stageProps.length === 0) { avgDaysByStage[stage] = 0; continue }
    const validTimes = stageProps
      .map((p: { updated_at: string }) => new Date(p.updated_at).getTime())
      .filter((ms: number) => !isNaN(ms))
    if (validTimes.length === 0) { avgDaysByStage[stage] = 0; continue }
    const avgMs = validTimes.reduce((acc: number, ms: number) => acc + (now - ms), 0) / validTimes.length
    avgDaysByStage[stage] = Math.round(avgMs / (1000 * 60 * 60 * 24))
  }

  // Top agents by property count (only when no agent filter, admin only)
  const agentMap = new Map<string, string>(agents.map(a => [a.id, a.name]))
  const agentCounts: Record<string, number> = {}
  for (const p of allProps) {
    const id = p.agent_id ?? 'unknown'
    agentCounts[id] = (agentCounts[id] ?? 0) + 1
  }
  const topAgents = Object.entries(agentCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ name: agentMap.get(id) ?? 'Agente', count }))
  const maxAgentCount = Math.max(...topAgents.map(a => a.count), 1)

  // Conversion rates
  const sconosciutoCount = countByStage['sconosciuto'] ?? 0
  const ignotoCount = countByStage['ignoto'] ?? 0
  const conosciutoCount = countByStage['conosciuto'] ?? 0
  const incaricoCount = countByStage['incarico'] ?? 0
  const closedCount = (countByStage['venduto'] ?? 0) + (countByStage['locato'] ?? 0)
  // Sconosciuto → Ignoto: % of all properties that moved past "sconosciuto"
  const conversionSconosciuto = total > 0
    ? Math.round((total - sconosciutoCount) / total * 100)
    : 0
  // Ignoto → Conosciuto: % of (ignoto or beyond) that became conosciuto or beyond
  const ignotoPool = ignotoCount + conosciutoCount + incaricoCount + closedCount
  const conversionIgnoto = ignotoPool > 0
    ? Math.round((conosciutoCount + incaricoCount + closedCount) / ignotoPool * 100)
    : 0
  const conversionConosciuto = (conosciutoCount + incaricoCount + closedCount) > 0
    ? Math.round((incaricoCount + closedCount) / (conosciutoCount + incaricoCount + closedCount) * 100)
    : 0
  const conversionIncarico = (incaricoCount + closedCount) > 0
    ? Math.round(closedCount / (incaricoCount + closedCount) * 100)
    : 0

  const selectedAgentName = selectedAgentId ? agentMap.get(selectedAgentId) : null

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.48_0.18_20)] text-white shadow-md">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Analytics Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {selectedAgentName ? `${selectedAgentName} · ` : ''}{total} immobili
            </p>
          </div>
        </div>
        {isAdmin && agents.length > 1 && (
          <Suspense fallback={<div className="h-9 w-48 rounded-lg bg-muted animate-pulse" />}>
            <AnalyticsAgentFilter agents={agents} selectedAgentId={selectedAgentId} />
          </Suspense>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Totale immobili</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/60 cursor-help ml-auto" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs leading-relaxed">
                  Numero totale di immobili presenti in banca dati, inclusi tutti gli stage.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold">{total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">In incarico</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/60 cursor-help ml-auto" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs leading-relaxed">
                  Immobili con mandato di vendita o locazione attivo — il portafoglio gestito attualmente.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold">{incaricoCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground">Chiusi</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/60 cursor-help ml-auto" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs leading-relaxed">
                  Immobili conclusi (venduti o locati) — ogni chiusura rappresenta una commissione incassata.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold">{closedCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Tasso chiusura</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/60 cursor-help ml-auto" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
                  Percentuale di immobili in incarico che arrivano alla chiusura (vendita o locazione). Indica l&apos;efficienza commerciale complessiva.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold">{conversionIncarico}%</p>
        </Card>
      </div>

      {/* Pipeline bar chart */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold">Distribuzione per Stage</h2>
        <div className="space-y-2.5">
          {STAGE_ORDER.map(stage => {
            const count = countByStage[stage] ?? 0
            const pct = total > 0 ? Math.round(count / total * 100) : 0
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0 text-right">{STAGE_LABELS[stage]}</span>
                <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${STAGE_COLORS[stage]}`}
                    style={{ width: `${Math.max(barWidth, count > 0 ? 4 : 0)}%` }}
                  >
                    {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-8 shrink-0">{pct}%</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Avg days per stage */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Giorni medi dall&apos;ultimo aggiornamento per Stage</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
                Indica da quanti giorni in media ogni immobile non riceve aggiornamenti nello stage attuale. Un valore alto segnala stagnazione — considera di ricontattare il proprietario o aggiornare lo stato.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAGE_ORDER.filter(s => (countByStage[s] ?? 0) > 0).map(stage => (
            <div key={stage} className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{STAGE_LABELS[stage]}</p>
              <p className="text-lg font-bold">{avgDaysByStage[stage]}g</p>
              <p className="text-[10px] text-muted-foreground">{countByStage[stage] ?? 0} immobili</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Conversion funnel */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Tassi di Conversione</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                Percentuale di immobili che avanzano da uno stage al successivo nel funnel. Misura l&apos;efficacia di conversione in ogni fase del processo commerciale.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Sconosciuto → Non contattato</p>
            <p className="text-3xl font-bold">{conversionSconosciuto}%</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Non contattato → Conosciuto</p>
            <p className="text-3xl font-bold">{conversionIgnoto}%</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Conosciuto → Incarico</p>
            <p className="text-3xl font-bold">{conversionConosciuto}%</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Incarico → Chiuso</p>
            <p className="text-3xl font-bold">{conversionIncarico}%</p>
          </div>
        </div>
      </Card>

      {/* Top agents — show only when not filtered by single agent */}
      {isAdmin && !selectedAgentId && topAgents.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Top Agenti per Immobili Gestiti</h2>
          </div>
          <div className="space-y-2">
            {topAgents.map(({ name, count }, idx) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                <span className="text-sm font-medium w-32 truncate shrink-0">{name}</span>
                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[oklch(0.57_0.20_33)] transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${(count / maxAgentCount) * 100}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
