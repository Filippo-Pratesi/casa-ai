'use client'

import { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CsvRow {
  [key: string]: string
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  function splitLine(line: string): string[] {
    const result: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const vals = splitLine(line)
    const row: CsvRow = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })

  return { headers, rows }
}

export function ImportContacts() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<{ headers: string[]; rows: CsvRow[] } | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setParsed(parseCsv(text))
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleReset() {
    setParsed(null)
    setFileName(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.rows }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Errore durante l\'importazione')
        return
      }
      setResult(data)
      toast.success(`${data.imported} contatti importati`)
      handleReset()
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Importa contatti da CSV</h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Il file deve avere le colonne: Nome, Email, Telefono, Tipo, Città, Note, Budget Min, Budget Max, Stanze Min, MQ Min, Data Nascita
        </p>
      </div>

      {!parsed ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 px-6 py-8 text-sm text-neutral-500 hover:border-neutral-300 hover:bg-neutral-100 transition-all duration-150 cursor-pointer"
        >
          <Upload className="h-6 w-6 text-neutral-400" />
          <span className="font-medium">Seleziona file CSV</span>
          <span className="text-xs text-neutral-400">oppure trascina qui</span>
        </button>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white border border-neutral-200 px-2.5 py-1.5">
                <p className="text-xs font-medium text-neutral-700">{fileName}</p>
              </div>
              <span className="text-xs text-neutral-500">{parsed.rows.length} righe trovate</span>
            </div>
            <button onClick={handleReset} className="rounded-lg p-1 hover:bg-neutral-200 transition-colors">
              <X className="h-4 w-4 text-neutral-500" />
            </button>
          </div>

          {/* Preview table */}
          <div className="overflow-auto rounded-lg border border-neutral-200 bg-white">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {parsed.headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0">
                    {parsed.headers.map(h => (
                      <td key={h} className="px-3 py-1.5 text-neutral-700 whitespace-nowrap max-w-[160px] truncate">{row[h] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.rows.length > 5 && (
              <p className="px-3 py-2 text-xs text-neutral-400">… e altre {parsed.rows.length - 5} righe</p>
            )}
          </div>

          <Button onClick={handleImport} disabled={loading} className="w-full gap-2 h-9">
            <Upload className="h-4 w-4" />
            {loading ? 'Importo…' : `Importa ${parsed.rows.length} contatti`}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <Check className="h-4 w-4" />
            {result.imported} contatti importati
          </div>
          {result.skipped > 0 && (
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              {result.skipped} saltati (email duplicata)
            </p>
          )}
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {result.errors.length} errori
              </p>
              <ul className="mt-1 space-y-0.5">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-xs text-neutral-500">• {e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
