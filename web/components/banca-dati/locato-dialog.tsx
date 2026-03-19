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

interface LocatoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advancing: boolean
  onConfirm: (payload: Record<string, unknown>) => void
}

export const LocatoDialog = React.memo(function LocatoDialog({
  open,
  onOpenChange,
  advancing,
  onConfirm,
}: LocatoDialogProps) {
  const [leaseType, setLeaseType] = useState<string>('4_plus_4')
  const [leaseStart, setLeaseStart] = useState('')
  const [leaseEnd, setLeaseEnd] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [deposit, setDeposit] = useState('')
  const [leaseNotes, setLeaseNotes] = useState('')

  async function handleConfirmLocato() {
    if (!leaseType || !leaseStart || !leaseEnd || !monthlyRent) {
      toast.error('Tipo contratto, date e canone sono obbligatori')
      return
    }
    const rent = parseInt(monthlyRent, 10)
    if (isNaN(rent) || rent <= 0) {
      toast.error('Canone mensile deve essere > 0')
      return
    }
    if (leaseEnd <= leaseStart) {
      toast.error('La data di fine deve essere successiva alla data di inizio')
      return
    }
    onOpenChange(false)
    onConfirm({
      lease_type: leaseType,
      lease_start_date: leaseStart,
      lease_end_date: leaseEnd,
      monthly_rent: rent,
      deposit: deposit ? parseInt(deposit, 10) : null,
      lease_notes: leaseNotes || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registra Locazione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Tipo contratto *</Label>
            <Select value={leaseType} onValueChange={(v) => setLeaseType(v ?? '4_plus_4')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4_plus_4">4+4</SelectItem>
                <SelectItem value="3_plus_2">3+2</SelectItem>
                <SelectItem value="transitorio">Transitorio</SelectItem>
                <SelectItem value="foresteria">Foresteria</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data inizio *</Label>
              <Input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data fine *</Label>
              <Input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Canone mensile (€) *</Label>
              <Input
                type="number"
                min="0"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="Es. 800"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deposito cauzionale (€)</Label>
              <Input
                type="number"
                min="0"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="Es. 2400"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note locazione</Label>
            <Textarea
              value={leaseNotes}
              onChange={(e) => setLeaseNotes(e.target.value)}
              placeholder="Condizioni particolari, clausole..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleConfirmLocato} disabled={advancing}>
            {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Registra locazione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
