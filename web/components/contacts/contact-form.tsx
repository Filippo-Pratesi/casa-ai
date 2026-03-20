'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ChevronDown, ChevronUp, Plus, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const CONTACT_TYPES = [
  { value: 'buyer', label: 'Acquirente' },
  { value: 'seller', label: 'Venditore' },
  { value: 'renter', label: 'Affittuario' },
  { value: 'landlord', label: 'Proprietario' },
  { value: 'other', label: 'Altro' },
]

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Appartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'villa', label: 'Villa' },
  { value: 'commercial', label: 'Commerciale' },
  { value: 'land', label: 'Terreno' },
  { value: 'garage', label: 'Garage' },
]

export interface ContactFormDefaultValues {
  /** Legacy full name — will be split into first_name/last_name */
  name?: string
  first_name?: string
  last_name?: string
  types?: string[]
  email?: string
  phone?: string
  city_of_residence?: string
  address_of_residence?: string
  codice_fiscale?: string
  partita_iva?: string
  professione?: string
  data_nascita?: string
  notes?: string
  budget_min?: string
  budget_max?: string
  preferred_cities?: string
  preferred_types?: string[]
  min_sqm?: string
  min_rooms?: string
}

export interface ContactFormProps {
  mode: 'create' | 'edit'
  contactId?: string
  defaultValues?: ContactFormDefaultValues
  /**
   * When provided: skip page navigation after save, call this instead.
   * Also hides the "Collega immobile" section (not needed when embedded).
   */
  onSuccess?: (contact: { id: string; name: string }) => void
}

interface FormState {
  first_name: string
  last_name: string
  types: string[]
  email: string
  phone: string
  city_of_residence: string
  address_of_residence: string
  codice_fiscale: string
  partita_iva: string
  professione: string
  data_nascita: string
  notes: string
  budget_min: string
  budget_max: string
  preferred_cities: string
  preferred_types: string[]
  min_sqm: string
  min_rooms: string
}

function splitName(name: string): { first_name: string; last_name: string } {
  const idx = name.indexOf(' ')
  if (idx === -1) return { first_name: name, last_name: '' }
  return { first_name: name.substring(0, idx), last_name: name.substring(idx + 1) }
}

const INITIAL: FormState = {
  first_name: '',
  last_name: '',
  types: ['buyer'],
  email: '',
  phone: '',
  city_of_residence: '',
  address_of_residence: '',
  codice_fiscale: '',
  partita_iva: '',
  professione: '',
  data_nascita: '',
  notes: '',
  budget_min: '',
  budget_max: '',
  preferred_cities: '',
  preferred_types: [],
  min_sqm: '',
  min_rooms: '',
}

function resolveInitial(defaults?: ContactFormDefaultValues): FormState {
  if (!defaults) return { ...INITIAL }
  const nameParts: { first_name?: string; last_name?: string } = defaults.name ? splitName(defaults.name) : {}
  return {
    ...INITIAL,
    first_name: defaults.first_name ?? nameParts.first_name ?? '',
    last_name: defaults.last_name ?? nameParts.last_name ?? '',
    types: defaults.types ?? ['buyer'],
    email: defaults.email ?? '',
    phone: defaults.phone ?? '',
    city_of_residence: defaults.city_of_residence ?? '',
    address_of_residence: defaults.address_of_residence ?? '',
    codice_fiscale: defaults.codice_fiscale ?? '',
    partita_iva: defaults.partita_iva ?? '',
    professione: defaults.professione ?? '',
    data_nascita: defaults.data_nascita ?? '',
    notes: defaults.notes ?? '',
    budget_min: defaults.budget_min ?? '',
    budget_max: defaults.budget_max ?? '',
    preferred_cities: defaults.preferred_cities ?? '',
    preferred_types: defaults.preferred_types ?? [],
    min_sqm: defaults.min_sqm ?? '',
    min_rooms: defaults.min_rooms ?? '',
  }
}

