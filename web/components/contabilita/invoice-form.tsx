'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  computeTotals,
  formatCurrency,
  parseCurrencyToCents,
  type LineItem,
  type TotalsInput,
} from './invoice-totals-calculator'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  city_of_residence: string | null
}

interface Listing {
  id: string
  address: string
  city: string
}

interface InvoiceFormProps {
  contacts: Contact[]
  listings: Listing[]
  nextNumber?: { anno: number; progressivo: number; numero_fattura: string }
  workspaceName?: string
  mode: 'create' | 'edit'
  initialData?: Record<string, unknown>
  invoiceId?: string
}

type Regime = 'ordinario' | 'forfettario' | 'esente'

const today = new Date().toISOString().split('T')[0]
const currentYear = new Date().getFullYear()

export function InvoiceForm({ contacts, listings, nextNumber, workspaceName, mode, initialData, invoiceId }: InvoiceFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Header
  const [numeroFattura, setNumeroFattura] = useState(
    (initialData?.numero_fattura as string) ?? (nextNumber?.numero_fattura ?? `${currentYear}/001`)
  )
  const [dataEmissione, setDataEmissione] = useState((initialData?.data_emissione as string) ?? today)
  const [dataScadenza, setDataScadenza] = useState((initialData?.data_scadenza as string) ?? '')

  // Client
  const [selectedContactId, setSelectedContactId] = useState((initialData?.contact_id as string) ?? '')
  const [clienteNome, setClienteNome] = useState((initialData?.cliente_nome as string) ?? '')
  const [clienteIndirizzo, setClienteIndirizzo] = useState((initialData?.cliente_indirizzo as string) ?? '')
  const [clienteCitta, setClienteCitta] = useState((initialData?.cliente_citta as string) ?? '')
  const [clienteCap, setClienteCap] = useState((initialData?.cliente_cap as string) ?? '')
  const [clienteProvincia, setClienteProvincia] = useState((initialData?.cliente_provincia as string) ?? '')
  const [clienteCF, setClienteCF] = useState((initialData?.cliente_codice_fiscale as string) ?? '')
  const [clientePec, setClientePec] = useState((initialData?.cliente_pec as string) ?? '')
  const [clienteSdi, setClienteSdi] = useState((initialData?.cliente_codice_sdi as string) ?? '0000000')

  // Listing
  const [selectedListingId, setSelectedListingId] = useState((initialData?.listing_id as string) ?? '')

  // Line items
  const [voci, setVoci] = useState<LineItem[]>(
    (initialData?.voci as LineItem[]) ?? [
      { descrizione: 'Provvigione per intermediazione immobiliare', quantita: 1, prezzo_unitario: 0, importo: 0 },
    ]
  )

  // Tax
  const [regime, setRegime] = useState<Regime>((initialData?.regime as Regime) ?? 'ordinario')
  const [aliquotaIva, setAliquotaIva] = useState((initialData?.aliquota_iva as number) ?? 22)
  const [ritenutaAcconto, setRitenutaAcconto] = useState((initialData?.ritenuta_acconto as boolean) ?? false)
  const [aliquotaRitenuta, setAliquotaRitenuta] = useState((initialData?.aliquota_ritenuta as number) ?? 20)
  const [contributoCassa, setContributoCassa] = useState((initialData?.contributo_cassa as boolean) ?? false)
  const [aliquotaCassa, setAliquotaCassa] = useState((initialData?.aliquota_cassa as number) ?? 4)

  // Payment
  const [metodoPagamento, setMetodoPagamento] = useState((initialData?.metodo_pagamento as string) ?? 'bonifico')
  const [iban, setIban] = useState((initialData?.iban as string) ?? '')
  const [note, setNote] = useState((initialData?.note as string) ?? '')

  // UI state
  const [showSendConfirm, setShowSendConfirm] = useState(false)

  // Auto-fill from contact
  const handleContactChange = useCallback((contactId: string) => {
    setSelectedContactId(contactId)
    if (!contactId) return
    const c = contacts.find(x => x.id === contactId)
    if (c) {
      setClienteNome(c.name)
      if (c.email) setClientePec(c.email)
      if (c.city_of_residence) setClienteCitta(c.city_of_residence)
    }
  }, [contacts])

  // Totals
  const totalsInput: TotalsInput = {
    voci,
    regime,
    aliquota_iva: aliquotaIva,
    ritenuta_acconto: ritenutaAcconto,
    aliquota_ritenuta: aliquotaRitenuta,
    contributo_cassa: contributoCassa,
    aliquota_cassa: aliquotaCassa,
  }
  const totals = computeTotals(totalsInput)

  // Line item handlers
  function updateVoce(idx: number, field: keyof LineItem, rawValue: string) {
    setVoci(prev => {
      const updated = prev.map((v, i) => {
        if (i !== idx) return v
        const next = { ...v }
        if (field === 'descrizione') {
          next.descrizione = rawValue
        } else if (field === 'quantita') {
          next.quantita = parseFloat(rawValue) || 0
          next.importo = Math.round(next.quantita * next.prezzo_unitario)
        } else if (field === 'prezzo_unitario') {
          next.prezzo_unitario = parseCurrencyToCents(rawValue)
          next.importo = Math.round(next.quantita * next.prezzo_unitario)
        }
        return next
      })
      return updated
    })
  }

  function addVoce() {
    setVoci(prev => [...prev, { descrizione: '', quantita: 1, prezzo_unitario: 0, importo: 0 }])
  }

  function removeVoce(idx: number) {
    setVoci(prev => prev.filter((_, i) => i !== idx))
  }

  // When regime changes, auto-adjust IVA
  useEffect(() => {
    if (regime === 'forfettario' || regime === 'esente') {
      setAliquotaIva(0)
      setRitenutaAcconto(false)
    } else {
      setAliquotaIva(22)
    }
  }, [regime])

  async function handleSave(sendNow = false) {
    if (!clienteNome.trim()) {
      toast.error('Inserisci il nome del cliente')
      return
    }
    if (voci.length === 0 || totals.imponibile === 0) {
      toast.error('Aggiungi almeno una voce con importo')
      return
    }

    setSaving(true)
    try {
      const payload = {
        numero_fattura: numeroFattura,
        anno: nextNumber?.anno ?? currentYear,
        progressivo: nextNumber?.progressivo ?? 1,
        contact_id: selectedContactId || null,
        listing_id: selectedListingId || null,
        cliente_nome: clienteNome,
        cliente_indirizzo: clienteIndirizzo || null,
        cliente_citta: clienteCitta || null,
        cliente_cap: clienteCap || null,
        cliente_provincia: clienteProvincia || null,
        cliente_codice_fiscale: clienteCF || null,
        cliente_pec: clientePec || null,
        cliente_codice_sdi: clienteSdi || '0000000',
        emittente_nome: workspaceName ?? 'CasaAI',
        regime,
        descrizione: voci[0]?.descrizione ?? 'Provvigione',
        voci,
        imponibile: totals.imponibile,
        aliquota_iva: aliquotaIva,
        importo_iva: totals.importo_iva,
        ritenuta_acconto: ritenutaAcconto,
        aliquota_ritenuta: aliquotaRitenuta,
        importo_ritenuta: totals.importo_ritenuta,
        contributo_cassa: contributoCassa,
        aliquota_cassa: aliquotaCassa,
        importo_cassa: totals.importo_cassa,
        totale_documento: totals.totale_documento,
        netto_a_pagare: totals.netto_a_pagare,
        metodo_pagamento: metodoPagamento,
        iban: iban || null,
        data_emissione: dataEmissione,
        data_scadenza: dataScadenza || null,
        note: note || null,
        status: sendNow ? 'inviata' : 'bozza',
      }

      const url = mode === 'edit' ? `/api/invoices/${invoiceId}` : '/api/invoices'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Errore nel salvataggio')
      }

      toast.success(mode === 'edit' ? 'Fattura aggiornata' : (sendNow ? 'Fattura salvata come inviata' : 'Bozza salvata'))
      router.push('/contabilita')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
      {/* Left: form */}
      <div className="space-y-5">

        {/* Header */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Intestazione</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="numeroFattura">N. Fattura</Label>
              <Input id="numeroFattura" value={numeroFattura} onChange={e => setNumeroFattura(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataEmissione">Data emissione</Label>
              <Input id="dataEmissione" type="date" value={dataEmissione} onChange={e => setDataEmissione(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataScadenza">Scadenza pagamento</Label>
              <Input id="dataScadenza" type="date" value={dataScadenza} onChange={e => setDataScadenza(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Client */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Dati cliente</h2>
          <div className="space-y-1.5">
            <Label>Seleziona da CRM</Label>
            <div className="relative">
              <select
                value={selectedContactId}
                onChange={e => handleContactChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">— Seleziona cliente —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clienteNome">Ragione sociale / Nome *</Label>
              <Input id="clienteNome" value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Mario Rossi" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clienteCF">C.F. / P.IVA</Label>
              <Input id="clienteCF" value={clienteCF} onChange={e => setClienteCF(e.target.value)} placeholder="RSSMRA80A01H501Z" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clienteIndirizzo">Indirizzo</Label>
              <Input id="clienteIndirizzo" value={clienteIndirizzo} onChange={e => setClienteIndirizzo(e.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_80px_60px] gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="clienteCitta">Città</Label>
                <Input id="clienteCitta" value={clienteCitta} onChange={e => setClienteCitta(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clienteCap">CAP</Label>
                <Input id="clienteCap" value={clienteCap} onChange={e => setClienteCap(e.target.value)} maxLength={5} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clienteProvincia">Prov.</Label>
                <Input id="clienteProvincia" value={clienteProvincia} onChange={e => setClienteProvincia(e.target.value.toUpperCase())} maxLength={2} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientePec">PEC / Email</Label>
              <Input id="clientePec" type="email" value={clientePec} onChange={e => setClientePec(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clienteSdi">Codice SDI</Label>
              <Input id="clienteSdi" value={clienteSdi} onChange={e => setClienteSdi(e.target.value)} maxLength={7} className="font-mono" />
            </div>
          </div>
        </section>

        {/* Linked listing */}
        {listings.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Immobile collegato <span className="text-muted-foreground font-normal">(opzionale)</span></h2>
            <div className="relative">
              <select
                value={selectedListingId}
                onChange={e => setSelectedListingId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">— Nessun immobile —</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id}>{l.address}, {l.city}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </section>
        )}

        {/* Line items */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Voci fattura</h2>
          <div className="space-y-3">
            {voci.map((voce, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_70px_110px_80px_36px] gap-2 items-end">
                <div className="space-y-1.5">
                  {idx === 0 && <Label>Descrizione</Label>}
                  <Input
                    value={voce.descrizione}
                    onChange={e => updateVoce(idx, 'descrizione', e.target.value)}
                    placeholder="Descrizione servizio"
                  />
                </div>
                <div className="space-y-1.5">
                  {idx === 0 && <Label>Qt.</Label>}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={voce.quantita}
                    onChange={e => updateVoce(idx, 'quantita', e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  {idx === 0 && <Label>Prezzo unitario (€)</Label>}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={voce.prezzo_unitario / 100}
                    onChange={e => updateVoce(idx, 'prezzo_unitario', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  {idx === 0 && <Label className="text-muted-foreground">Totale</Label>}
                  <div className="h-9 flex items-center px-3 text-sm font-medium text-foreground bg-muted/50 rounded-lg border border-border">
                    {formatCurrency(voce.importo)}
                  </div>
                </div>
                <div className={cn('flex items-end pb-0.5', idx === 0 && 'mt-6')}>
                  <button
                    type="button"
                    onClick={() => removeVoce(idx)}
                    disabled={voci.length === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addVoce} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Aggiungi voce
          </Button>
        </section>

        {/* Tax regime */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Regime fiscale e imposte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Regime fiscale</Label>
              <div className="relative">
                <select
                  value={regime}
                  onChange={e => setRegime(e.target.value as Regime)}
                  className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="ordinario">Regime ordinario (IVA 22%)</option>
                  <option value="forfettario">Regime forfettario (no IVA)</option>
                  <option value="esente">Esente IVA (art. 10 DPR 633/72)</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {regime === 'ordinario' && (
              <div className="space-y-1.5">
                <Label>Aliquota IVA</Label>
                <div className="relative">
                  <select
                    value={aliquotaIva}
                    onChange={e => setAliquotaIva(Number(e.target.value))}
                    className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    <option value={22}>22%</option>
                    <option value={10}>10%</option>
                    <option value={4}>4%</option>
                    <option value={0}>0%</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ritenuta d'acconto */}
            <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">Ritenuta d&apos;acconto</p>
                <p className="text-xs text-muted-foreground">20% sull&apos;imponibile</p>
              </div>
              <input
                type="checkbox"
                checked={ritenutaAcconto && regime !== 'forfettario'}
                onChange={e => setRitenutaAcconto(e.target.checked)}
                disabled={regime === 'forfettario'}
                className="h-4 w-4 rounded accent-[oklch(0.57_0.20_33)]"
              />
            </label>

            {/* Contributo cassa */}
            <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">Contributo cassa</p>
                <p className="text-xs text-muted-foreground">Enasarco / INPS (4%)</p>
              </div>
              <input
                type="checkbox"
                checked={contributoCassa}
                onChange={e => setContributoCassa(e.target.checked)}
                className="h-4 w-4 rounded accent-[oklch(0.57_0.20_33)]"
              />
            </label>
          </div>
        </section>

        {/* Payment */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Dati di pagamento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Metodo di pagamento</Label>
              <div className="relative">
                <select
                  value={metodoPagamento}
                  onChange={e => setMetodoPagamento(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="bonifico">Bonifico bancario</option>
                  <option value="contanti">Contanti</option>
                  <option value="assegno">Assegno</option>
                  <option value="carta">Carta di credito</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            {metodoPagamento === 'bonifico' && (
              <div className="space-y-1.5">
                <Label htmlFor="iban">IBAN</Label>
                <Input id="iban" value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="IT60 X054 2811 1010 0000 0123 456" className="font-mono text-sm" />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Note libere, condizioni di pagamento, ecc." className="resize-none" />
          </div>
        </section>
      </div>

      {/* Right: live totals + actions */}
      <div className="space-y-4">
        <div className="sticky top-4 space-y-4">
          {/* Totals card */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Riepilogo importi</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Imponibile</span>
                <span className="font-medium">{formatCurrency(totals.imponibile)}</span>
              </div>
              {contributoCassa && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contributo cassa ({aliquotaCassa}%)</span>
                  <span className="font-medium">{formatCurrency(totals.importo_cassa)}</span>
                </div>
              )}
              {regime === 'ordinario' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA ({aliquotaIva}%)</span>
                  <span className="font-medium">{formatCurrency(totals.importo_iva)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-semibold text-base">
                <span>Totale documento</span>
                <span className="text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]">{formatCurrency(totals.totale_documento)}</span>
              </div>
              {ritenutaAcconto && regime !== 'forfettario' && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ritenuta d&apos;acconto ({aliquotaRitenuta}%)</span>
                    <span>- {formatCurrency(totals.importo_ritenuta)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Netto a pagare</span>
                    <span>{formatCurrency(totals.netto_a_pagare)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full btn-ai"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Salvataggio…' : 'Salva bozza'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowSendConfirm(true)}
              disabled={saving}
            >
              Salva e segna come inviata
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => router.back()}
              disabled={saving}
            >
              Annulla
            </Button>
          </div>

          {/* Info */}
          {regime === 'forfettario' && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Regime forfettario</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Operazione in franchigia IVA ai sensi dell&apos;art. 1 c. 54-89 L. 190/2014. Non soggetta a ritenuta d&apos;acconto.</p>
            </div>
          )}
          {regime === 'esente' && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Esente IVA</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Operazione esente da IVA ai sensi dell&apos;art. 10, n. 8-ter, DPR 633/72.</p>
            </div>
          )}
        </div>
      </div>
    </div>

    <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Segna fattura come inviata?</DialogTitle>
          <DialogDescription>
            La fattura verrà salvata con stato &quot;Inviata&quot;. Assicurati che i dati siano corretti prima di procedere.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSendConfirm(false)}>Annulla</Button>
          <Button onClick={() => { setShowSendConfirm(false); handleSave(true) }}>
            Conferma e salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
