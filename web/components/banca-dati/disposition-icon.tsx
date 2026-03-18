'use client'

import { cn } from '@/lib/utils'

export type OwnerDisposition =
  | 'non_definito'
  | 'non_vende'
  | 'vende_sicuramente'
  | 'sta_pensando'
  | 'sta_esplorando'
  | 'in_attesa'
  | 'da_ricontattare'
  | 'notizia_ricevuta'
  | 'incarico_firmato'
  | 'appena_acquistato'

const DISPOSITION_CONFIG: Record<OwnerDisposition, {
  label: string
  symbol: string
  color: string
  description: string
}> = {
  non_definito: { label: 'Non definito', symbol: '○', color: 'text-gray-400', description: 'Stato non definito' },
  non_vende: { label: 'Non vende', symbol: '✗', color: 'text-red-500', description: 'Proprietario non intenzionato a vendere' },
  vende_sicuramente: { label: 'Vende', symbol: '✓', color: 'text-green-500', description: 'Proprietario deciso a vendere' },
  sta_pensando: { label: 'Ci sta pensando', symbol: '?', color: 'text-amber-500', description: 'Proprietario indeciso' },
  sta_esplorando: { label: 'Sta esplorando', symbol: '◈', color: 'text-blue-400', description: 'Proprietario valuta le opzioni' },
  in_attesa: { label: 'In attesa', symbol: '⏸', color: 'text-slate-400', description: 'In attesa di evento (eredità, trasloco...)' },
  da_ricontattare: { label: 'Da ricontattare', symbol: '↩', color: 'text-orange-500', description: 'Richiamare o seguire' },
  notizia_ricevuta: { label: 'Notizia ricevuta', symbol: '★', color: 'text-yellow-500', description: 'Intelligence ricevuta sul proprietario' },
  incarico_firmato: { label: 'Incarico firmato', symbol: '✦', color: 'text-emerald-600', description: 'Incarico di vendita firmato' },
  appena_acquistato: { label: 'Appena acquistato', symbol: '⊕', color: 'text-purple-500', description: 'Immobile appena acquistato (reset dopo 3 mesi)' },
}

interface DispositionIconProps {
  disposition: OwnerDisposition
  showLabel?: boolean
  className?: string
}

export function DispositionIcon({ disposition, showLabel = false, className }: DispositionIconProps) {
  const config = DISPOSITION_CONFIG[disposition] ?? DISPOSITION_CONFIG.non_definito

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-sm font-medium', config.color, className)}
      title={config.description}
    >
      <span className="text-base leading-none">{config.symbol}</span>
      {showLabel && <span className="text-xs">{config.label}</span>}
    </span>
  )
}

export { DISPOSITION_CONFIG }
