import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, FileText, Download, ArrowLeftRight, ArrowRightLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { ProposalStatusBadge } from '@/components/proposals/proposal-status-badge'
import { ProposalDetailActions } from '@/components/proposals/proposal-detail-actions'
import { GenerateInvoiceButton } from '@/components/proposals/generate-invoice-button'

function fmtEur(n: number | null | undefined) {
  if (n == null) return '---'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

type Params = { params: Promise<{ id: string }> }

export default async function PropostaDetailPage({ params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: proposal } = await (admin as any)
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!proposal) notFound()

  const vincoli = (proposal.vincoli ?? []) as { tipo: string; descrizione?: string; importo_mutuo?: number; nome_banca?: string }[]

  const vincoloLabel: Record<string, string> = {
    mutuo: 'Soggetta alla concessione del mutuo',
    vendita_immobile: "Soggetta alla vendita dell'immobile del proponente",
    perizia: 'Soggetta a perizia bancaria positiva',
    personalizzata: 'Condizione personalizzata',
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/proposte"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)]">
            <FileText className="h-5 w-5 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">{proposal.numero_proposta}</h1>
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <p className="text-sm text-muted-foreground">Proposta d'acquisto — {fmtDate(proposal.data_proposta)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a href={`/api/proposals/${id}/pdf`} target="_blank" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Download className="h-4 w-4 mr-1.5" />
            PDF
          </a>
          {proposal.status === 'inviata' && (
            <Link href={`/proposte/${id}/counter-offer`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <ArrowLeftRight className="h-4 w-4 mr-1.5" />
              Controproposta
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">

          {/* Property */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Immobile</h2>
            <p className="font-semibold text-foreground">{proposal.immobile_indirizzo}</p>
            <p className="text-sm text-muted-foreground">{proposal.immobile_citta}</p>
            {proposal.immobile_tipo && (
              <p className="text-sm text-muted-foreground mt-1">
                {proposal.immobile_tipo.charAt(0).toUpperCase() + proposal.immobile_tipo.slice(1)}
              </p>
            )}
          </div>

          {/* Parties */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Parti</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Proponente (Acquirente)</p>
                <p className="font-semibold text-foreground">{proposal.proponente_nome}</p>
                {proposal.proponente_telefono && <p className="text-sm text-muted-foreground">{proposal.proponente_telefono}</p>}
                {proposal.proponente_email && <p className="text-sm text-muted-foreground">{proposal.proponente_email}</p>}
                {proposal.proponente_codice_fiscale && <p className="text-sm text-muted-foreground">C.F.: {proposal.proponente_codice_fiscale}</p>}
              </div>
              {proposal.proprietario_nome && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Proprietario (Venditore)</p>
                  <p className="font-semibold text-foreground">{proposal.proprietario_nome}</p>
                </div>
              )}
            </div>
          </div>

          {/* Conditions */}
          {vincoli.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Condizioni sospensive</h2>
              <ul className="space-y-2">
                {vincoli.map((v, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)] font-bold">•</span>
                    <span>
                      {vincoloLabel[v.tipo] ?? v.tipo}
                      {v.tipo === 'mutuo' && v.importo_mutuo ? ` di ${fmtEur(v.importo_mutuo)}` : ''}
                      {v.tipo === 'mutuo' && v.nome_banca ? ` presso ${v.nome_banca}` : ''}
                      {v.tipo === 'personalizzata' && v.descrizione ? `: ${v.descrizione}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {proposal.note && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Note</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">{proposal.note}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Offer */}
          <div className="rounded-2xl border border-[oklch(0.57_0.20_33/0.3)] bg-gradient-to-br from-[oklch(0.57_0.20_33/0.05)] to-[oklch(0.66_0.15_188/0.03)] p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Offerta economica</h2>
            <p className="text-3xl font-bold text-foreground">{fmtEur(proposal.prezzo_offerto)}</p>
            {proposal.prezzo_richiesto > 0 && (
              <p className="text-sm text-muted-foreground mt-1">Richiesto: {fmtEur(proposal.prezzo_richiesto)}</p>
            )}
            {proposal.caparra_confirmatoria > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">Caparra confirmatoria</p>
                <p className="font-semibold text-foreground">{fmtEur(proposal.caparra_confirmatoria)}</p>
                {proposal.caparra_in_gestione_agenzia && (
                  <p className="text-xs text-muted-foreground mt-0.5">In gestione all'agenzia</p>
                )}
              </div>
            )}
          </div>

          {/* Counter-offer */}
          {proposal.prezzo_controproposto != null && (
            <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightLeft className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Controproposta</h2>
              </div>
              <p className="text-2xl font-bold text-foreground">{fmtEur(proposal.prezzo_controproposto)}</p>
              <div className="mt-4 space-y-2">
                {proposal.validita_risposta && (
                  <div>
                    <p className="text-xs text-muted-foreground">Validità risposta</p>
                    <p className="text-sm font-medium text-foreground">{fmtDate(proposal.validita_risposta)}</p>
                  </div>
                )}
                {proposal.data_rogito_proposta && (
                  <div>
                    <p className="text-xs text-muted-foreground">Rogito entro il</p>
                    <p className="text-sm font-medium text-foreground">{fmtDate(proposal.data_rogito_proposta)}</p>
                  </div>
                )}
                {proposal.note_venditore && (
                  <div>
                    <p className="text-xs text-muted-foreground">Note del venditore</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{proposal.note_venditore}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date</h2>
            <div>
              <p className="text-xs text-muted-foreground">Data proposta</p>
              <p className="text-sm font-medium text-foreground">{fmtDate(proposal.data_proposta)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Validità fino al</p>
              <p className="text-sm font-medium text-foreground">{fmtDate(proposal.validita_proposta)}</p>
            </div>
            {proposal.data_rogito_proposta && (
              <div>
                <p className="text-xs text-muted-foreground">Rogito entro il</p>
                <p className="text-sm font-medium text-foreground">{fmtDate(proposal.data_rogito_proposta)}</p>
              </div>
            )}
          </div>

          {/* Agent */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Agente</h2>
            <p className="text-sm font-medium text-foreground">{proposal.agente_nome}</p>
            <p className="text-xs text-muted-foreground">{proposal.agente_agenzia}</p>
            {proposal.notaio_preferito && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Notaio preferito</p>
                <p className="text-sm text-foreground">{proposal.notaio_preferito}</p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          {proposal.status === 'inviata' && (
            <ProposalDetailActions proposalId={id} />
          )}

          {/* Generate invoice from accepted proposal */}
          {proposal.status === 'accettata' && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Azioni</h2>
              <GenerateInvoiceButton proposalId={id} proposalNumero={proposal.numero_proposta} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
