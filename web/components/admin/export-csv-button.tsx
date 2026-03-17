'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AgentRow {
  name: string
  email: string
  role: string
  listingsTotal: number
  listingsThisMonth: number
  generatedTotal: number
  contactsTotal: number
  joinedAt: string
}

export function ExportCsvButton({ rows, month }: { rows: AgentRow[]; month: string }) {
  const handleExport = () => {
    const headers = [
      'Nome',
      'Email',
      'Ruolo',
      'Immobili totali',
      `Immobili (${month})`,
      'Contenuti AI generati',
      'Clienti totali',
      'Iscritto il',
    ]

    const csvRows = rows.map((r) => [
      r.name,
      r.email,
      r.role === 'admin' ? 'Admin' : 'Agente',
      r.listingsTotal,
      r.listingsThisMonth,
      r.generatedTotal,
      r.contactsTotal,
      new Date(r.joinedAt).toLocaleDateString('it-IT'),
    ])

    const csv = [headers, ...csvRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `casaai-team-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={handleExport}>
      <Download className="h-3.5 w-3.5" />
      Esporta CSV
    </Button>
  )
}
