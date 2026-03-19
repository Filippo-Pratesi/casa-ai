'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Receipt, Download, Send, CheckCircle, Trash2, ChevronRight, Copy, FileDown, MoreVertical, Pencil, X, FileCode } from 'lucide-react'
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
  data_pagamento: string | null
  totale_documento: number
  netto_a_pagare: number
  status: InvoiceStatus
  descrizione: string
  listing_id: string | null
  document_type?: 'fattura' | 'nota_credito'
}

interface InvoiceListClientProps {
  invoices: Invoice[]
}

function InvoiceRowMenu({ inv, onAction }: { inv: Invoice; onAction: (a: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors'
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-border bg-card shadow-lg py-1">
          <Link href={`/contabilita/${inv.id}`} className={item} onClick={() => setOpen(false)}><ChevronRight className="h-4 w-4" />Visualizza</Link>
          {inv.status === 'bozza' && <Link href={`/contabilita/${inv.id}/modifica`} className={item} onClick={() => setOpen(false)}><Pencil className="h-4 w-4" />Modifica</Link>}
          <button onClick={() => { setOpen(false); onAction('pdf') }} className={item}><Download className="h-4 w-4" />Scarica PDF</button>
          <button onClick={() => { setOpen(false); onAction('xml') }} className={item}><FileCode className="h-4 w-4" />Scarica XML SDI</button>
          <button onClick={() => { setOpen(false); onAction('duplicate') }} className={item}><Copy className="h-4 w-4" />Duplica</button>
          {inv.status === 'bozza' && <button onClick={() => { setOpen(false); onAction('send') }} className={item}><Send className="h-4 w-4" />Invia via email</button>}
          {(inv.status === 'inviata' || inv.status === 'scaduta') && <button onClick={() => { setOpen(false); onAction('paid') }} className={`${item} text-green-600 dark:text-green-400`}><CheckCircle className="h-4 w-4" />Segna come pagata</button>}
          {inv.status === 'bozza' && <><div className="my-1 border-t border-border" /><button onClick={() => { setOpen(false); onAction('delete') }} className={`${item} text-destructive hover:bg-destructive/10`}><Trash2 className="h-4 w-4" />Elimina</button></>}
        </div>
      )}
    </div>
  )
}

export function InvoiceListClient({ invoices: initialInvoices }: InvoiceListClientProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState(initialInvoices)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [docFilter, setDocFilter] = useState<'all' | 'fattura' | 'nota_credito'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filtered = invoices.filter(inv => {
    const matchesSearch = !search ||
      inv.numero_fattura.toLowerCase().includes(search.toLowerCase()) ||
      inv.cliente_nome.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    const matchesDoc = docFilter === 'all' || (inv.document_type ?? 'fattura') === docFilter
    const matchDateFrom = !dateFrom || inv.data_emissione >= dateFrom
    const matchDateTo = !dateTo || inv.data_emissione <= dateTo
    return matchesSearch && matchesStatus && matchesDoc && matchDateFrom && matchDateTo
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

  async function handleDuplicate(id: string) {
    setActionLoading(id + '-dup')
    try {
      const res = await fetch(`/api/invoices/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore')
      const d = await res.json()
      toast.success(`Fattura duplicata: ${d.numero_fattura}`)
      router.refresh()
    } catch {
      toast.error('Errore nella duplicazione')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDownloadXml(id: string, numero: string) {
    setActionLoading(id + '-xml')
    try {
      const res = await fetch(`/api/invoices/${id}/xml`)
      if (!res.ok) throw new Error('Errore generazione XML')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `FatturaPA_${numero.replace(/[^A-Za-z0-9_-]/g, '_')}.xml`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Errore nella generazione del XML')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleExportCsv() {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/invoices/export?${params.toString()}`)
      if (!res.ok) throw new Error('Errore')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fatture-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export CSV scaricato')
    } catch {
      toast.error("Errore nell'export")
    }
  }

  function handleRowAction(inv: Invoice, action: string) {
    switch (action) {
      case 'pdf': handleDownloadPdf(inv.id, inv.numero_fattura); break
      case 'xml': handleDownloadXml(inv.id, inv.numero_fattura); break
      case 'send': handleSendEmail(inv.id); break
      case 'paid': handleMarkPaid(inv.id); break
      case 'delete': handleDelete(inv.id); break
      case 'duplicate': handleDuplicate(inv.id); break
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
        <Link href="/contabilita/nuova" className="btn-ai mt-6 inline-flex items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium">Crea la prima fattura</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters + Export */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Input
            placeholder="Cerca per n. fattura o cliente…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          {/* Date range filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Periodo:</span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">Dal</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-7 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">Al</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-7 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
                Reset date
              </button>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="shrink-0 gap-1.5">
          <FileDown className="h-4 w-4" />
          Esporta CSV
        </Button>
      </div>

      {/* Status filter pills */}
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

      {/* Document type filter pills */}
      <div className="flex gap-2 flex-wrap">
        {([
          { value: 'all', label: 'Tutti i documenti' },
          { value: 'fattura', label: 'Solo fatture' },
          { value: 'nota_credito', label: 'Solo note di credito' },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setDocFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              docFilter === value
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {label}
          </button>
        ))}
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
              <Link href={`/contabilita/${inv.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground">{inv.numero_fattura}</span>
                  {inv.document_type === 'nota_credito' && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">NC</span>
                  )}
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
              </Link>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className="font-semibold text-foreground">{formatCurrency(inv.totale_documento)}</p>
                {inv.netto_a_pagare !== inv.totale_documento && (
                  <p className="text-xs text-muted-foreground">netto {formatCurrency(inv.netto_a_pagare)}</p>
                )}
              </div>

              {/* Desktop actions */}
              <div className="shrink-0 hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button title="PDF" onClick={() => handleDownloadPdf(inv.id, inv.numero_fattura)} disabled={actionLoading === inv.id + '-pdf'} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Download className="h-4 w-4" /></button>
                <button title="XML SDI" onClick={() => handleDownloadXml(inv.id, inv.numero_fattura)} disabled={actionLoading === inv.id + '-xml'} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><FileCode className="h-4 w-4" /></button>
                <button title="Duplica" onClick={() => handleDuplicate(inv.id)} disabled={actionLoading === inv.id + '-dup'} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Copy className="h-4 w-4" /></button>
                {inv.status === 'bozza' && <button title="Invia" onClick={() => handleSendEmail(inv.id)} disabled={actionLoading === inv.id + '-send'} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Send className="h-4 w-4" /></button>}
                {(inv.status === 'inviata' || inv.status === 'scaduta') && <button title="Pagata" onClick={() => handleMarkPaid(inv.id)} disabled={actionLoading === inv.id + '-paid'} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-green-500 hover:text-white transition-colors"><CheckCircle className="h-4 w-4" /></button>}
                {inv.status === 'bozza' && <button title="Elimina" onClick={() => handleDelete(inv.id)} disabled={actionLoading === inv.id + '-del'} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>}
                <Link href={`/contabilita/${inv.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><ChevronRight className="h-4 w-4" /></Link>
              </div>
              {/* Mobile dropdown */}
              <div className="shrink-0 sm:hidden">
                <InvoiceRowMenu inv={inv} onAction={(action) => handleRowAction(inv, action)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
