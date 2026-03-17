'use client'

import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_PHOTOS = 12

interface PhotoUploaderProps {
  photos: File[]
  onChange: (photos: File[]) => void
}

export function PhotoUploader({ photos, onChange }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const merged = [...photos, ...accepted].slice(0, MAX_PHOTOS)
    onChange(merged)
  }

  function remove(index: number) {
    onChange(photos.filter((_, i) => i !== index))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  const previews = photos.map((f) => URL.createObjectURL(f))

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => photos.length < MAX_PHOTOS && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors
          ${photos.length < MAX_PHOTOS
            ? 'cursor-pointer border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
            : 'cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60'}
        `}
      >
        <ImagePlus className="h-8 w-8 text-neutral-400" />
        <div>
          <p className="text-sm font-medium text-neutral-700">
            {photos.length < MAX_PHOTOS
              ? 'Trascina le foto o clicca per selezionare'
              : `Limite raggiunto (${MAX_PHOTOS} foto)`}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            JPG, PNG, WEBP · Max {MAX_PHOTOS} foto · {photos.length}/{MAX_PHOTOS} caricate
          </p>
        </div>
        {photos.length < MAX_PHOTOS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          >
            Seleziona foto
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Preview grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((src, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Foto ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Rimuovi foto"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
