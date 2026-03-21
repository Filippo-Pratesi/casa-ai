'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface IncaricoInitialValues {
  incarico_type?: string | null
  incarico_date?: string | null
  incarico_expiry?: string | null
  incarico_commission_percent?: number | null
  incarico_notes?: string | null
}

interface IncaricoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advancing: boolean
  onConfirm: (payload: Record<string, unknown>) => void
  /** 'crea' (default) shows "Avvia Incarico"; 'rinnova' shows "Rinnova Incarico" */
  mode?: 'crea' | 'rinnova'
  /** Pre-fill fields when renewing */
  initialValues?: IncaricoInitialValues
}

export const IncaricoDialog = React.memo(function IncaricoDialog({
  open,
  onOpenChange,
  advancing,
  onConfirm,
  mode = 'crea',
  initialValues,
}: IncaricoDialogProps) {
  const [incaricoType, setIncaricoType] = useState<string>('esclusivo')
  const [incaricoDate, setIncaricoDate] = useState('')
  const [incaricoExpiry, setIncaricoExpiry] = useState('')
  const [incaricoCommission, setIncaricoCommission] = useState('')
  const [incaricoNotes, setIncaricoNotes] = useState('')

  // Pre-populate when renewing
  useEffect(() => {
    if (open && mode === 'rinnova' && initialValues) {
      setIncaricoType(initialValues.incarico_type ?? 'esclusivo')
      setIncaricoDate(initialValues.incarico_date ?? '')
      setIncaricoExpiry(initialValues.incarico_expiry ?? '')
      setIncaricoCommission(initialValues.incarico_commission_percent != null ? String(initialValues.incarico_commission_percent) : '')
      setIncaricoNotes(initialValues.incarico_notes ?? '')
    } else if (open && mode === 'crea') {
      // Reset for new incarico
      setIncaricoType('esclusivo')
      setIncaricoDate('')
      setIncaricoExpiry('')
      setIncaricoCommission('')
      setIncaricoNotes('')
    }
  }, [open, mode, initialValues])

  async function handleConfirmIncarico() {
    if (!incaricoDate || !incaricoCommission) {
      toast.error('Data e provvigione sono obbligatorie')
      return
    }
    const commission = parseFloat(incaricoCommission)
    if (isNaN(commission) || commission <= 0 || commission > 20) {
      toast.error('Provvigione deve essere tra 0% e 20%')
      return
    }
    onOpenChange(false)
    onConfirm({
      incarico_type: incaricoType,
      incarico_date: incaricoDate,
      incarico_expiry: incaricoExpiry || null,
      incarico_commission_percent: commission,
      incarico_notes: incaricoNotes || null,
    })
  }

  const title = mode === 'rinnova' ? 'Rinnova Incarico' : 'Avvia Incarico'
  const confirmLabel = mode === 'rinnova' ? 'Rinnova incarico' : 'Conferma incarico'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Tipo incarico *</Label>
            <Select value={incaricoType} onValueChange={(v) => setIncaricoType(v ?? 'esclusivo')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="esclusivo">Esclusivo</SelectItem>
                <SelectItem value="non_esclusivo">Non esclusivo</SelectItem>
                <SelectItem value="mediazione">Mediazione</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data firma *</Label>
              <Input type="date" value={incaricoDate} onChange={(e) => setIncaricoDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Scadenza incarico</Label>
              <Input type="date" value={incaricoExpiry} onChange={(e) => setIncaricoExpiry(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Provvigione (%) *</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={incaricoCommission}
              onChange={(e) => setIncaricoCommission(e.target.value)}
              placeholder="Es. 3"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note incarico</Label>
            <Textarea
              value={incaricoNotes}
              onChange={(e) => setIncaricoNotes(e.target.value)}
              placeholder="Condizioni particolari, accordi..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleConfirmIncarico} disabled={advancing}>
            {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
