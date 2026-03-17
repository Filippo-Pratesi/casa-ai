'use client'

import Link from 'next/link'
import { Users, FileText } from 'lucide-react'

interface UsageMetersProps {
  agentCount: number
  maxAgents: number
  listingsThisMonth: number
  maxListingsPerMonth: number
  planName: string
}

function MeterBar({ value, max }: { value: number; max: number }) {
  if (max === -1) return null
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
      <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function UsageMeters({
  agentCount,
  maxAgents,
  listingsThisMonth,
  maxListingsPerMonth,
  planName,
}: UsageMetersProps) {
  const unlimited = (max: number) => max === -1

  return (
    <div className="space-y-4">
      {/* Agents */}
      <div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Agenti</span>
          </div>
          <span className="font-medium tabular-nums">
            {agentCount}{unlimited(maxAgents) ? '' : ` / ${maxAgents}`}
            {unlimited(maxAgents) && <span className="ml-1 text-xs text-muted-foreground">illimitati</span>}
          </span>
        </div>
        <MeterBar value={agentCount} max={maxAgents} />
        {!unlimited(maxAgents) && agentCount >= maxAgents && (
          <p className="mt-1 text-xs text-red-600">
            Limite raggiunto.{' '}
            <Link href="/plans" className="underline">Aggiorna piano</Link>
          </p>
        )}
      </div>

      {/* Listings this month */}
      <div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Annunci questo mese</span>
          </div>
          <span className="font-medium tabular-nums">
            {listingsThisMonth}{unlimited(maxListingsPerMonth) ? '' : ` / ${maxListingsPerMonth}`}
            {unlimited(maxListingsPerMonth) && <span className="ml-1 text-xs text-muted-foreground">illimitati</span>}
          </span>
        </div>
        <MeterBar value={listingsThisMonth} max={maxListingsPerMonth} />
        {!unlimited(maxListingsPerMonth) && listingsThisMonth >= maxListingsPerMonth && (
          <p className="mt-1 text-xs text-red-600">
            Limite mensile raggiunto.{' '}
            <Link href="/plans" className="underline">Aggiorna piano</Link>
          </p>
        )}
      </div>

      {planName === 'Trial' && (
        <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          Sei in periodo di prova.{' '}
          <Link href="/plans" className="font-medium underline">Scegli un piano</Link> per sbloccare tutte le funzionalità.
        </div>
      )}
    </div>
  )
}
