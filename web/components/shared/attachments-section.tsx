'use client'

import { useState, useEffect, useRef } from 'react'
import { Paperclip, Upload, Trash2, FileText, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Attachment {
  id: string
  name: string
  storage_path: string
  size_bytes: number | null
  mime_type: string | null
  created_at: string
}

interface AttachmentsSectionProps {
  entityId: string
  apiBase: string // e.g. /api/contacts/{id}/attachments or /api/listing/{id}/attachments
  downloadBase: string // e.g. /api/contacts/{id}/attachments/download
  label?: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime: string | null) {
  if (!mime) return <FileText className="h-4 w-4 text-neutral-400" />
  if (mime.startsWith('image/')) return <FileText className="h-4 w-4 text-blue-400" />
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-400" />
  return <FileText className="h-4 w-4 text-neutral-400" />
}

export function AttachmentsSection({ entityId, apiBase, downloadBase, label = 'Allegati' }: AttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(apiBase)
      .then((r) => r.json())
      .then((d) => setAttachments(d.attachments ?? []))
      .catch(() => toast.error('Errore nel caricamento allegati'))
      .finally(() => setLoading(false))
  }, [apiBase])

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    const uploaded: Attachment[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch(apiBase, { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? `Errore upload ${file.name}`)
        } else {
          uploaded.push(data.attachment)
        }
      } catch {
        toast.error(`Errore di rete per ${file.name}`)
      }
    }
    if (uploaded.length > 0) {
      setAttachments((prev) => [...uploaded, ...prev])
      toast.success(`${uploaded.length} file caricato${uploaded.length > 1 ? 'i' : ''}`)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(att: Attachment) {
    setDeletingId(att.id)
    try {
      const res = await fetch(apiBase, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachment_id: att.id }),
      })
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== att.id))
        toast.success('Allegato eliminato')
      } else {
        toast.error('Errore eliminazione')
      }
    } catch {
      toast.error('Errore di rete')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDownload(att: Attachment) {
    try {
      const res = await fetch(`${downloadBase}?path=${encodeURIComponent(att.storage_path)}`)
      if (!res.ok) { toast.error('Errore download'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = att.name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Errore di rete')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-700">{label}</h3>
          {!loading && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{attachments.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Caricamento…' : 'Carica file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar,.txt,.csv"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
        </div>
      ) : attachments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-8 text-center cursor-pointer hover:bg-neutral-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-6 w-6 text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-400">Nessun allegato</p>
          <p className="text-xs text-neutral-300 mt-0.5">Clicca per caricare documenti, planimetrie, ecc.</p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-100 bg-white overflow-hidden">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 px-3 py-2.5">
              {fileIcon(att.mime_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{att.name}</p>
                <p className="text-[11px] text-neutral-400">
                  {att.size_bytes ? formatBytes(att.size_bytes) + ' · ' : ''}
                  {new Date(att.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
                  title="Scarica"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(att)}
                  disabled={deletingId === att.id}
                  className="rounded-lg p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  title="Elimina"
                >
                  {deletingId === att.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
