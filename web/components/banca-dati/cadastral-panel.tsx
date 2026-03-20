'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldAlert, RefreshCw, TrendingUp, Info, AlertTriangle, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

// --- Types ---

interface CadastralData {
  foglio: string | null
  particella: string | null
  categoria_catastale: string | null
  superficie_mq: number | null
  classificazione: string | null
  rischio_idrogeologico: string | null
  rischio_sismico: string | null
  indice_potenziale_immobiliare: number | null
  indice_resilienza_economica: number | null
  eta_media_zona: number | null
  dimensione_media_famiglia: number | null
  elevazione: number | null
  fid: string
  comune: string
  provincia: string
  regione: string
}

interface ValuationData {
  valore_min: number
  valore_max: number
  valore_min_mq: number
  valore_max_mq: number
  semestre: string
  fonte: 'csv_omi' | 'api_3eurotools'
  stato_conservazione: string | null
  disclaimer: string
}

interface CadastralPanelProps {
  propertyId: string
  latitude: number | null
  longitude: number | null
  sqm: number | null
  propertyType: string | null
  codiceComune: string | null
  zonaOmi: string | null
  existingCadastralData: CadastralData | null
  existingFetchedAt: string | null
  onCadastralDataFetched?: (data: CadastralData) => void
}

// --- Risk badge ---

