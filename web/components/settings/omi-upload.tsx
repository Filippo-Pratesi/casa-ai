'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react'

interface OmiUploadProps {
  lastSemestre: string | null
  lastUploadDate: string | null
  recordCount: number | null
}

export function OmiUpload({ lastSemestre, lastUploadDate, recordCount }: OmiUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setResult({ success: false, message: 'Il file deve essere in formato CSV' })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/settings/omi-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: `Importati ${data.count?.toLocaleString('it-IT') ?? 0} record`, count: data.count })
      } else {
        setResult({ success: false, message: data.error ?? 'Errore durante l\'importazione' })
      }
    } catch {
      setResult({ success: false, message: 'Errore di rete durante l\'upload' })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Stato attuale */}
      <div className="flex items-center gap-3">
        {lastSemestre ? (
          <>
            <Badge variant="outline" className="border-green-400 text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Sem. {lastSemestre}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Caricato il {lastUploadDate ? new Date(lastUploadDate).toLocaleDateString('it-IT') : '—'}
              {recordCount ? ` — ${recordCount.toLocaleString('it-IT')} record` : ''}
            </span>
          </>
        ) : (
          <Badge variant="outline" className="border-amber-400 text-amber-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Nessun CSV caricato
          </Badge>
        )}
      </div>

      {/* Upload */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? 'Importazione in corso...' : 'Carica CSV OMI'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Risultato */}
      {result && (
        <div className={`flex items-center gap-2 text-sm ${result.success ? 'text-green-600' : 'text-destructive'}`}>
          {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {result.message}
        </div>
      )}

      {/* Istruzioni collapsibili */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground p-0 h-auto"
        onClick={() => setShowInstructions(!showInstructions)}
      >
        <Info className="h-3 w-3 mr-1" />
        Come scaricare il CSV OMI
        {showInstructions ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
      </Button>

      {showInstructions && (
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
            <li>
              Accedi a{' '}
              <a
                href="https://telematici.agenziaentrate.gov.it/Main/index.jsp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                telematici.agenziaentrate.gov.it
              </a>
              {' '}con SPID o CIE
            </li>
            <li>Nel menu laterale, clicca &quot;Servizi ipotecari e catastali&quot; &rarr; &quot;Osservatorio Mercato Immobiliare&quot;</li>
            <li>Clicca &quot;Forniture OMI – Quotazioni Immobiliari&quot;</li>
            <li>Seleziona &quot;Intero territorio nazionale&quot; e il semestre piu recente</li>
            <li>Scarica il file CSV e caricalo qui sopra</li>
          </ol>
          <p className="text-xs text-muted-foreground/70 pt-1">
            I dati vengono pubblicati ogni 6 mesi (solitamente giugno e dicembre).
            Fonte: Agenzia Entrate — OMI.
          </p>
        </div>
      )}
    </div>
  )
}
