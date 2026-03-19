'use client'

import { useState, useRef } from 'react'
import { unzipSync } from 'fflate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { parseOmiValoriCsv } from '@/lib/omi-parse'

interface OmiUploadProps {
  lastSemestre: string | null
  lastUploadDate: string | null
  recordCount: number | null
}

const BATCH_SIZE = 500

export function OmiUpload({ lastSemestre, lastUploadDate, recordCount }: OmiUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const name = file.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.zip')) {
      setResult({ success: false, message: 'Il file deve essere in formato CSV o ZIP' })
      return
    }

    setUploading(true)
    setResult(null)
    setProgress('Lettura file…')

    try {
      // 1. Extract CSV text in-browser
      let csvText: string
      let sourceFilename = name

      if (name.endsWith('.zip')) {
        const buf = new Uint8Array(await file.arrayBuffer())
        let zipFiles: Record<string, Uint8Array>
        try {
          zipFiles = unzipSync(buf)
        } catch {
          setResult({ success: false, message: 'File ZIP non valido o corrotto' })
          return
        }

        const valoriEntry = Object.entries(zipFiles).find(([k]) =>
          k.toUpperCase().includes('VALORI') && k.toUpperCase().endsWith('.CSV')
        )
        if (!valoriEntry) {
          setResult({ success: false, message: 'Nessun file *_VALORI.csv trovato nello ZIP. Assicurati di caricare il file scaricato dal portale OMI.' })
          return
        }
        sourceFilename = valoriEntry[0]
        csvText = new TextDecoder('utf-8').decode(valoriEntry[1])
      } else {
        csvText = await file.text()
      }

      // 2. Parse CSV in-browser
      setProgress('Analisi CSV…')
      const parsed = parseOmiValoriCsv(csvText, sourceFilename)
      if ('error' in parsed) {
        setResult({ success: false, message: parsed.error })
        return
      }

      const { rows, semestre } = parsed
      if (rows.length === 0) {
        setResult({ success: false, message: 'Nessun record valido trovato nel file VALORI' })
        return
      }

      // 3. POST rows in JSON batches
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
      let insertedCount = 0

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1
        setProgress(`Importazione batch ${batchIndex}/${totalBatches}…`)

        const batch = rows.slice(i, i + BATCH_SIZE)
        const isFinal = i + BATCH_SIZE >= rows.length

        const res = await fetch('/api/settings/omi-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: batch, semestre, isFinal, totalCount: rows.length }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Errore server' }))
          setResult({ success: false, message: data.error ?? 'Errore durante l\'importazione' })
          return
        }

        insertedCount += batch.length
      }

      setResult({ success: true, message: `Importati ${insertedCount.toLocaleString('it-IT')} record (${semestre})`, count: insertedCount })
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Errore imprevisto' })
    } finally {
      setUploading(false)
      setProgress(null)
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
          {uploading ? (progress ?? 'Importazione in corso…') : 'Carica ZIP / CSV OMI'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.zip"
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
            <li>Scarica il file ZIP e caricalo qui sopra (sono accettati anche i singoli file CSV *_VALORI.csv)</li>
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