const isBuyerLike = (types: string[]) => types.includes('buyer') || types.includes('renter')

export function ContactForm({ mode, contactId, defaultValues, onSuccess }: ContactFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>(() => resolveInitial(defaultValues))
  const [showPrefs, setShowPrefs] = useState(
    !!(defaultValues?.budget_min || defaultValues?.budget_max ||
       defaultValues?.preferred_cities || defaultValues?.min_rooms || defaultValues?.min_sqm ||
       (defaultValues?.preferred_types && (defaultValues.preferred_types as string[]).length > 0))
  )
  const [showExtra, setShowExtra] = useState(
    !!(defaultValues?.codice_fiscale || defaultValues?.partita_iva ||
       defaultValues?.professione || defaultValues?.data_nascita)
  )

  // Property linking state (create mode standalone only)
  const [propertySearch, setPropertySearch] = useState('')
  const [propertyResults, setPropertyResults] = useState<{ id: string; address: string; city: string; stage: string }[]>([])
  const [selectedProperty, setSelectedProperty] = useState<{ id: string; address: string; city: string; stage: string } | null>(null)
  const [propertyRole, setPropertyRole] = useState('proprietario')
  const [searchingProperties, setSearchingProperties] = useState(false)

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleType(value: string) {
    setForm((prev) => {
      const current = prev.types
      if (current.includes(value)) {
        if (current.length === 1) return prev
        return { ...prev, types: current.filter((t) => t !== value) }
      }
      return { ...prev, types: [...current, value] }
    })
  }

  function togglePrefType(value: string) {
    setForm((prev) => ({
      ...prev,
      preferred_types: prev.preferred_types.includes(value)
        ? prev.preferred_types.filter((t) => t !== value)
        : [...prev.preferred_types, value],
    }))
  }

  function buildPayload() {
    const name = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ')
    return {
      name,
      types: form.types,
      type: form.types[0],
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      city_of_residence: form.city_of_residence.trim() || null,
      address_of_residence: form.address_of_residence.trim() || null,
      codice_fiscale: form.codice_fiscale.trim() || null,
      partita_iva: form.partita_iva.trim() || null,
      professione: form.professione.trim() || null,
      data_nascita: form.data_nascita || null,
      notes: form.notes.trim() || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      preferred_cities: form.preferred_cities.split(',').map((c) => c.trim()).filter(Boolean),
      preferred_types: form.preferred_types,
      min_sqm: form.min_sqm ? Number(form.min_sqm) : null,
      min_rooms: form.min_rooms ? Number(form.min_rooms) : null,
    }
  }

  async function searchProperties(q: string) {
    setPropertySearch(q)
    setSelectedProperty(null)
    if (q.length < 2) { setPropertyResults([]); return }
    setSearchingProperties(true)
    try {
      const res = await fetch(`/api/properties?q=${encodeURIComponent(q)}&per_page=8`)
      if (res.ok) {
        const data = await res.json()
        setPropertyResults((data.properties ?? []).slice(0, 8))
      }
    } finally {
      setSearchingProperties(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ')
    if (!name) { toast.error('Il nome è obbligatorio'); return }

    startTransition(async () => {
      try {
        const url = mode === 'create' ? '/api/contacts' : `/api/contacts/${contactId}`
        const method = mode === 'create' ? 'POST' : 'PATCH'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Errore nel salvataggio')

        // Link property if selected (only standalone create)
        if (mode === 'create' && !onSuccess && selectedProperty && data.id) {
          try {
            await fetch(`/api/properties/${selectedProperty.id}/contacts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contact_id: data.id, role: propertyRole }),
            })
            if (propertyRole === 'proprietario') {
              await fetch(`/api/properties/${selectedProperty.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner_contact_id: data.id }),
              })
              if (selectedProperty.stage === 'sconosciuto' || selectedProperty.stage === 'ignoto') {
                await fetch(`/api/properties/${selectedProperty.id}/advance`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ target_stage: 'conosciuto' }),
                })
              }
            } else if (selectedProperty.stage === 'sconosciuto') {
              await fetch(`/api/properties/${selectedProperty.id}/advance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_stage: 'ignoto' }),
              })
            }
          } catch { /* non-fatal */ }
        }

        toast.success(mode === 'create' ? 'Cliente aggiunto' : 'Cliente aggiornato')

        if (onSuccess) {
          onSuccess({ id: data.id, name })
        } else {
          router.push(mode === 'create' ? `/contacts/${data.id}` : `/contacts/${contactId}`)
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-0 divide-y divide-border">

      {/* Tipo cliente */}
      <section className="pt-0 pb-6 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Tipo cliente</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Puoi selezionare più tipologie contemporaneamente</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTACT_TYPES.map((ct) => {
            const active = form.types.includes(ct.value)
            return (
              <button
                key={ct.value}
                type="button"
                onClick={() => toggleType(ct.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all
                  ${active
                    ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                    : 'border-border bg-card text-foreground hover:border-muted-foreground/50 hover:bg-muted'
                  }`}
              >
                {ct.label}
              </button>
            )
          })}
        </div>
        {form.types.length > 1 && (
          <p className="text-xs text-[oklch(0.57_0.20_33)]">
            {form.types.map(t => CONTACT_TYPES.find(c => c.value === t)?.label).join(' + ')}
          </p>
        )}
      </section>

      {/* Dati anagrafici */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Dati anagrafici</h2>

        {/* Nome + Cognome */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">Nome *</Label>
            <Input
              id="first_name"
              placeholder="Mario"
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Cognome <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <Input
              id="last_name"
              placeholder="Rossi"
              value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefono <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+39 333 1234567"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="mario@email.it"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city_of_residence">Città di residenza <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <Input
              id="city_of_residence"
              placeholder="Viareggio"
              value={form.city_of_residence}
              onChange={(e) => update('city_of_residence', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address_of_residence">Indirizzo <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <Input
              id="address_of_residence"
              placeholder="Via Roma 10"
              value={form.address_of_residence}
              onChange={(e) => update('address_of_residence', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Note <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
          <Textarea
            id="notes"
            placeholder="Es. cliente referenziato da Bianchi, preferisce pianterreno..."
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>

        {/* Extra details toggle */}
        <button
          type="button"
          onClick={() => setShowExtra((v) => !v)}
          className="flex w-full items-center justify-between text-left pt-1"
        >
          <span className="text-sm font-medium text-muted-foreground">
            Altri dettagli <span className="text-xs font-normal">(cod. fiscale, professione…)</span>
          </span>
          {showExtra
            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          }
        </button>

        {showExtra && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="codice_fiscale">Codice fiscale</Label>
                <Input
                  id="codice_fiscale"
                  placeholder="RSSMRA80A01H501Z"
                  value={form.codice_fiscale}
                  onChange={(e) => update('codice_fiscale', e.target.value.toUpperCase())}
                  maxLength={16}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partita_iva">Partita IVA</Label>
                <Input
                  id="partita_iva"
                  placeholder="12345678901"
                  value={form.partita_iva}
                  onChange={(e) => update('partita_iva', e.target.value)}
                  maxLength={11}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="professione">Professione</Label>
                <Input
                  id="professione"
                  placeholder="Imprenditore, Medico…"
                  value={form.professione}
                  onChange={(e) => update('professione', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="data_nascita">Data di nascita</Label>
                <Input
                  id="data_nascita"
                  type="date"
                  value={form.data_nascita}
                  onChange={(e) => update('data_nascita', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Preferenze ricerca — solo per acquirenti/affittuari */}
      {isBuyerLike(form.types) && (
        <section className="py-6 space-y-4">
          <button
            type="button"
            onClick={() => setShowPrefs((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h2 className="text-base font-semibold">
                Preferenze ricerca
                <span className="ml-2 text-xs font-normal text-muted-foreground">(opzionale)</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Budget, zone e caratteristiche desiderate</p>
            </div>
            {showPrefs
              ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            }
          </button>

          {showPrefs && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="budget_min">Budget minimo (€)</Label>
                  <Input id="budget_min" type="number" min="0" placeholder="150.000" value={form.budget_min} onChange={(e) => update('budget_min', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="budget_max">Budget massimo (€)</Label>
                  <Input id="budget_max" type="number" min="0" placeholder="350.000" value={form.budget_max} onChange={(e) => update('budget_max', e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="preferred_cities">Zone / Città preferite</Label>
                <Input id="preferred_cities" placeholder="Milano, Monza, Lecco" value={form.preferred_cities} onChange={(e) => update('preferred_cities', e.target.value)} />
                <p className="text-xs text-muted-foreground">Separa più città con una virgola</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="min_rooms">Locali minimi</Label>
                  <Input id="min_rooms" type="number" min="1" placeholder="3" value={form.min_rooms} onChange={(e) => update('min_rooms', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min_sqm">Superficie minima (m²)</Label>
                  <Input id="min_sqm" type="number" min="1" placeholder="70" value={form.min_sqm} onChange={(e) => update('min_sqm', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo immobile preferito</Label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => togglePrefType(pt.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all
                        ${form.preferred_types.includes(pt.value)
                          ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/50'
                        }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Collega immobile — solo creazione standalone (non embedded) */}
      {mode === 'create' && !onSuccess && (
        <section className="py-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Collega immobile <span className="ml-2 text-xs font-normal text-muted-foreground">(opzionale)</span></h2>
            <p className="text-xs text-muted-foreground mt-0.5">Se il contatto è proprietario, l&apos;immobile avanzerà automaticamente di stage</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cerca immobile in banca dati</Label>
              <div className="relative">
                <Input placeholder="Inizia a digitare via, città..." value={propertySearch} onChange={(e) => searchProperties(e.target.value)} autoComplete="off" />
                {searchingProperties && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
              </div>

              {propertyResults.length > 0 && !selectedProperty && (
                <div className="rounded-lg border border-border shadow-sm max-h-48 overflow-auto">
                  {propertyResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedProperty(p); setPropertySearch(`${p.address}, ${p.city}`); setPropertyResults([]) }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 border-b border-border/50 last:border-0"
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.address}</p>
                        <p className="text-xs text-muted-foreground">{p.city}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 capitalize bg-muted px-2 py-0.5 rounded-full">{p.stage}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedProperty && (
                <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">{selectedProperty.address}, {selectedProperty.city}</p>
                  </div>
                  <button type="button" onClick={() => { setSelectedProperty(null); setPropertySearch('') }} className="text-xs text-muted-foreground hover:text-foreground ml-3">Rimuovi</button>
                </div>
              )}

              {!selectedProperty && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-xs text-muted-foreground">o</span>
                  <Link href="/banca-dati/nuovo" className="inline-flex items-center gap-1 text-xs text-[oklch(0.57_0.20_33)] hover:underline font-medium">
                    <Plus className="h-3 w-3" />
                    Crea nuovo immobile in banca dati
                  </Link>
                </div>
              )}
            </div>

            {selectedProperty && (
              <div className="space-y-1.5">
                <Label>Ruolo nel contatto</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'proprietario', label: 'Proprietario' },
                    { value: 'inquilino', label: 'Inquilino' },
                    { value: 'altro', label: 'Altro' },
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setPropertyRole(r.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        propertyRole === r.value
                          ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Submit */}
      <div className="pt-6">
        <button type="submit" disabled={isPending} className="btn-ai w-full gap-2 disabled:opacity-60">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Salvataggio...' : mode === 'create' ? 'Aggiungi cliente' : 'Salva modifiche'}
        </button>
      </div>
    </form>
  )
}
