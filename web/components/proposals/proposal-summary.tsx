'use client'

import React from 'react'

interface ProposalSummaryProps {
  nextNumber: string
  immobileIndirizzo: string
  immobileCitta: string
  proponenteNome: string
  prezzoRichiesto: number
  prezzoOfferto: number
  caparra: number
  validita: string
  vincoliCount: number
}

const formatEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const ProposalSummary = React.memo(function ProposalSummary({
  nextNumber, immobileIndirizzo, immobileCitta, proponenteNome,
  prezzoRichiesto, prezzoOfferto, caparra, validita, vincoliCount
}: ProposalSummaryProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold">Riepilogo proposta</h2>
      <div className="text-xs text-muted-foreground space-y-1.5">
        <p>N. {nextNumber}</p>
        {immobileIndirizzo && <p className="font-medium text-foreground">{immobileIndirizzo}, {immobileCitta}</p>}
        {proponenteNome && <p>Acquirente: {proponenteNome}</p>}
      </div>
      {prezzoOfferto > 0 && (
        <div className="border-t border-border pt-3 space-y-1">
          {prezzoRichiesto > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Prezzo richiesto</span>
              <span>{formatEuro(prezzoRichiesto)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold">
            <span>Prezzo offerto</span>
            <span className="text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]">{formatEuro(prezzoOfferto)}</span>
          </div>
          {caparra > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Caparra</span>
              <span>{formatEuro(caparra)}</span>
            </div>
          )}
        </div>
      )}
      {validita && (
        <p className="text-xs text-muted-foreground">
          Valida fino al {new Date(validita).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
      {vincoliCount > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5">
            {vincoliCount} vincolo{vincoliCount > 1 ? 'i' : ''}
          </span>
        </div>
      )}
    </div>
  )
})
