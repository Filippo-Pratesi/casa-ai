export interface LineItem {
  descrizione: string
  quantita: number
  prezzo_unitario: number  // euro cents
  importo: number          // euro cents
}

export interface TotalsInput {
  voci: LineItem[]
  regime: 'ordinario' | 'forfettario' | 'esente'
  aliquota_iva: number
  ritenuta_acconto: boolean
  aliquota_ritenuta: number
  contributo_cassa: boolean
  aliquota_cassa: number
}

export interface TotalsResult {
  imponibile: number       // euro cents — sum of line items
  importo_cassa: number    // euro cents
  base_imponibile: number  // euro cents — imponibile + cassa (IVA is applied on this)
  importo_iva: number      // euro cents
  totale_documento: number // euro cents
  importo_ritenuta: number // euro cents
  netto_a_pagare: number   // euro cents
}

export function computeTotals(input: TotalsInput): TotalsResult {
  const imponibile = input.voci.reduce((sum, v) => sum + v.importo, 0)

  const importo_cassa = input.contributo_cassa
    ? Math.round(imponibile * input.aliquota_cassa / 100)
    : 0

  const base_imponibile = imponibile + importo_cassa

  // Forfettario and esente: no IVA
  const effectiveIvaRate = (input.regime === 'forfettario' || input.regime === 'esente')
    ? 0
    : input.aliquota_iva

  const importo_iva = Math.round(base_imponibile * effectiveIvaRate / 100)

  const totale_documento = base_imponibile + importo_iva

  // Ritenuta d'acconto applies to imponibile only (not cassa, not IVA)
  // Forfettario agents are not subject to ritenuta
  const importo_ritenuta = (input.ritenuta_acconto && input.regime !== 'forfettario')
    ? Math.round(imponibile * input.aliquota_ritenuta / 100)
    : 0

  const netto_a_pagare = totale_documento - importo_ritenuta

  return {
    imponibile,
    importo_cassa,
    base_imponibile,
    importo_iva,
    totale_documento,
    importo_ritenuta,
    netto_a_pagare,
  }
}

/** Format euro cents as "€ 1.234,56" */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

/** Parse a euro string like "1234.56" to cents */
export function parseCurrencyToCents(value: string): number {
  const num = parseFloat(value.replace(',', '.'))
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}
