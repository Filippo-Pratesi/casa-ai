import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceListClient } from '@/components/contabilita/invoice-list-client'
import { InvoiceSummaryCards } from '@/components/contabilita/invoice-summary-cards'

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
    .select('id, numero_fattura, cliente_nome, data_emissione, data_scadenza, totale_documento, netto_a_pagare, status, descrizione, listing_id')
    .eq('workspace_id', profile.workspace_id)
    .order('data_emissione', { ascending: false })

  const invoices = (data ?? []) as {
    id: string
    numero_fattura: string
    cliente_nome: string
    data_emissione: string
    data_scadenza: string | null
    totale_documento: number
    netto_a_pagare: number
    status: 'bozza' | 'inviata' | 'pagata' | 'scaduta'
    descrizione: string
    listing_id: string | null
  }[]

  // Compute summary
  const fatturato = invoices
    .filter(i => i.status === 'pagata')
    .reduce((sum, i) => sum + i.totale_documento, 0)
  const inAttesa = invoices
    .filter(i => i.status === 'inviata')
    .reduce((sum, i) => sum + i.totale_documento, 0)
  const scadute = invoices
    .filter(i => i.status === 'scaduta')
    .reduce((sum, i) => sum + i.totale_documento, 0)

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
        <Button asChild className="btn-ai shrink-0">
          <Link href="/contabilita/nuova">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuova fattura
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <InvoiceSummaryCards fatturato={fatturato} inAttesa={inAttesa} scadute={scadute} />

      {/* Invoice list */}
      <InvoiceListClient invoices={invoices} />
    </div>
  )
}