function riskBadge(risk: string | null, label: string) {
  if (!risk) return null
  const normalized = risk.toLowerCase()
  const isHigh = normalized.includes('alto') || normalized.includes('high')
  const isMedium = normalized.includes('medio') || normalized.includes('medium')
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="outline" className={cn(
        'text-xs',
        isHigh && 'border-red-400 text-red-600 dark:text-red-400',
        isMedium && 'border-amber-400 text-amber-600 dark:text-amber-400',
        !isHigh && !isMedium && 'border-green-400 text-green-600 dark:text-green-400'
      )}>
        {risk}
      </Badge>
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

// --- Component ---

export function CadastralPanel({
  latitude,
  longitude,
  sqm,
  propertyType,
  codiceComune,
  zonaOmi,
  existingCadastralData,
  existingFetchedAt,
  onCadastralDataFetched,
}: CadastralPanelProps) {
  const [cadastralData, setCadastralData] = useState<CadastralData | null>(existingCadastralData)
  const [valuation, setValuation] = useState<ValuationData | null>(null)
  const [rentalValuation, setRentalValuation] = useState<ValuationData | null>(null)
  const [loadingCadastral, setLoadingCadastral] = useState(false)
  const [loadingValuation, setLoadingValuation] = useState(false)
  const [valuationError, setValuationError] = useState<string | null>(null)

  const hasCoordinates = latitude != null && longitude != null

  const fetchCadastral = useCallback(async () => {
    if (!hasCoordinates) return
    setLoadingCadastral(true)
    try {
      const res = await fetch(`/api/catasto/parcels?lat=${latitude}&lng=${longitude}`)
      const json = await res.json()
      if (json.data) {
        setCadastralData(json.data)
        onCadastralDataFetched?.(json.data)
      }
    } catch {
      // Silently ignore — panel stays empty
    } finally {
      setLoadingCadastral(false)
    }
  }, [latitude, longitude, hasCoordinates, onCadastralDataFetched])

  const fetchValuation = useCallback(async () => {
    const comune = codiceComune || cadastralData?.comune
    const zona = zonaOmi
    const tipo = propertyType ?? 'apartment'
    const superficie = sqm
    if (!comune || !zona || !superficie) return

    setLoadingValuation(true)
    setValuationError(null)
    try {
      const baseParams = new URLSearchParams({
        codice_comune: comune,
        zona_omi: zona,
        tipo_immobile: tipo,
        sqm: String(superficie),
      })
      const acquistoParams = new URLSearchParams({ ...Object.fromEntries(baseParams), operazione: 'acquisto' })
      const affittoParams = new URLSearchParams({ ...Object.fromEntries(baseParams), operazione: 'affitto' })

      const [resAcquisto, resAffitto] = await Promise.all([
        fetch(`/api/catasto/quotazione?${acquistoParams}`),
        fetch(`/api/catasto/quotazione?${affittoParams}`),
      ])
      const [jsonAcquisto, jsonAffitto] = await Promise.all([
        resAcquisto.json(),
        resAffitto.json(),
      ])

      if (jsonAcquisto.error) {
        setValuationError(jsonAcquisto.error)
      } else if (jsonAcquisto.data) {
        setValuation(jsonAcquisto.data)
      }

      if (jsonAffitto.data) {
        setRentalValuation(jsonAffitto.data)
      }
    } catch {
      setValuationError('Errore nel calcolo della quotazione')
    } finally {
      setLoadingValuation(false)
    }
  }, [codiceComune, cadastralData?.comune, zonaOmi, propertyType, sqm])

  useEffect(() => {
    if (hasCoordinates && !cadastralData && !existingCadastralData) {
      fetchCadastral()
    }
  }, [hasCoordinates, cadastralData, existingCadastralData, fetchCadastral])

  useEffect(() => {
    const comune = codiceComune || cadastralData?.comune
    if (comune && zonaOmi && sqm && sqm > 0) {
      fetchValuation()
    }
  }, [codiceComune, cadastralData?.comune, zonaOmi, sqm, fetchValuation])

  if (!hasCoordinates) return null

  // Determine if we have any useful risk data to show
  const hasRisks = cadastralData?.rischio_idrogeologico || cadastralData?.rischio_sismico
  const hasPotenziale = cadastralData?.indice_potenziale_immobiliare != null

  // Only render risk card if we actually have risk data
  const showRiskCard = hasRisks || hasPotenziale || loadingCadastral

  return (
    <div className="space-y-4">
      {/* Card Rischi Territoriali */}
      {showRiskCard && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Rischi Territoriali</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCadastral}
              disabled={loadingCadastral}
              className="h-7 text-xs"
            >
              {loadingCadastral ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span className="ml-1">Aggiorna</span>
            </Button>
          </div>

          {loadingCadastral && !cadastralData && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recupero dati territoriali...
            </div>
          )}

          {cadastralData && (
            <div className="space-y-3">
              {/* Rischi */}
              {hasRisks && (
                <div className="flex flex-wrap gap-3">
                  {riskBadge(cadastralData.rischio_idrogeologico, 'Rischio idrogeologico')}
                  {riskBadge(cadastralData.rischio_sismico, 'Rischio sismico')}
                </div>
              )}

              {/* Indice potenziale (solo se disponibile) */}
              {hasPotenziale && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Potenziale immobiliare zona</p>
                  <p className="text-sm font-medium">{Math.round(cadastralData.indice_potenziale_immobiliare!)}/100</p>
                </div>
              )}

              {/* Fonte e data */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <Info className="h-3 w-3 shrink-0" />
                Dati zonali ISPRA — non specifici della singola unita immobiliare
              </div>
              {existingFetchedAt && (
                <p className="text-xs text-muted-foreground">
                  Aggiornati il {new Date(existingFetchedAt).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Card Stime OMI */}
      {(valuation || rentalValuation || loadingValuation || valuationError) && (
        <Card className="p-4 space-y-3">
          {/* Titolo dinamico con semestre */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-semibold text-sm">
              {(valuation ?? rentalValuation)
                ? (() => {
                    const sem = (valuation ?? rentalValuation)!.semestre // es. "2025_2"
                    const parts = sem.split('_')
                    if (parts.length === 2) {
                      return `Stime Dati OMI — ${parts[1]}° semestre ${parts[0]}`
                    }
                    return `Stime Dati OMI — ${sem}`
                  })()
                : 'Stime Dati OMI'}
            </h3>
          </div>

          {loadingValuation && !valuation && !rentalValuation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calcolo quotazione OMI...
            </div>
          )}

          {valuationError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {valuationError}
            </div>
          )}

          {/* Acquisto + Affitto side by side */}
          {(valuation || rentalValuation) && (
            <div className="grid grid-cols-2 gap-2">
              {/* Acquisto */}
              {valuation ? (
                <div className="bg-primary/5 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Acquisto
                  </div>
                  <p className="text-sm font-bold text-primary leading-tight">
                    {formatCurrency(valuation.valore_min)}<br />
                    {formatCurrency(valuation.valore_max)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(valuation.valore_min_mq)}–{formatCurrency(valuation.valore_max_mq)} /mq
                  </p>
                  {valuation.stato_conservazione && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 mt-1 capitalize">
                      {valuation.stato_conservazione}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-center text-xs text-muted-foreground">
                  N/D
                </div>
              )}

              {/* Affitto */}
              {rentalValuation ? (
                <div className="bg-emerald-500/5 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Home className="h-3 w-3" />
                    Affitto/mese
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                    {formatCurrency(rentalValuation.valore_min)}<br />
                    {formatCurrency(rentalValuation.valore_max)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(rentalValuation.valore_min_mq)}–{formatCurrency(rentalValuation.valore_max_mq)} /mq
                  </p>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-center text-xs text-muted-foreground">
                  N/D
                </div>
              )}
            </div>
          )}

          {/* Fonte + disclaimer */}
          {(valuation || rentalValuation) && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded p-2">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <p>Stime indicative OMI — Agenzia delle Entrate. Non costituisce perizia certificata.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
