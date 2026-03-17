'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface ContactFormProps {
  mode: 'create' | 'edit'
  contactId?: string
  defaultValues?: Partial<FormState>
}

interface FormState {
  name: string
  type: string
  email: string
  phone: string
  city_of_residence: string
  address_of_residence: string
  notes: string
  budget_min: string
  budget_max: string
  preferred_cities: string
  preferred_types: string[]
  min_sqm: string
  min_rooms: string
}

const INITIAL: FormState = {
  name: '',
  type: 'buyer',
  email: '',
  phone: '',
  city_of_residence: '',
  address_of_residence: '',
  notes: '',
  budget_min: '',
  budget_max: '',
  preferred_cities: '',
  preferred_types: [],
  min_sqm: '',
  min_rooms: '',
}

const isBuyerLike = (type: string) => type === 'buyer' || type === 'renter'

export function ContactForm({ mode, contactId, defaultValues }: ContactFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>({ ...INITIAL, ...defaultValues })
  const [showPrefs, setShowPrefs] = useState(
    // Open by default if any preference is already set (edit mode)
    !!(defaultValues?.budget_min || defaultValues?.budget_max ||
       defaultValues?.preferred_cities || defaultValues?.min_rooms || defaultValues?.min_sqm ||
       (defaultValues?.preferred_types && (defaultValues.preferred_types as string[]).length > 0))
  )

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
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
    return {
      name: form.name.trim(),
      type: form.type,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      city_of_residence: form.city_of_residence.trim() || null,
      address_of_residence: form.address_of_residence.trim() || null,
      notes: form.notes.trim() || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      preferred_cities: form.preferred_cities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      preferred_types: form.preferred_types,
      min_sqm: form.min_sqm ? Number(form.min_sqm) : null,
      min_rooms: form.min_rooms ? Number(form.min_rooms) : null,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Il nome è obbligatorio')
      return
    }
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
        toast.success(mode === 'create' ? 'Cliente aggiunto' : 'Cliente aggiornato')
        router.push(mode === 'create' ? `/contacts/${data.id}` : `/contacts/${contactId}`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-0 divide-y divide-neutral-100">

      {/* Tipo cliente */}
      <section className="pt-0 pb-6 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Tipo cliente</h2>
        <div className="flex flex-wrap gap-2">
          {CONTACT_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => update('type', ct.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all
                ${form.type === ct.value
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'
                }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dati anagrafici */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-900">Dati anagrafici</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nome e cognome *</Label>
          <Input
            id="name"
            placeholder="Mario Rossi"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefono <span className="text-neutral-400 font-normal">(opzionale)</span></Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+39 333 1234567"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email <span className="text-neutral-400 font-normal">(opzionale)</span></Label>
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
            <Label htmlFor="city_of_residence">Città di residenza <span className="text-neutral-400 font-normal">(opzionale)</span></Label>
            <Input
              id="city_of_residence"
              placeholder="Viareggio"
              value={form.city_of_residence}
              onChange={(e) => update('city_of_residence', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address_of_residence">Indirizzo <span className="text-neutral-400 font-normal">(opzionale)</span></Label>
            <Input
              id="address_of_residence"
              placeholder="Via Roma 10"
              value={form.address_of_residence}
              onChange={(e) => update('address_of_residence', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Note <span className="text-neutral-400 font-normal">(opzionale)</span></Label>
          <Textarea
            id="notes"
            placeholder="Es. cliente referenziato da Bianchi, preferisce pianterreno..."
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>
      </section>

      {/* Preferenze ricerca — opzionale, collapsible, solo per acquirenti/affittuari */}
      {isBuyerLike(form.type) && (
        <section className="py-6 space-y-4">
          <button
            type="button"
            onClick={() => setShowPrefs((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Preferenze ricerca
                <span className="ml-2 text-xs font-normal text-neutral-400">(opzionale)</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Budget, zone e caratteristiche desiderate
              </p>
            </div>
            {showPrefs
              ? <ChevronUp className="h-4 w-4 text-neutral-400 shrink-0" />
              : <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
            }
          </button>

          {showPrefs && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="budget_min">Budget minimo (€)</Label>
                  <Input
                    id="budget_min"
                    type="number"
                    min="0"
                    placeholder="150.000"
                    value={form.budget_min}
                    onChange={(e) => update('budget_min', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="budget_max">Budget massimo (€)</Label>
                  <Input
                    id="budget_max"
                    type="number"
                    min="0"
                    placeholder="350.000"
                    value={form.budget_max}
                    onChange={(e) => update('budget_max', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="preferred_cities">Zone / Città preferite</Label>
                <Input
                  id="preferred_cities"
                  placeholder="Milano, Monza, Lecco"
                  value={form.preferred_cities}
                  onChange={(e) => update('preferred_cities', e.target.value)}
                />
                <p className="text-xs text-neutral-400">Separa più città con una virgola</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="min_rooms">Locali minimi</Label>
                  <Input
                    id="min_rooms"
                    type="number"
                    min="1"
                    placeholder="3"
                    value={form.min_rooms}
                    onChange={(e) => update('min_rooms', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min_sqm">Superficie minima (m²)</Label>
                  <Input
                    id="min_sqm"
                    type="number"
                    min="1"
                    placeholder="70"
                    value={form.min_sqm}
                    onChange={(e) => update('min_sqm', e.target.value)}
                  />
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
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
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

      {/* Submit */}
      <div className="pt-6">
        <Button type="submit" disabled={isPending} size="lg" className="w-full">
          {isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</>
            : mode === 'create' ? 'Aggiungi cliente' : 'Salva modifiche'
          }
        </Button>
      </div>
    </form>
  )
}
