'use client'

import { useRef, useState } from 'react'
import { FileImage, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface FloorPlanUploaderProps {
  listingId: string
  initialUrl: string | null
}

export function FloorPlanUploader({ listingId, initialUrl }: FloorPlanUploaderProps) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo immagini sono accettate')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/listing/${listingId}/floor-plan`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Errore nel caricamento')
        return
      }
      setUrl(data.url)
      toast.success('Planimetria caricata')
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setLoading(true)
    try {
      await fetch(`/api/listing/${listingId}/floor-plan`, { method: 'DELETE' })
      setUrl(null)
      toast.success('Planimetria rimossa')
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (url) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden border border-border">
          <Image
            src={url}
            alt="Planimetria"
            width={600}
            height={400}
            className="w-full object-contain max-h-80"
          />
          <button
            onClick={handleRemove}
            disabled={loading}
            className="absolute top-2 right-2 rounded-full bg-card border border-border p-1.5 hover:bg-red-50 hover:border-red-200 transition-colors"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sostituisci planimetria
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragEnter={() => setDragOver(true)}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !loading && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-border hover:bg-muted/50'}`}
    >
      {loading ? (
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      ) : (
        <>
          <div className="rounded-full bg-muted p-3">
            <FileImage className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Carica planimetria</p>
            <p className="text-xs text-muted-foreground mt-0.5">Trascina qui o clicca per selezionare</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Upload className="h-3 w-3" />
            JPG, PNG, WEBP
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
