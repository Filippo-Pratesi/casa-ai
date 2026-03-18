'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Receipt, Download, Send, CheckCircle, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InvoiceStatusBadge, type InvoiceStatus } from './invoice-status-badge'
import { formatCurrency } from './invoice-totals-calculator'

interface Invoice {
  id: string
  numero_fattura: string
  cliente_nome: string
  data_emissione: string
  data_scadenza: string | null
  totale_documento: number
  netto_a_pagare: number
  status: InvoiceStatus
  descrizione: string
  listing_id: string | null
}

interface InvoiceListClientProps {
  invoices: Invoice[]
}

export function InvoiceListClient({ invoices: initialInvoices }: InvoiceListClientProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState(initialInvoices)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filtered = invoices.filter(inv => {
    const matchesSearch = !search ||
      inv.numero_fattura.toLowerCase().includes(search.toLowerCase()) ||
      inv.cliente_nome.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function handleMarkPaid(id: string) {
    setActionLoading(id + '-paid')
    try {
      const res = await fetch(`/api/invoices/${id}/mark-paid`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore')
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'pagata' as InvoiceStatus } : inv))
      toast.success('Fattura segnata come pagata')
    } catch {
      toast.error('Errore nell\'aggiornamento')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa fattura? L\'operazione non è reversibile.')) return
    setActionLoading(id + '-del')
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore')
      setInvoices(prev => prev.filter(inv => inv.id !== id))
      toast.success('Fattura eliminata')
    } catch {
      toast.error('Errore nell\'eliminazione')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDownloadPdf(id: string, numero: string) {
    setActionLoading(id + '-pdf')
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`)
      if (!res.ok) throw new Error('Errore generazione PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Fattura-${numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Errore nella generazione del PDF')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSendEmail(id: string) {
    setActionLoading(id + '-send')
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Errore invio')
      }
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'inviata' as InvoiceStatus } : inv))
      toast.success('Fattura inviata via email')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore nell\'invio')
    } finally {
      setActionLoading(null)
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)]">
          <Receipt className="h-8 w-8 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
        </div>
        <h3 className="text-lg font-semibold">Nessuna fattura ancora</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">Crea la tua prima fattura e gestisci la contabilità direttamente da CasaAI.</p>
        <Button asChild className="btn-ai mt-6">
          <Link href="/contabilita/nuova">Crea la prima fattura</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Cerca per n. fattura o cliente…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'bozza', 'inviata', 'pagata', 'scaduta'] as const).map(s => (
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Nessuna fattura corrisponde ai filtri</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv, idx) => (
            <div
              key={inv.id}
              className={`card-lift animate-in-${Math.min(idx + 1, 8)} group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4`}
            >
              {/* Icon */}
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.12)] to-[oklch(0.66_0.15_188/0.08)]">
                <Receipt className="h-5 w-5 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground">{inv.numero_fattura}</span>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <p className="text-sm font-medium text-foreground truncate mt-0.5">{inv.cliente_nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{inv.descrizione}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(inv.data_emissione).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {inv.data_scadenza && (
                    <span className="ml-2">· scad. {new Date(inv.data_scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
                  )}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className="font-semibold text-foreground">{formatCurrency(inv.totale_documento)}</p>
                {inv.netto_a_pagare !== inv.totale_documento && (
                  <p className="text-xs text-muted-foreground">netto {formatCurrency(inv.netto_a_pagare)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  title="Scarica PDF"
                  onClick={() => handleDownloadPdf(inv.id, inv.numero_fattura)}
                  disabled={actionLoading === inv.id + '-pdf'}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Download className="h-4 w-4" />
                </button>
                {inv.status === 'bozza' && (
                  <button
                    title="Invia via email"
                    onClick={() => handleSendEmail(inv.id)}
                    disabled={actionLoading === inv.id + '-send'}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
                {(inv.status === 'inviata' || inv.status === 'scaduta') && (
                  <button
                    title="Segna come pagata"
                    onClick={() => handleMarkPaid(inv.id)}
                    disabled={actionLoading === inv.id + '-paid'}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-green-500 hover:text-white transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                {inv.status === 'bozza' && (
                  <button
                    title="Elimina"
                    onClick={() => handleDelete(inv.id)}
                    disabled={actionLoading === inv.id + '-del'}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <Link
                  href={`/contabilita/${inv.id}`}
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
