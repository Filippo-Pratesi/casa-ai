import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Receipt } from 'lucide-react'
import { InvoiceListClient } from '@/components/contabilita/invoice-list-client'
import { InvoiceSummaryCards } from '@/components/contabilita/invoice-summary-cards'
import { InvoiceAgingSummary } from '@/components/contabilita/invoice-aging-summary'
import { computeStats } from '@/app/api/invoices/stats/route'

export default async function ContabilitaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('invoices')
    .select('id, numero_fattura, cliente_nome, data_emissione, data_scadenza, data_pagamento, totale_documento, netto_a_pagare, status, descrizione, listing_id')
    .eq('workspace_id', profile.workspace_id)
    .order('data_emissione', { ascending: false })

  const invoices = (data ?? []) as {
    id: string
    numero_fattura: string
    cliente_nome: string
    data_emissione: string
    data_scadenza: string | null
    data_pagamento: string | null
    totale_documento: number
    netto_a_pagare: number
    status: 'bozza' | 'inviata' | 'pagata' | 'scaduta'
    descrizione: string
    listing_id: string | null
  }[]

  const stats = computeStats(invoices as Record<string, unknown>[])

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)]">
            <Receipt className="h-5 w-5 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contabilità</h1>
            <p className="text-sm text-muted-foreground">Gestisci fatture e provvigioni</p>
          </div>
        </div>
        <Link href="/contabilita/nuova" className="btn-ai inline-flex items-center gap-2 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          Nuova fattura
        </Link>
      </div>

      {/* B1: Empty state for new users */}
      {invoices.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border mesh-bg py-20 text-center">
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] p-4 shadow-lg shadow-[oklch(0.57_0.20_33/0.3)]">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-base font-bold">Nessuna fattura ancora</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Crea la tua prima fattura per tenere traccia di provvigioni e pagamenti.
          </p>
          <Link href="/contabilita/nuova" className="btn-ai mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold">
            <Plus className="h-4 w-4" />
            Nuova fattura
          </Link>
        </div>
      )}

      {/* Summary cards — only when data exists */}
      {invoices.length > 0 && (
        <InvoiceSummaryCards stats={stats} />
      )}

      {/* Aging report */}
      {invoices.length > 0 && (
        <InvoiceAgingSummary aging={stats.aging} />
      )}

      {/* Invoice list */}
      {invoices.length > 0 && <InvoiceListClient invoices={invoices} />}
    </div>
  )
}
