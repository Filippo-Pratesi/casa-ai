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
  readOnly?: boolean
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime: string | null) {
  if (!mime) return <FileText className="h-4 w-4 text-muted-foreground" />
  if (mime.startsWith('image/')) return <FileText className="h-4 w-4 text-blue-400" />
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-400" />
  return <FileText className="h-4 w-4 text-muted-foreground" />
}

export function AttachmentsSection({ entityId, apiBase, downloadBase, label = 'Allegati', readOnly = false }: AttachmentsSectionProps) {
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
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{label}</h3>
          {!loading && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{attachments.length}</span>
          )}
        </div>
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60 transition-colors"
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
          </>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      ) : attachments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-6 w-6 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nessun allegato</p>
          <p className="text-xs text-muted-foreground/50 mt-0.5">Clicca per caricare documenti, planimetrie, ecc.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 px-3 py-2.5">
              {fileIcon(att.mime_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {att.size_bytes ? formatBytes(att.size_bytes) + ' · ' : ''}
                  {new Date(att.created_at).toLocaleDateString('it-IT')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Scarica"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(att)}
                  disabled={deletingId === att.id}
                  className="rounded-lg p-1.5 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
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
