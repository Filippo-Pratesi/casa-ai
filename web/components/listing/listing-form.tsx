'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PhotoUploader } from '@/components/listing/photo-uploader'

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Appartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'villa', label: 'Villa' },
  { value: 'commercial', label: 'Commerciale' },
  { value: 'land', label: 'Terreno' },
  { value: 'garage', label: 'Garage' },
  { value: 'other', label: 'Altro' },
]

const FEATURES = [
  { id: 'terrace', label: 'Terrazzo' },
  { id: 'garage', label: 'Garage' },
  { id: 'elevator', label: 'Ascensore' },
  { id: 'parking', label: 'Posto auto' },
  { id: 'renovated_kitchen', label: 'Cucina ristrutturata' },
  { id: 'sea_view', label: 'Vista mare' },
  { id: 'garden', label: 'Giardino' },
  { id: 'storage', label: 'Ripostiglio' },
  { id: 'cellar', label: 'Cantina' },
  { id: 'panoramic_view', label: 'Vista panoramica' },
]

const TONES = [
  { id: 'standard', label: 'Standard', desc: 'Professionale, per tutti' },
  { id: 'luxury', label: 'Luxury', desc: 'Esclusivo, aspirazionale' },
  { id: 'approachable', label: 'Accessibile', desc: 'Caldo, amichevole' },
  { id: 'investment', label: 'Investimento', desc: 'Orientato al rendimento' },
]

const CONDITIONS = [
  { value: 'ottimo', label: 'Ottimo' },
  { value: 'buono', label: 'Buono' },
  { value: 'sufficiente', label: 'Sufficiente' },
  { value: 'da_ristrutturare', label: 'Da ristrutturare' },
]

// Catastral coefficients by categoria
const CATASTRAL_COEFFICIENTS: Record<string, number> = {
  'A/1': 140, 'A/8': 140, 'A/9': 140,
  'C/1': 42,
  'D/1': 60, 'D/2': 60, 'D/3': 60, 'D/4': 60, 'D/5': 60, 'D/6': 60, 'D/7': 60, 'D/8': 60, 'D/9': 60, 'D/10': 60,
  'E/1': 40, 'E/2': 40, 'E/3': 40, 'E/4': 40, 'E/5': 40, 'E/6': 40, 'E/7': 40, 'E/8': 40, 'E/9': 40,
}
function getCatastralCoeff(cat: string): number {
  const key = cat.toUpperCase().trim()
  if (CATASTRAL_COEFFICIENTS[key]) return CATASTRAL_COEFFICIENTS[key]
  if (key.startsWith('A')) return 160
  if (key.startsWith('B')) return 140
  if (key.startsWith('C')) return 140
  return 120
}
function calcValoreCatastale(rendita: string, categoria: string): string | null {
  const r = parseFloat(rendita)
  if (!rendita || isNaN(r) || r <= 0) return null
  const coeff = categoria ? getCatastralCoeff(categoria) : 120
  return Math.round(r * 1.05 * coeff).toLocaleString('it-IT')
}

interface FormState {
  property_type: string
  transaction_type: string
  floor: string
  total_floors: string
  address: string
  city: string
  neighborhood: string
  price: string
  sqm: string
  rooms: string
  bathrooms: string
  condition: string
  features: string[]
  notes: string
  tone: string
  foglio: string
  particella: string
  subalterno: string
  categoria_catastale: string
  rendita_catastale: string
}

const INITIAL_FORM: FormState = {
  property_type: 'apartment',
  transaction_type: 'vendita',
  floor: '',
  total_floors: '',
  address: '',
  city: '',
  neighborhood: '',
  price: '',
  sqm: '',
  rooms: '',
  bathrooms: '1',
  condition: '',
  features: [],
  notes: '',
  tone: 'standard',
  foglio: '',
  particella: '',
  subalterno: '',
  categoria_catastale: '',
  rendita_catastale: '',
}

