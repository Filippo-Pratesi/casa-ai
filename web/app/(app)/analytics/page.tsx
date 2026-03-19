import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BarChart3, TrendingUp, Users, Clock, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export const metadata = { title: 'Analytics — CasaAI' }

const STAGE_LABELS: Record<string, string> = {
  sconosciuto: 'Sconosciuto', ignoto: 'Ignoto', conosciuto: 'Conosciuto',
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

export default async function AnalyticsPage() {
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

  // Properties by stage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: propsData } = await (admin as any)
    .from('properties')
    .select('id, stage, agent_id, updated_at, created_at')
    .eq('workspace_id', profile.workspace_id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProps = (propsData ?? []) as any[]
  const total = allProps.length

  // Count by stage
  const countByStage: Record<string, number> = {}
  for (const p of allProps) {
    countByStage[p.stage] = (countByStage[p.stage] ?? 0) + 1
  }
  const maxCount = Math.max(...Object.values(countByStage), 1)

  // Avg days since updated per stage
  const now = Date.now()
  const avgDaysByStage: Record<string, number> = {}
  for (const stage of STAGE_ORDER) {
    const stageProps = allProps.filter((p: { stage: string }) => p.stage === stage)
    if (stageProps.length === 0) { avgDaysByStage[stage] = 0; continue }
    const avgMs = stageProps.reduce((acc: number, p: { updated_at: string }) => acc + (now - new Date(p.updated_at).getTime()), 0) / stageProps.length
    avgDaysByStage[stage] = Math.round(avgMs / (1000 * 60 * 60 * 24))
  }

  // Top agents by property count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agentsData } = isAdmin ? await (admin as any)
    .from('users')
    .select('id, name')
    .eq('workspace_id', profile.workspace_id) : { data: [] }
  const agentMap = new Map<string, string>(((agentsData ?? []) as { id: string; name: string }[]).map(a => [a.id, a.name]))

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

  // Conversion rates: conosciuto→incarico, incarico→venduto/locato
  const conosciutoCount = countByStage['conosciuto'] ?? 0
  const incaricoCount = countByStage['incarico'] ?? 0
  const closedCount = (countByStage['venduto'] ?? 0) + (countByStage['locato'] ?? 0)
  const conversionConosciuto = (conosciutoCount + incaricoCount + closedCount) > 0
    ? Math.round((incaricoCount + closedCount) / (conosciutoCount + incaricoCount + closedCount) * 100)
    : 0
  const conversionIncarico = (incaricoCount + closedCount) > 0
    ? Math.round(closedCount / (incaricoCount + closedCount) * 100)
    : 0

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.48_0.18_20)] text-white shadow-md">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Analytics Pipeline</h1>
          <p className="text-sm text-muted-foreground">{total} immobili in banca dati</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Totale immobili</p>
          </div>
          <p className="text-2xl font-bold">{total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">In incarico</p>
          </div>
          <p className="text-2xl font-bold">{incaricoCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground">Chiusi</p>
          </div>
          <p className="text-2xl font-bold">{closedCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Tasso chiusura</p>
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
        </div>
        <div className="grid grid-cols-2 gap-4">
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

      {/* Top agents */}
      {isAdmin && topAgents.length > 0 && (
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
