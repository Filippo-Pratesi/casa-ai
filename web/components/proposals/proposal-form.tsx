'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConditionType, Vincolo, ProposalFormProps, today, defaultValidity } from './proposal-types'
import { VincoliSection } from './vincoli-section'
import { ProposalSummary } from './proposal-summary'

export { type ConditionType, type Vincolo } from './proposal-types'

export function ProposalForm({
  contacts, listings, nextNumber, workspaceName, agentName, mode, initialData, proposalId
}: ProposalFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Listing & contact
  const [selectedListingId, setSelectedListingId] = useState((initialData?.listing_id as string) ?? '')
  const [selectedContactId, setSelectedContactId] = useState((initialData?.buyer_contact_id as string) ?? '')
  const [selectedSellerContactId, setSelectedSellerContactId] = useState((initialData?.seller_contact_id as string) ?? '')

  // Snapshot fields (auto-filled + editable)
  const [immobileIndirizzo, setImmobileIndirizzo] = useState((initialData?.immobile_indirizzo as string) ?? '')
  const [immobileCitta, setImmobileCitta] = useState((initialData?.immobile_citta as string) ?? '')
  const [prezzoRichiesto, setPrezzoRichiesto] = useState((initialData?.prezzo_richiesto as number) ?? 0)
  const [proponenteNome, setProponenteNome] = useState((initialData?.proponente_nome as string) ?? '')
  const [proponenteCF, setProponenteCF] = useState((initialData?.proponente_codice_fiscale as string) ?? '')
  const [proponenteTel, setProponenteTel] = useState((initialData?.proponente_telefono as string) ?? '')
  const [proponenteEmail, setProponenteEmail] = useState((initialData?.proponente_email as string) ?? '')
  const [proprietarioNome, setProprietarioNome] = useState((initialData?.proprietario_nome as string) ?? '')

  // Financial
  const [prezzoOfferto, setPrezzoOfferto] = useState((initialData?.prezzo_offerto as number) ?? 0)
  const [caparra, setCaparra] = useState((initialData?.caparra_confirmatoria as number) ?? 0)
  const [caparraInAgenzia, setCaparraInAgenzia] = useState((initialData?.caparra_in_gestione_agenzia as boolean) ?? false)

  // Dates
  const [dataProposta, setDataProposta] = useState((initialData?.data_proposta as string) ?? today)
  const [validita, setValidita] = useState((initialData?.validita_proposta as string) ?? defaultValidity)
  const [dataRogito, setDataRogito] = useState((initialData?.data_rogito_proposta as string) ?? '')

  // Optional
  const [notaio, setNotaio] = useState((initialData?.notaio_preferito as string) ?? '')
  const [note, setNote] = useState((initialData?.note as string) ?? '')

  // Conditions
  const [vincoli, setVincoli] = useState<Vincolo[]>((initialData?.vincoli as Vincolo[]) ?? [])

  // Auto-fill from listing
  const handleListingChange = useCallback((listingId: string) => {
    setSelectedListingId(listingId)
    const l = listings.find(x => x.id === listingId)
    if (l) {
      setImmobileIndirizzo(l.address)
      setImmobileCitta(l.city)
      if (l.price) setPrezzoRichiesto(l.price)
    }
  }, [listings])

  // Auto-fill from buyer contact
  const handleContactChange = useCallback((contactId: string) => {
    setSelectedContactId(contactId)
    const c = contacts.find(x => x.id === contactId)
    if (c) {
      setProponenteNome(c.name)
      if (c.email) setProponenteEmail(c.email)
      if (c.phone) setProponenteTel(c.phone)
    }
  }, [contacts])

  // Auto-fill seller from contact
  const handleSellerContactChange = useCallback((contactId: string) => {
    setSelectedSellerContactId(contactId)
    const c = contacts.find(x => x.id === contactId)
    if (c) {
      setProprietarioNome(c.name)
    }
  }, [contacts])

  // Vincoli management
  function addVincolo(tipo: ConditionType) {
    setVincoli(prev => [...prev, { tipo }])
  }
  function removeVincolo(idx: number) {
    setVincoli(prev => prev.filter((_, i) => i !== idx))
  }
  function updateVincolo(idx: number, updates: Partial<Vincolo>) {
    setVincoli(prev => prev.map((v, i) => i === idx ? { ...v, ...updates } : v))
  }

  const formatEuro = (n: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  async function handleSave(asInviata = false) {
    if (!selectedListingId) { toast.error("Seleziona un immobile"); return }
    if (!selectedContactId) { toast.error("Seleziona un acquirente"); return }
    if (!proponenteNome) { toast.error("Nome proponente obbligatorio"); return }
    if (prezzoOfferto <= 0) { toast.error("Inserisci il prezzo offerto"); return }
    if (!validita) { toast.error("Inserisci la validità della proposta"); return }

    setSaving(true)
    try {
      const payload = {
        listing_id: selectedListingId,
        buyer_contact_id: selectedContactId,
        immobile_indirizzo: immobileIndirizzo,
        immobile_citta: immobileCitta,
        immobile_tipo: listings.find(l => l.id === selectedListingId)?.property_type ?? 'apartment',
        prezzo_richiesto: prezzoRichiesto,
        proponente_nome: proponenteNome,
        proponente_codice_fiscale: proponenteCF || null,
        proponente_telefono: proponenteTel || null,
        proponente_email: proponenteEmail || null,
        proprietario_nome: proprietarioNome || null,
        agente_nome: agentName,
        agente_agenzia: workspaceName,
        prezzo_offerto: prezzoOfferto,
        caparra_confirmatoria: caparra,
        caparra_in_gestione_agenzia: caparraInAgenzia,
        data_proposta: dataProposta,
        validita_proposta: validita,
        data_rogito_proposta: dataRogito || null,
        notaio_preferito: notaio || null,
        note: note || null,
        vincoli,
        status: asInviata ? 'inviata' : 'bozza',
        anno: nextNumber.anno,
        progressivo: nextNumber.progressivo,
        numero_proposta: nextNumber.numero_proposta,
      }

      const url = mode === 'edit' ? `/api/proposals/${proposalId}` : '/api/proposals'
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Errore nel salvataggio')
      }

      toast.success(asInviata ? 'Proposta salvata come inviata' : 'Bozza salvata')
      router.push('/proposte')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
      <div className="space-y-5">

        {/* Immobile */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Immobile</h2>
          <div className="space-y-1.5">
            <Label>Seleziona immobile *</Label>
            <div className="relative">
              <select
                value={selectedListingId}
                onChange={e => handleListingChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">— Seleziona immobile —</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id}>{l.address}, {l.city}{l.price ? ` — ${formatEuro(l.price)}` : ''}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          {selectedListingId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Indirizzo immobile</Label>
                <Input value={immobileIndirizzo} onChange={e => setImmobileIndirizzo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prezzo richiesto (€)</Label>
                <Input type="number" value={prezzoRichiesto} onChange={e => setPrezzoRichiesto(Number(e.target.value))} />
              </div>
            </div>
          )}
        </section>

        {/* Acquirente */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Proponente (Acquirente)</h2>
          <div className="space-y-1.5">
            <Label>Seleziona cliente *</Label>
            <div className="relative">
              <select
                value={selectedContactId}
                onChange={e => handleContactChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">— Seleziona acquirente —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome e cognome *</Label>
              <Input value={proponenteNome} onChange={e => setProponenteNome(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Codice fiscale</Label>
              <Input value={proponenteCF} onChange={e => setProponenteCF(e.target.value.toUpperCase())} placeholder="RSSMRA80A01H501Z" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefono</Label>
              <Input value={proponenteTel} onChange={e => setProponenteTel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={proponenteEmail} onChange={e => setProponenteEmail(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Venditore */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Venditore <span className="text-muted-foreground font-normal">(opzionale)</span></h2>
          <div className="space-y-1.5">
            <Label>Seleziona venditore dal database</Label>
            <div className="relative">
              <select
                value={selectedSellerContactId}
                onChange={e => handleSellerContactChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">— Seleziona venditore (opzionale) —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome venditore / proprietario</Label>
              <Input value={proprietarioNome} onChange={e => setProprietarioNome(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Offerta economica */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Offerta economica</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prezzo offerto (€) *</Label>
              <Input type="number" min="0" value={prezzoOfferto} onChange={e => setPrezzoOfferto(Number(e.target.value))} />
              {prezzoRichiesto > 0 && prezzoOfferto > 0 && (
                <p className="text-xs text-muted-foreground">
                  {prezzoOfferto < prezzoRichiesto
                    ? `${((1 - prezzoOfferto / prezzoRichiesto) * 100).toFixed(1)}% sotto al prezzo richiesto`
                    : prezzoOfferto === prezzoRichiesto ? 'Pari al prezzo richiesto'
                    : `${((prezzoOfferto / prezzoRichiesto - 1) * 100).toFixed(1)}% sopra al prezzo richiesto`
                  }
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Caparra confirmatoria (€)</Label>
              <Input type="number" min="0" value={caparra} onChange={e => setCaparra(Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={caparraInAgenzia}
              onChange={e => setCaparraInAgenzia(e.target.checked)}
              className="h-4 w-4 rounded accent-[oklch(0.57_0.20_33)]"
            />
            <span className="text-sm">Caparra in gestione all&apos;agenzia fino al rogito</span>
          </label>
        </section>

        {/* Date */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Date e termini</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Data proposta</Label>
              <Input type="date" value={dataProposta} onChange={e => setDataProposta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Validità proposta *</Label>
              <Input type="date" value={validita} onChange={e => setValidita(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data rogito proposta</Label>
              <Input type="date" value={dataRogito} onChange={e => setDataRogito(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Vincoli */}
        <VincoliSection
          vincoli={vincoli}
          onAdd={addVincolo}
          onRemove={removeVincolo}
          onUpdate={updateVincolo}
        />

        {/* Other */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Altre informazioni</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Notaio preferito</Label>
              <Input value={notaio} onChange={e => setNotaio(e.target.value)} placeholder="Notaio Mario Rossi" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note aggiuntive</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="resize-none" />
          </div>
        </section>
      </div>

      {/* Sidebar: summary + actions */}
      <div>
        <div className="sticky top-4 space-y-4">
          <ProposalSummary
            nextNumber={nextNumber.numero_proposta}
            immobileIndirizzo={immobileIndirizzo}
            immobileCitta={immobileCitta}
            proponenteNome={proponenteNome}
            prezzoRichiesto={prezzoRichiesto}
            prezzoOfferto={prezzoOfferto}
            caparra={caparra}
            validita={validita}
            vincoliCount={vincoli.length}
          />

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full btn-ai" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Salvataggio…' : 'Salva bozza'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleSave(true)} disabled={saving}>
              Salva e invia al venditore
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => router.back()} disabled={saving}>
              Annulla
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
