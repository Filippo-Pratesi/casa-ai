'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GenerateContentButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listing/${listingId}/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Errore nella generazione')
      } else {
        router.refresh()
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={handleGenerate} disabled={loading} className="gap-2">
        <Sparkles className="h-4 w-4" />
        {loading ? 'Generazione in corso…' : 'Genera contenuto AI'}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
