'use client'

import React, { useState } from 'react'
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

interface IncaricoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advancing: boolean
  onConfirm: (payload: Record<string, unknown>) => void
}

export const IncaricoDialog = React.memo(function IncaricoDialog({
  open,
  onOpenChange,
  advancing,
  onConfirm,
}: IncaricoDialogProps) {
  const [incaricoType, setIncaricoType] = useState<string>('esclusivo')
  const [incaricoDate, setIncaricoDate] = useState('')
  const [incaricoExpiry, setIncaricoExpiry] = useState('')
  const [incaricoCommission, setIncaricoCommission] = useState('')
  const [incaricoNotes, setIncaricoNotes] = useState('')

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Avvia Incarico</DialogTitle>
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
              max="10"
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
            Conferma incarico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
