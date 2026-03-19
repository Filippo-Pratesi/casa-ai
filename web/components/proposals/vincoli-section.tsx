'use client'

import React from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConditionType, Vincolo, conditionLabels } from './proposal-types'

interface VincoliSectionProps {
  vincoli: Vincolo[]
  onAdd: (tipo: ConditionType) => void
  onRemove: (idx: number) => void
  onUpdate: (idx: number, updates: Partial<Vincolo>) => void
}

export const VincoliSection = React.memo(function VincoliSection({
  vincoli, onAdd, onRemove, onUpdate
}: VincoliSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Vincoli e condizioni</h2>
        <div className="relative">
          <select
            value=""
            onChange={e => { if (e.target.value) onAdd(e.target.value as ConditionType) }}
            className="appearance-none rounded-lg border border-input bg-background px-3 py-1.5 text-xs pr-7 focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="">+ Aggiungi vincolo</option>
            {(Object.keys(conditionLabels) as ConditionType[]).map(tipo => (
              <option key={tipo} value={tipo}>{conditionLabels[tipo]}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {vincoli.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nessun vincolo — proposta libera da condizioni</p>
      ) : (
        <div className="space-y-3">
          {vincoli.map((v, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{conditionLabels[v.tipo]}</span>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {v.tipo === 'mutuo' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Importo massimo mutuo (€)</Label>
                    <Input
                      type="number" size={12}
                      value={v.importo_mutuo ?? ''}
                      onChange={e => onUpdate(idx, { importo_mutuo: Number(e.target.value) })}
                      placeholder="200000"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome banca</Label>
                    <Input
                      value={v.nome_banca ?? ''}
                      onChange={e => onUpdate(idx, { nome_banca: e.target.value })}
                      placeholder="Intesa Sanpaolo"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
              {v.tipo === 'vendita_immobile' && (
                <div className="space-y-1">
                  <Label className="text-xs">Indirizzo immobile da vendere</Label>
                  <Input
                    value={v.indirizzo_immobile_vendita ?? ''}
                    onChange={e => onUpdate(idx, { indirizzo_immobile_vendita: e.target.value })}
                    placeholder="Via Roma 1, Milano"
                    className="h-8 text-sm"
                  />
                </div>
              )}
              {v.tipo === 'personalizzata' && (
                <div className="space-y-1">
                  <Label className="text-xs">Descrizione condizione</Label>
                  <Textarea
                    value={v.descrizione ?? ''}
                    onChange={e => onUpdate(idx, { descrizione: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
})
