'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, X, ImagePlus } from 'lucide-react'
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
import { PROPERTY_TYPES, FEATURES, TONES, CONDITIONS } from '@/components/listing/listing-constants'

export interface ListingEditInitial {
  property_type: string
  floor: number | null
  total_floors: number | null
  address: string
  city: string
  neighborhood: string | null
  price: number
  sqm: number
  rooms: number
  bathrooms: number
  features: string[]
  notes: string | null
  tone: string
  condition: string | null
  foglio: string | null
  particella: string | null
  subalterno: string | null
  categoria_catastale: string | null
  rendita_catastale: number | null
  photos_urls: string[]
}

interface Props {
  listingId: string
  initial: ListingEditInitial
}

export function ListingEditForm({ listingId, initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    property_type: initial.property_type,
    floor: initial.floor?.toString() ?? '',
    total_floors: initial.total_floors?.toString() ?? '',
    address: initial.address,
    city: initial.city,
    neighborhood: initial.neighborhood ?? '',
    price: initial.price.toString(),
    sqm: initial.sqm.toString(),
    rooms: initial.rooms.toString(),
    bathrooms: initial.bathrooms.toString(),
    features: initial.features,
    notes: initial.notes ?? '',
    tone: initial.tone,
    condition: initial.condition ?? '',
    foglio: initial.foglio ?? '',
    particella: initial.particella ?? '',
    subalterno: initial.subalterno ?? '',
    categoria_catastale: initial.categoria_catastale ?? '',
    rendita_catastale: initial.rendita_catastale?.toString() ?? '',
  })

  // Photo state
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initial.photos_urls)
  const [newPhotos, setNewPhotos] = useState<File[]>([])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleFeature(id: string) {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(id)
        ? prev.features.filter(f => f !== id)
        : [...prev.features, id],
    }))
  }

  function removeExistingPhoto(url: string) {
    setExistingPhotos(prev => prev.filter(u => u !== url))
  }

  function handleNewPhotoFiles(files: FileList | null) {
    if (!files) return
    const accepted = Array.from(files).filter(f => f.type.startsWith('image/'))
    const total = existingPhotos.length + newPhotos.length
    const remaining = 12 - total
    if (remaining <= 0) return
    setNewPhotos(prev => [...prev, ...accepted].slice(0, prev.length + remaining))
  }

  function removeNewPhoto(i: number) {
    setNewPhotos(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('property_type', form.property_type)
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
    fd.append('existing_photos', JSON.stringify(existingPhotos))
    newPhotos.forEach(p => fd.append('new_photos', p))

    startTransition(async () => {
      try {
        const res = await fetch(`/api/listing/${listingId}/update`, { method: 'PATCH', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Errore nel salvataggio')
        toast.success('Annuncio aggiornato')
        router.push(`/listing/${listingId}`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
      }
    })
  }

  const isApartment = form.property_type === 'apartment'
  const totalPhotos = existingPhotos.length + newPhotos.length

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-0 divide-y divide-border">

      {/* Tipo immobile */}
      <section className="pt-0 pb-6 space-y-3">
        <h2 className="text-base font-semibold">Tipo di immobile</h2>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map(pt => (
            <button key={pt.value} type="button" onClick={() => update('property_type', pt.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                form.property_type === pt.value
                  ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                  : 'border-border bg-card text-foreground hover:bg-muted'}`}>
              {pt.label}
            </button>
          ))}
        </div>
        {isApartment && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="floor">Piano</Label>
              <Input id="floor" type="number" min="0" placeholder="es. 3" value={form.floor} onChange={e => update('floor', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="total_floors">Piani totali edificio</Label>
              <Input id="total_floors" type="number" min="1" placeholder="es. 6" value={form.total_floors} onChange={e => update('total_floors', e.target.value)} />
            </div>
          </div>
        )}
      </section>

      {/* Localizzazione */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Localizzazione</h2>
        <div className="space-y-1.5">
          <Label htmlFor="address">Indirizzo *</Label>
          <Input id="address" placeholder="Via Roma 12" value={form.address} onChange={e => update('address', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city">Città *</Label>
            <Input id="city" placeholder="Milano" value={form.city} onChange={e => update('city', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="neighborhood">Quartiere / Zona</Label>
            <Input id="neighborhood" placeholder="Navigli" value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Dettagli */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Dettagli immobile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Prezzo (€) *</Label>
            <Input id="price" type="number" min="0" placeholder="250000" value={form.price} onChange={e => update('price', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sqm">Superficie (m²) *</Label>
            <Input id="sqm" type="number" min="1" placeholder="85" value={form.sqm} onChange={e => update('sqm', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rooms">Locali *</Label>
            <Input id="rooms" type="number" min="1" placeholder="3" value={form.rooms} onChange={e => update('rooms', e.target.value)} required />
          </div>
          {form.property_type !== 'land' && (
            <div className="space-y-1.5">
              <Label htmlFor="bathrooms">Bagni</Label>
              <Select value={form.bathrooms} onValueChange={v => { if (v) update('bathrooms', v) }}>
                <SelectTrigger id="bathrooms" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4+'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Stato dell&apos;immobile</Label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button key={c.value} type="button" onClick={() => update('condition', form.condition === c.value ? '' : c.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  form.condition === c.value
                    ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                    : 'border-border bg-card text-foreground hover:bg-muted'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Dati catastali */}
      <section className="py-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Dati catastali</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Opzionale</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="foglio">Foglio</Label>
            <Input id="foglio" placeholder="es. 12" value={form.foglio} onChange={e => update('foglio', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="particella">Particella</Label>
            <Input id="particella" placeholder="es. 345" value={form.particella} onChange={e => update('particella', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subalterno">Subalterno</Label>
            <Input id="subalterno" placeholder="es. 7" value={form.subalterno} onChange={e => update('subalterno', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="categoria_catastale">Categoria catastale</Label>
            <Input id="categoria_catastale" placeholder="es. A/3" value={form.categoria_catastale} onChange={e => update('categoria_catastale', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rendita_catastale">Rendita catastale (€)</Label>
            <Input id="rendita_catastale" type="number" min="0" step="0.01" placeholder="es. 850.00" value={form.rendita_catastale} onChange={e => update('rendita_catastale', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Caratteristiche */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Caratteristiche</h2>
        <div className="flex flex-wrap gap-2">
          {FEATURES.filter(f => !(form.property_type === 'land' && f.id === 'elevator')).map(f => {
            const active = form.features.includes(f.id)
            return (
              <button key={f.id} type="button" onClick={() => toggleFeature(f.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                  active
                    ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}>
                {f.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Tono */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Tono di comunicazione</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TONES.map(t => (
            <button key={t.id} type="button" onClick={() => update('tone', t.id)}
              className={`rounded-lg border p-3 text-left transition-all ${
                form.tone === t.id
                  ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                  : 'border-border bg-card text-foreground hover:bg-muted'}`}>
              <div className="text-sm font-medium">{t.label}</div>
              <div className={`text-xs mt-0.5 ${form.tone === t.id ? 'text-white/70' : 'text-muted-foreground'}`}>{t.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Note */}
      <section className="py-6 space-y-4">
        <h2 className="text-base font-semibold">Note agente</h2>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Informazioni aggiuntive <span className="text-muted-foreground">(opzionale, max 300 caratteri)</span></Label>
          <Textarea id="notes" placeholder="Es. cucina appena ristrutturata..." maxLength={300} rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} />
          <p className="text-right text-xs text-muted-foreground">{form.notes.length}/300</p>
        </div>
      </section>

      {/* Foto */}
      <section className="py-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Foto dell&apos;immobile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{totalPhotos}/12 foto · Clicca × per rimuovere una foto esistente</p>
        </div>

        {/* Existing photos */}
        {existingPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {existingPhotos.map(url => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Foto esistente" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(url)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New photo upload */}
        {totalPhotos < 12 && (
          <div>
            <div
              onClick={() => photoInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors"
            >
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Aggiungi nuove foto</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · Puoi aggiungere ancora {12 - totalPhotos} foto</p>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleNewPhotoFiles(e.target.files)} />
            {newPhotos.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {newPhotos.map((f, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={`Nuova foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeNewPhoto(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[9px] text-white">NUOVA</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Submit */}
      <div className="pt-6 flex gap-3">
        <button type="submit" disabled={isPending}
          className="btn-ai flex-1 gap-2 disabled:opacity-60 inline-flex items-center justify-center">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
          Annulla
        </button>
      </div>
    </form>
  )
}
