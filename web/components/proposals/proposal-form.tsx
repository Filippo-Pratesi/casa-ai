'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city_of_residence: string | null
}

interface Listing {
  id: string
  address: string
  city: string
  property_type: string
  price: number | null
}

export type ConditionType = 'mutuo' | 'vendita_immobile' | 'perizia' | 'personalizzata'

export interface Vincolo {
  tipo: ConditionType
  descrizione?: string
  importo_mutuo?: number
  nome_banca?: string
  indirizzo_immobile_vendita?: string
}

interface ProposalFormProps {
  contacts: Contact[]
  listings: Listing[]
  nextNumber: { anno: number; progressivo: number; numero_proposta: string }
  workspaceName: string
  agentName: string
  mode: 'create' | 'edit'
  initialData?: Record<string, unknown>
  proposalId?: string
}

const today = new Date().toISOString().split('T')[0]
// Default validity: 7 days from today
const defaultValidity = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const conditionLabels: Record<ConditionType, string> = {
  mutuo: 'Soggetta alla concessione del mutuo',
  vendita_immobile: "Soggetta alla vendita dell'immobile del proponente",
  perizia: 'Soggetta a perizia bancaria positiva',
  personalizzata: 'Condizione personalizzata',
}

export function ProposalForm({
  contacts, listings, nextNumber, workspaceName, agentName, mode, initialData, proposalId
}: ProposalFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Listing & contact
  const [selectedListingId, setSelectedListingId] = useState((initialData?.listing_id as string) ?? '')
  const [selectedContactId, setSelectedContactId] = useState((initialData?.buyer_contact_id as string) ?? '')

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

  // Auto-fill from contact
  const handleContactChange = useCallback((contactId: string) => {
    setSelectedContactId(contactId)
    const c = contacts.find(x => x.id === contactId)
    if (c) {
      setProponenteNome(c.name)
      if (c.email) setProponenteEmail(c.email)
      if (c.phone) setProponenteTel(c.phone)
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
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Vincoli e condizioni</h2>
            <div className="relative">
              <select
                value=""
                onChange={e => { if (e.target.value) addVincolo(e.target.value as ConditionType) }}
                className="appearance-none rounded-lg border border-input bg-background px-3 py-1.5 text-xs pr-7 focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">+ Aggiungi vincolo</option>
                {(Object.keys(conditionLabels) as ConditionType[]).map(tipo => (
                  <option key={tipo} value={tipo}>{conditionLabels[tipo]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {vincoli.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nessun vincolo — proposta libera da condizioni</p>
          ) : (
            <div className="space-y-3">
              {vincoli.map((v, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{conditionLabels[v.tipo]}</span>
                    <button
                      type="button"
                      onClick={() => removeVincolo(idx)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {v.tipo === 'mutuo' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Importo massimo mutuo (€)</Label>
                        <Input
                          type="number" size={12}
                          value={v.importo_mutuo ?? ''}
                          onChange={e => updateVincolo(idx, { importo_mutuo: Number(e.target.value) })}
                          placeholder="200000"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome banca</Label>
                        <Input
                          value={v.nome_banca ?? ''}
                          onChange={e => updateVincolo(idx, { nome_banca: e.target.value })}
                          placeholder="Intesa Sanpaolo"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  {v.tipo === 'vendita_immobile' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Indirizzo immobile da vendere</Label>
                      <Input
                        value={v.indirizzo_immobile_vendita ?? ''}
                        onChange={e => updateVincolo(idx, { indirizzo_immobile_vendita: e.target.value })}
                        placeholder="Via Roma 1, Milano"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  {v.tipo === 'personalizzata' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Descrizione condizione</Label>
                      <Textarea
                        value={v.descrizione ?? ''}
                        onChange={e => updateVincolo(idx, { descrizione: e.target.value })}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

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
          {/* Summary */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Riepilogo proposta</h2>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p>N. {nextNumber.numero_proposta}</p>
              {immobileIndirizzo && <p className="font-medium text-foreground">{immobileIndirizzo}, {immobileCitta}</p>}
              {proponenteNome && <p>Acquirente: {proponenteNome}</p>}
            </div>
            {prezzoOfferto > 0 && (
              <div className="border-t border-border pt-3 space-y-1">
                {prezzoRichiesto > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Prezzo richiesto</span>
                    <span>{formatEuro(prezzoRichiesto)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold">
                  <span>Prezzo offerto</span>
                  <span className="text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]">{formatEuro(prezzoOfferto)}</span>
                </div>
                {caparra > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Caparra</span>
                    <span>{formatEuro(caparra)}</span>
                  </div>
                )}
              </div>
            )}
            {validita && (
              <p className="text-xs text-muted-foreground">
                Valida fino al {new Date(validita).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
            {vincoli.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5">
                  {vincoli.length} vincolo{vincoli.length > 1 ? 'i' : ''}
                </span>
              </div>
            )}
          </div>

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
