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

  const showOmiCard = !!(valuation || rentalValuation || loadingValuation || valuationError)
  const bothCards = showRiskCard && showOmiCard

  return (
    <div className={bothCards ? 'grid grid-cols-2 gap-3 items-stretch' : 'space-y-4'}>
      {/* Card Rischi Territoriali */}
      {showRiskCard && (
        <Card className="p-4 space-y-2.5">
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
              className="h-6 text-xs px-1.5"
            >
              {loadingCadastral ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>

          {loadingCadastral && !cadastralData && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Recupero dati...
            </div>
          )}

          {cadastralData && (
            <div className="space-y-2">
              {hasRisks && (
                <div className="flex flex-col gap-1.5">
                  {riskBadge(cadastralData.rischio_idrogeologico, 'Idrogeologico')}
                  {riskBadge(cadastralData.rischio_sismico, 'Sismico')}
                </div>
              )}
              {hasPotenziale && (
                <div className="pt-1.5 border-t">
                  <p className="text-[10px] text-muted-foreground">Potenziale zona</p>
                  <p className="text-xs font-medium">{Math.round(cadastralData.indice_potenziale_immobiliare!)}/100</p>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Info className="h-2.5 w-2.5 shrink-0" />
                Dati ISPRA zonali
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Card Stime OMI */}
      {showOmiCard && (
        <Card className="p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-semibold text-sm leading-tight">
              {(valuation ?? rentalValuation)
                ? (() => {
                    const sem = (valuation ?? rentalValuation)!.semestre
                    const parts = sem.split('_')
                    return parts.length === 2
                      ? `Stime OMI ${parts[1]}° sem. ${parts[0]}`
                      : `Stime OMI — ${sem}`
                  })()
                : 'Stime OMI'}
            </h3>
          </div>

          {loadingValuation && !valuation && !rentalValuation && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Calcolo in corso...
            </div>
          )}

          {valuationError && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {valuationError}
            </div>
          )}

          {(valuation || rentalValuation) && (
            <div className="space-y-1.5">
              {valuation && (
                <div className="flex items-center justify-between rounded-md bg-primary/5 px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    <TrendingUp className="h-2.5 w-2.5" />
                    Acquisto
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-primary">
                      {formatCurrency(valuation.valore_min)} – {formatCurrency(valuation.valore_max)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(valuation.valore_min_mq)}–{formatCurrency(valuation.valore_max_mq)} /mq
                    </p>
                  </div>
                </div>
              )}
              {rentalValuation && (
                <div className="flex items-center justify-between rounded-md bg-emerald-500/5 px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    <Home className="h-2.5 w-2.5" />
                    Affitto/mese
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(rentalValuation.valore_min)} – {formatCurrency(rentalValuation.valore_max)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(rentalValuation.valore_min_mq)}–{formatCurrency(rentalValuation.valore_max_mq)} /mq
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Info className="h-2.5 w-2.5 shrink-0" />
                Dati OMI — Agenzia delle Entrate
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
