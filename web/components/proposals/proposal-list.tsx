'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Download, CheckCircle, XCircle, Trash2, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProposalStatusBadge, type ProposalStatus } from './proposal-status-badge'

interface Proposal {
  id: string
  numero_proposta: string
  proponente_nome: string
  immobile_indirizzo: string
  immobile_citta: string
  prezzo_offerto: number
  prezzo_richiesto: number
  data_proposta: string
  validita_proposta: string
  status: ProposalStatus
}

interface ProposalListProps {
  proposals: Proposal[]
}

function formatEuro(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export function ProposalList({ proposals: initialProposals }: ProposalListProps) {
  const router = useRouter()
  const [proposals, setProposals] = useState(initialProposals)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = proposals.filter(p => {
    const matchSearch = !search ||
      p.numero_proposta.toLowerCase().includes(search.toLowerCase()) ||
      p.proponente_nome.toLowerCase().includes(search.toLowerCase()) ||
      p.immobile_indirizzo.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleRespond(id: string, action: 'accettata' | 'rifiutata') {
    if (!confirm(`Vuoi segnare questa proposta come "${action}"?`)) return
    setLoading(id + '-' + action)
    try {
      const res = await fetch(`/api/proposals/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Errore')
      setProposals(prev => prev.map(p => p.id === id ? { ...p, status: action } : p))
      toast.success(action === 'accettata' ? 'Proposta accettata!' : 'Proposta rifiutata')
    } catch {
      toast.error('Errore nell\'aggiornamento')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa bozza?')) return
    setLoading(id + '-del')
    try {
      const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore')
      setProposals(prev => prev.filter(p => p.id !== id))
      toast.success('Proposta eliminata')
    } catch {
      toast.error('Errore nell\'eliminazione')
    } finally {
      setLoading(null)
    }
  }

  async function handleDownloadPdf(id: string, numero: string) {
    setLoading(id + '-pdf')
    try {
      const res = await fetch(`/api/proposals/${id}/pdf`)
      if (!res.ok) throw new Error('Errore')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Proposta-${numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Errore nella generazione del PDF')
    } finally {
      setLoading(null)
    }
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)]">
          <FileText className="h-8 w-8 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
        </div>
        <h3 className="text-lg font-semibold">Nessuna proposta ancora</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">Crea la prima proposta d&apos;acquisto selezionando un immobile e un acquirente.</p>
        <Button asChild className="btn-ai mt-6">
          <Link href="/proposte/nuova">Crea proposta</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Cerca per numero, acquirente o indirizzo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'bozza', 'inviata', 'accettata', 'controproposta', 'rifiutata', 'scaduta'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-[oklch(0.57_0.20_33)] text-white dark:bg-[oklch(0.73_0.18_36)]'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s === 'all' ? 'Tutte' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Nessuna proposta corrisponde ai filtri</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, idx) => (
            <div
              key={p.id}
              className={`card-lift animate-in-${Math.min(idx + 1, 8)} group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4`}
            >
              {/* Icon */}
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.12)] to-[oklch(0.66_0.15_188/0.08)]">
                <FileText className="h-5 w-5 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-foreground">{p.numero_proposta}</span>
                  <ProposalStatusBadge status={p.status} />
                </div>
                <p className="text-sm font-medium text-foreground truncate mt-0.5">{p.proponente_nome}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{p.immobile_indirizzo}, {p.immobile_citta}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(p.data_proposta).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  <span className="ml-2">· valida fino al {new Date(p.validita_proposta).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
                </p>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <p className="font-semibold text-foreground">{formatEuro(p.prezzo_offerto)}</p>
                {p.prezzo_richiesto > 0 && p.prezzo_offerto !== p.prezzo_richiesto && (
                  <p className="text-xs text-muted-foreground">rich. {formatEuro(p.prezzo_richiesto)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  title="Scarica PDF"
                  onClick={() => handleDownloadPdf(p.id, p.numero_proposta)}
                  disabled={loading === p.id + '-pdf'}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Download className="h-4 w-4" />
                </button>
                {p.status === 'inviata' && (
                  <>
                    <button
                      title="Accetta proposta"
                      onClick={() => handleRespond(p.id, 'accettata')}
                      disabled={!!loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-green-500 hover:text-white transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      title="Controproposta"
                      onClick={() => router.push(`/proposte/${p.id}/counter-offer`)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-purple-500 hover:text-white transition-colors"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <button
                      title="Rifiuta proposta"
                      onClick={() => handleRespond(p.id, 'rifiutata')}
                      disabled={!!loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </>
                )}
                {p.status === 'bozza' && (
                  <button
                    title="Elimina bozza"
                    onClick={() => handleDelete(p.id)}
                    disabled={!!loading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <Link
                  href={`/proposte/${p.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
