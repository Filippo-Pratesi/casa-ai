'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CounterOfferPageProps {
  params: Promise<{ id: string }>
}

export default function CounterOfferPage({ params }: CounterOfferPageProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [prezzoContro, setPrezzoContro] = useState('')
  const [validitaRisposta, setValiditaRisposta] = useState('')
  const [dataRogito, setDataRogito] = useState('')
  const [note, setNote] = useState('')

  // We need the id from params — use React.use() pattern
  const [proposalId, setProposalId] = useState<string | null>(null)

  // Resolve params on first render
  if (!proposalId) {
    params.then(p => setProposalId(p.id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!proposalId) return
    if (!prezzoContro || isNaN(Number(prezzoContro))) {
      toast.error('Inserisci un prezzo valido')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}/counter-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prezzo_controproposto: Math.round(Number(prezzoContro)),
          validita_risposta: validitaRisposta || null,
          data_rogito_proposta: dataRogito || null,
          note_venditore: note || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Errore')
      }
      toast.success('Controproposta registrata')
      router.push(`/proposte/${proposalId}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href={proposalId ? `/proposte/${proposalId}` : '/proposte'}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-600/10">
          <ArrowLeftRight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Controproposta</h1>
          <p className="text-sm text-muted-foreground">Inserisci la risposta del venditore</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">

          <div className="space-y-2">
            <Label htmlFor="prezzo">Prezzo controproposto (€) *</Label>
            <Input
              id="prezzo"
              type="number"
              min={0}
              placeholder="es. 285000"
              value={prezzoContro}
              onChange={e => setPrezzoContro(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validita">Validità risposta</Label>
              <Input
                id="validita"
                type="date"
                value={validitaRisposta}
                onChange={e => setValiditaRisposta(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rogito">Data rogito proposta</Label>
              <Input
                id="rogito"
                type="date"
                value={dataRogito}
                onChange={e => setDataRogito(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note del venditore</Label>
            <Textarea
              id="note"
              placeholder="Eventuali condizioni o note aggiuntive del venditore…"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            disabled={saving || !proposalId}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saving ? 'Salvataggio…' : 'Registra controproposta'}
          </Button>
        </div>
      </form>
    </div>
  )
}
