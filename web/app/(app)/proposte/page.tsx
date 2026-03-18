import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { ProposalList } from '@/components/proposals/proposal-list'

export default async function PropostePage() {
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
    .from('proposals')
    .select('id, numero_proposta, proponente_nome, immobile_indirizzo, immobile_citta, prezzo_offerto, prezzo_richiesto, data_proposta, validita_proposta, status')
    .eq('workspace_id', profile.workspace_id)
    .order('data_proposta', { ascending: false })

  const proposals = (data ?? []) as {
    id: string
    numero_proposta: string
    proponente_nome: string
    immobile_indirizzo: string
    immobile_citta: string
    prezzo_offerto: number
    prezzo_richiesto: number
    data_proposta: string
    validita_proposta: string
    status: 'bozza' | 'inviata' | 'accettata' | 'rifiutata' | 'scaduta' | 'controproposta' | 'ritirata'
  }[]

  // Stats
  const active = proposals.filter(p => ['inviata', 'controproposta'].includes(p.status)).length
  const accepted = proposals.filter(p => p.status === 'accettata').length
  const total = proposals.length

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)]">
            <FileText className="h-5 w-5 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Proposte d&apos;acquisto</h1>
            <p className="text-sm text-muted-foreground">Gestisci proposte e controproposte</p>
          </div>
        </div>
        <Link href="/proposte/nuova" className="btn-ai inline-flex items-center gap-2 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          Nuova proposta
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
          <div className="animate-in-1 rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Totali</p>
          </div>
          <div className="animate-in-2 rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{active}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">In corso</p>
          </div>
          <div className="animate-in-3 rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{accepted}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Accettate</p>
          </div>
        </div>

      {/* List */}
      <ProposalList proposals={proposals} />
    </div>
  )
}
