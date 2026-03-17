'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Listing {
  id: string
  address: string
  city: string
  price: number
  property_type: string
}

interface DeleteContactButtonProps {
  contactId: string
  name: string
}

type Step = 'idle' | 'confirm' | 'bought' | 'listing' | 'archive_listing'

export function DeleteContactButton({ contactId, name }: DeleteContactButtonProps) {
  const [step, setStep] = useState<Step>('idle')
  const [loading, setLoading] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (step === 'listing') {
      setLoadingListings(true)
      fetch('/api/listing')
        .then((r) => r.json())
        .then((d) => setListings(d.listings ?? []))
        .catch(() => setListings([]))
        .finally(() => setLoadingListings(false))
    }
  }, [step])

  async function handleDelete(bought: boolean, archiveListing = false) {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { bought }
      if (bought && selectedListing) {
        body.listing_id = selectedListing.id
        body.listing_address = `${selectedListing.address}, ${selectedListing.city}`
        body.archive_listing = archiveListing
      }
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Errore nella cancellazione')
        return
      }
      toast.success('Cliente archiviato')
      router.push('/contacts')
      router.refresh()
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
      setStep('idle')
    }
  }

  function reset() {
    setStep('idle')
    setSelectedListing(null)
  }

  // --- STEP: idle ---
  if (step === 'idle') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setStep('confirm')}
        className="h-8 gap-1.5 text-xs text-neutral-400 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina
      </Button>
    )
  }

  // --- STEP: confirm ---
  if (step === 'confirm') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
        <span className="text-xs text-red-700 font-medium">Eliminare «{name}»?</span>
        <button
          onClick={() => setStep('bought')}
          disabled={loading}
          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          Sì, elimina
        </button>
        <button
          onClick={reset}
          disabled={loading}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    )
  }

  // --- STEP: bought ---
  if (step === 'bought') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
        <span className="text-xs text-amber-800 font-medium">Il cliente ha acquistato casa?</span>
        <button
          onClick={() => setStep('listing')}
          className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
        >
          Sì, ha acquistato
        </button>
        <button
          onClick={() => handleDelete(false)}
          disabled={loading}
          className="rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-900 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Elimino…' : 'No, elimina'}
        </button>
        <button
          onClick={reset}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    )
  }

  // --- STEP: listing ---
  if (step === 'listing') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 max-w-sm">
        <p className="text-xs text-amber-800 font-medium">Quale immobile ha acquistato?</p>
        {loadingListings ? (
          <p className="text-xs text-neutral-500">Carico annunci…</p>
        ) : (
          <div className="relative">
            <select
              value={selectedListing?.id ?? ''}
              onChange={(e) => {
                const l = listings.find((x) => x.id === e.target.value) ?? null
                setSelectedListing(l)
              }}
              className="w-full appearance-none rounded-lg border border-neutral-200 bg-white py-1.5 pl-3 pr-8 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            >
              <option value="">— Non è nel database —</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.address}, {l.city} — €{l.price.toLocaleString('it-IT')}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400" />
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setStep('archive_listing')}
            className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
          >
            Continua
          </button>
          <button
            onClick={reset}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    )
  }

  // --- STEP: archive_listing ---
  if (step === 'archive_listing') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 max-w-sm">
        {selectedListing ? (
          <p className="text-xs text-amber-800 font-medium">
            Rimuovere anche l&apos;annuncio <strong>{selectedListing.address}</strong> dal database?
          </p>
        ) : (
          <p className="text-xs text-amber-800 font-medium">
            Confermare l&apos;archiviazione del cliente come acquirente?
          </p>
        )}
        <div className="flex items-center gap-2">
          {selectedListing && (
            <>
              <button
                onClick={() => handleDelete(true, true)}
                disabled={loading}
                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Archivio…' : 'Sì, rimuovi anche annuncio'}
              </button>
              <button
                onClick={() => handleDelete(true, false)}
                disabled={loading}
                className="rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-900 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Archivio…' : 'No, tieni annuncio'}
              </button>
            </>
          )}
          {!selectedListing && (
            <button
              onClick={() => handleDelete(true, false)}
              disabled={loading}
              className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Archivio…' : 'Archivia'}
            </button>
          )}
          <button
            onClick={reset}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    )
  }

  return null
}
