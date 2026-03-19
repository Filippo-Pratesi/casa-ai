import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Receipt, Download, CheckCircle, Send, Pencil, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceStatusBadge } from '@/components/contabilita/invoice-status-badge'
import { formatCurrency } from '@/components/contabilita/invoice-totals-calculator'
import { InvoiceDetailActions } from '@/components/contabilita/invoice-detail-actions'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

type Params = { params: Promise<{ id: string }> }

export default async function InvoiceDetailPage({ params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoice } = await (admin as any)
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!invoice) notFound()

  const voci = (invoice.voci ?? []) as { descrizione: string; quantita: number; prezzo_unitario: number; importo: number }[]

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/contabilita"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)]">
            <Receipt className="h-5 w-5 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">{invoice.numero_fattura}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground">Fattura — {fmtDate(invoice.data_emissione)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {invoice.status === 'bozza' && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contabilita/${id}/modifica`}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Modifica
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/invoices/${id}/pdf`} target="_blank">
              <Download className="h-4 w-4 mr-1.5" />
              PDF
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">

          {/* Client */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Cliente</h2>
            <p className="font-semibold text-foreground">{invoice.cliente_nome}</p>
            {invoice.cliente_indirizzo && <p className="text-sm text-muted-foreground">{invoice.cliente_indirizzo}</p>}
            {invoice.cliente_citta && (
              <p className="text-sm text-muted-foreground">
                {invoice.cliente_cap ? `${invoice.cliente_cap} ` : ''}{invoice.cliente_citta}
                {invoice.cliente_provincia ? ` (${invoice.cliente_provincia})` : ''}
              </p>
            )}
            {invoice.cliente_codice_fiscale && (
              <p className="text-sm text-muted-foreground mt-1">C.F./P.IVA: {invoice.cliente_codice_fiscale}</p>
            )}
            {invoice.cliente_pec && <p className="text-sm text-muted-foreground">PEC: {invoice.cliente_pec}</p>}
          </div>

          {/* Line items */}
          {voci.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Voci</h2>
              <div className="space-y-0">
                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="col-span-6">Descrizione</div>
                  <div className="col-span-2 text-center">Qt.</div>
                  <div className="col-span-2 text-right">Prezzo</div>
                  <div className="col-span-2 text-right">Importo</div>
                </div>
                {voci.map((v, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 py-2.5 border-b border-border/50 last:border-0 text-sm">
                    <div className="col-span-6 text-foreground">{v.descrizione}</div>
                    <div className="col-span-2 text-center text-muted-foreground">{v.quantita}</div>
                    <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(v.prezzo_unitario)}</div>
                    <div className="col-span-2 text-right font-medium text-foreground">{formatCurrency(v.importo)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.note && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Note</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.note}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Totals */}
          <div className="rounded-2xl border border-[oklch(0.57_0.20_33/0.3)] bg-gradient-to-br from-[oklch(0.57_0.20_33/0.05)] to-[oklch(0.66_0.15_188/0.03)] p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Importi</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Imponibile</span>
                <span className="font-medium">{formatCurrency(invoice.imponibile)}</span>
              </div>
              {invoice.contributo_cassa && invoice.importo_cassa > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contributo cassa ({invoice.aliquota_cassa}%)</span>
                  <span>{formatCurrency(invoice.importo_cassa)}</span>
                </div>
              )}
              {invoice.regime === 'ordinario' && invoice.importo_iva > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA ({invoice.aliquota_iva}%)</span>
                  <span>{formatCurrency(invoice.importo_iva)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-1 border-t border-border">
                <span className="font-bold text-foreground">Totale documento</span>
                <span className="font-bold text-lg text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]">{formatCurrency(invoice.totale_documento)}</span>
              </div>
              {invoice.ritenuta_acconto && invoice.importo_ritenuta > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ritenuta ({invoice.aliquota_ritenuta}%)</span>
                    <span>- {formatCurrency(invoice.importo_ritenuta)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Netto a pagare</span>
                    <span>{formatCurrency(invoice.netto_a_pagare)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dates & payment */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date & Pagamento</h2>
            <div>
              <p className="text-xs text-muted-foreground">Emissione</p>
              <p className="text-sm font-medium text-foreground">{fmtDate(invoice.data_emissione)}</p>
            </div>
            {invoice.data_scadenza && (
              <div>
                <p className="text-xs text-muted-foreground">Scadenza</p>
                <p className="text-sm font-medium text-foreground">{fmtDate(invoice.data_scadenza)}</p>
              </div>
            )}
            {invoice.data_pagamento && (
              <div>
                <p className="text-xs text-muted-foreground">Pagato il</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">{fmtDate(invoice.data_pagamento)}</p>
              </div>
            )}
            {invoice.metodo_pagamento && (
              <div>
                <p className="text-xs text-muted-foreground">Modalità</p>
                <p className="text-sm font-medium text-foreground capitalize">{invoice.metodo_pagamento}</p>
              </div>
            )}
            {invoice.iban && (
              <div>
                <p className="text-xs text-muted-foreground">IBAN</p>
                <p className="text-sm font-mono text-foreground">{invoice.iban}</p>
              </div>
            )}
          </div>

          {/* Proposal link */}
          {invoice.proposal_id && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Proposta collegata</h2>
              <Link
                href={`/proposte/${invoice.proposal_id}`}
                className="flex items-center gap-2 text-sm font-medium text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)] hover:underline"
              >
                <FileText className="h-4 w-4" />
                Visualizza proposta d&apos;acquisto
              </Link>
            </div>
          )}

          {/* Actions */}
          {(invoice.status === 'inviata' || invoice.status === 'scaduta' || invoice.status === 'bozza') && (
            <InvoiceDetailActions invoiceId={id} status={invoice.status} clienteEmail={invoice.cliente_email ?? null} />
          )}
        </div>
      </div>
    </div>
  )
}