export function ListingForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [photos, setPhotos] = useState<File[]>([])
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleFeature(id: string) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(id)
        ? prev.features.filter((f) => f !== id)
        : [...prev.features, id],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const fd = new FormData()
    fd.append('property_type', form.property_type)
    fd.append('transaction_type', form.transaction_type)
    if (form.property_type === 'apartment') {
      if (form.floor) fd.append('floor', form.floor)
      if (form.total_floors) fd.append('total_floors', form.total_floors)
    }
    fd.append('address', form.address)
    fd.append('city', form.city)
    if (form.neighborhood) fd.append('neighborhood', form.neighborhood)
    fd.append('price', form.price)
    fd.append('sqm', form.sqm)
    fd.append('rooms', form.rooms)
    fd.append('bathrooms', form.bathrooms || '1')
    fd.append('features', JSON.stringify(form.features))
    if (form.condition) fd.append('condition', form.condition)
    if (form.notes) fd.append('notes', form.notes)
    fd.append('tone', form.tone)
    if (form.foglio) fd.append('foglio', form.foglio)
    if (form.particella) fd.append('particella', form.particella)
    if (form.subalterno) fd.append('subalterno', form.subalterno)
    if (form.categoria_catastale) fd.append('categoria_catastale', form.categoria_catastale)
    if (form.rendita_catastale) fd.append('rendita_catastale', form.rendita_catastale)
    photos.forEach((p) => fd.append('photos', p))

    startTransition(async () => {
      try {
        const res = await fetch('/api/listing/generate', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Errore nella generazione')
        router.push(`/listing/${data.listing_id}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
      }
    })
  }

  const isApartment = form.property_type === 'apartment'

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-0 divide-y divide-border">

      {/* Section 1 — Tipo immobile */}
      <section className="pt-0 pb-6 space-y-3">
        <h2 className="text-base font-semibold">Tipo di immobile</h2>

        {/* Transaction type */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Tipologia annuncio</p>
          <div className="flex gap-2">
            {[{ value: 'vendita', label: 'Vendita' }, { value: 'affitto', label: 'Affitto' }].map((tt) => (
              <button
                key={tt.value}
                type="button"
                onClick={() => update('transaction_type', tt.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  form.transaction_type === tt.value
                    ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                    : 'border-border bg-card text-foreground hover:border-muted-foreground/50 hover:bg-muted'
                }`}
              >
                {tt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => update('property_type', pt.value)}
              className={`
                rounded-full border px-4 py-1.5 text-sm font-medium transition-all
                ${form.property_type === pt.value
                  ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                  : 'border-border bg-card text-foreground hover:border-muted-foreground/50 hover:bg-muted'}
              `}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {isApartment && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="floor">Piano</Label>
              <Input
                id="floor"
                type="number"
                min="0"
                placeholder="es. 3"
                value={form.floor}
                onChange={(e) => update('floor', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="total_floors">Piani totali edificio</Label>
              <Input
                id="total_floors"
                type="number"
                min="1"
                placeholder="es. 6"
                value={form.total_floors}
                onChange={(e) => update('total_floors', e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 2 — Localizzazione */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Localizzazione</h2>
        <div className="space-y-1.5">
          <Label htmlFor="address">Indirizzo *</Label>
          <Input
            id="address"
            placeholder="Via Roma 12"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city">Città *</Label>
            <Input
              id="city"
              placeholder="Milano"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="neighborhood">Quartiere / Zona</Label>
            <Input
              id="neighborhood"
              placeholder="Navigli"
              value={form.neighborhood}
              onChange={(e) => update('neighborhood', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Section 3 — Dettagli */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Dettagli immobile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Prezzo (€) *</Label>
            <Input
              id="price"
              type="number"
              min="0"
              placeholder="250000"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sqm">Superficie (m²) *</Label>
            <Input
              id="sqm"
              type="number"
              min="1"
              placeholder="85"
              value={form.sqm}
              onChange={(e) => update('sqm', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rooms">Locali *</Label>
            <Input
              id="rooms"
              type="number"
              min="1"
              placeholder="3"
              value={form.rooms}
              onChange={(e) => update('rooms', e.target.value)}
              required
            />
          </div>
          {form.property_type !== 'land' && (
            <div className="space-y-1.5">
              <Label htmlFor="bathrooms">Bagni</Label>
              <Select value={form.bathrooms} onValueChange={(v) => { if (v) update('bathrooms', v) }}>
                <SelectTrigger id="bathrooms" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4+'].map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Stato dell&apos;immobile</Label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => update('condition', form.condition === c.value ? '' : c.value)}
                className={`
                  rounded-full border px-4 py-1.5 text-sm font-medium transition-all
                  ${form.condition === c.value
                    ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                    : 'border-border bg-card text-foreground hover:border-muted-foreground/50 hover:bg-muted'}
                `}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3b — Dati catastali */}
      <section className="py-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Dati catastali</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Opzionale — compilare se disponibili</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="foglio">Foglio</Label>
            <Input id="foglio" placeholder="es. 12" value={form.foglio} onChange={(e) => update('foglio', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="particella">Particella</Label>
            <Input id="particella" placeholder="es. 345" value={form.particella} onChange={(e) => update('particella', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subalterno">Subalterno</Label>
            <Input id="subalterno" placeholder="es. 7" value={form.subalterno} onChange={(e) => update('subalterno', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="categoria_catastale">Categoria catastale</Label>
            <Input id="categoria_catastale" placeholder="es. A/3" value={form.categoria_catastale} onChange={(e) => update('categoria_catastale', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rendita_catastale">Rendita catastale (€)</Label>
            <Input id="rendita_catastale" type="number" min="0" step="0.01" placeholder="es. 850.00" value={form.rendita_catastale} onChange={(e) => update('rendita_catastale', e.target.value)} />
          </div>
        </div>
        {calcValoreCatastale(form.rendita_catastale, form.categoria_catastale) && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-3">
            <div>
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Valore catastale calcolato</p>
              <p className="text-xl font-bold text-blue-900 mt-0.5">
                € {calcValoreCatastale(form.rendita_catastale, form.categoria_catastale)}
              </p>
              <p className="text-[10px] text-blue-400 mt-0.5">
                Rendita × 1,05 × {getCatastralCoeff(form.categoria_catastale || '')} (coeff. {form.categoria_catastale || 'default'})
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Section 4 — Caratteristiche */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Caratteristiche</h2>
        <div className="flex flex-wrap gap-2">
          {FEATURES.filter((f) => !(form.property_type === 'land' && f.id === 'elevator')).map((f) => {
            const active = form.features.includes(f.id)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFeature(f.id)}
                className={`
                  rounded-full border px-3 py-1.5 text-sm transition-all
                  ${active
                    ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/50'}
                `}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Section 5 — Tono */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Tono di comunicazione</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => update('tone', t.id)}
              className={`
                rounded-lg border p-3 text-left transition-all
                ${form.tone === t.id
                  ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                  : 'border-border bg-card text-foreground hover:border-muted-foreground/50'}
              `}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className={`text-xs mt-0.5 ${form.tone === t.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                {t.desc}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Section 6 — Note */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Note agente</h2>
        <div className="space-y-1.5">
          <Label htmlFor="notes">
            Informazioni aggiuntive <span className="text-muted-foreground">(opzionale, max 300 caratteri)</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Es. cucina appena ristrutturata, proprietario disponibile a trattare, zona molto tranquilla..."
            maxLength={300}
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">{form.notes.length}/300</p>
        </div>
      </section>

      {/* Section 7 — Foto */}
      <section className="py-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Foto dell&apos;immobile</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Le foto vengono analizzate dall&apos;AI per arricchire le descrizioni. Opzionale ma consigliato.
          </p>
        </div>
        <PhotoUploader photos={photos} onChange={setPhotos} />
      </section>

      {/* Submit */}
      <div className="pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="btn-ai w-full gap-2 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Generazione in corso...' : 'Genera contenuti'}
        </button>
        {isPending && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            L&apos;AI sta analizzando le foto e generando i contenuti. Ci vorranno circa 15-20 secondi.
          </p>
        )}
      </div>
    </form>
  )
}
