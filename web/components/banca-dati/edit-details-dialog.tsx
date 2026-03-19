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

interface EditDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any
  onSaved: (updated: unknown) => void
}

export const EditDetailsDialog = React.memo(function EditDetailsDialog({
  open,
  onOpenChange,
  property,
  onSaved,
}: EditDetailsDialogProps) {
  const [editForm, setEditForm] = useState({
    property_type: property.property_type ?? '',
    transaction_type: property.transaction_type ?? '',
    sqm: property.sqm ? String(property.sqm) : '',
    rooms: property.rooms ? String(property.rooms) : '',
    bathrooms: property.bathrooms ? String(property.bathrooms) : '',
    floor: property.floor != null ? String(property.floor) : '',
    total_floors: property.total_floors ? String(property.total_floors) : '',
    condition: property.condition ?? '',
    estimated_value: property.estimated_value ? String(property.estimated_value) : '',
    doorbell: property.doorbell ?? '',
    building_notes: property.building_notes ?? '',
  })
  const [savingDetails, setSavingDetails] = useState(false)

  async function handleSaveDetails() {
    setSavingDetails(true)
    try {
      const payload: Record<string, unknown> = {
        property_type: editForm.property_type || null,
        transaction_type: editForm.transaction_type || null,
        sqm: editForm.sqm ? parseInt(editForm.sqm, 10) : null,
        rooms: editForm.rooms ? parseInt(editForm.rooms, 10) : null,
        bathrooms: editForm.bathrooms ? parseInt(editForm.bathrooms, 10) : null,
        floor: editForm.floor !== '' ? parseInt(editForm.floor, 10) : null,
        total_floors: editForm.total_floors ? parseInt(editForm.total_floors, 10) : null,
        condition: editForm.condition || null,
        estimated_value: editForm.estimated_value ? parseInt(editForm.estimated_value, 10) : null,
        doorbell: editForm.doorbell.trim() || null,
        building_notes: editForm.building_notes.trim() || null,
      }
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error || 'Errore salvataggio')
      }
      const { property: updated } = await res.json()
      toast.success('Dettagli aggiornati')
      onSaved(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSavingDetails(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifica dettagli immobile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo immobile</Label>
              <Select value={editForm.property_type || 'none'} onValueChange={(v) => setEditForm(f => ({ ...f, property_type: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Non specificato —</SelectItem>
                  <SelectItem value="apartment">Appartamento</SelectItem>
                  <SelectItem value="house">Casa</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="commercial">Commerciale</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                  <SelectItem value="garage">Garage</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo operazione</Label>
              <Select value={editForm.transaction_type || 'none'} onValueChange={(v) => setEditForm(f => ({ ...f, transaction_type: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Non specificato —</SelectItem>
                  <SelectItem value="vendita">Vendita</SelectItem>
                  <SelectItem value="affitto">Affitto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Superficie (mq)</Label>
              <Input type="number" min="0" value={editForm.sqm} onChange={(e) => setEditForm(f => ({ ...f, sqm: e.target.value }))} placeholder="Es. 85" />
            </div>
            <div className="space-y-1.5">
              <Label>Locali</Label>
              <Input type="number" min="0" value={editForm.rooms} onChange={(e) => setEditForm(f => ({ ...f, rooms: e.target.value }))} placeholder="Es. 3" />
            </div>
            <div className="space-y-1.5">
              <Label>Bagni</Label>
              <Input type="number" min="0" value={editForm.bathrooms} onChange={(e) => setEditForm(f => ({ ...f, bathrooms: e.target.value }))} placeholder="Es. 1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Piano</Label>
              <Input type="number" value={editForm.floor} onChange={(e) => setEditForm(f => ({ ...f, floor: e.target.value }))} placeholder="Es. 2" />
            </div>
            <div className="space-y-1.5">
              <Label>Piani totali</Label>
              <Input type="number" min="1" value={editForm.total_floors} onChange={(e) => setEditForm(f => ({ ...f, total_floors: e.target.value }))} placeholder="Es. 4" />
            </div>
            <div className="space-y-1.5">
              <Label>Condizioni</Label>
              <Select value={editForm.condition || 'none'} onValueChange={(v) => setEditForm(f => ({ ...f, condition: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— —</SelectItem>
                  <SelectItem value="nuovo">Nuovo</SelectItem>
                  <SelectItem value="ottimo">Ottimo</SelectItem>
                  <SelectItem value="buono">Buono</SelectItem>
                  <SelectItem value="da_ristrutturare">Da ristrutturare</SelectItem>
                  <SelectItem value="in_costruzione">In costruzione</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valutazione (€)</Label>
              <Input type="number" min="0" value={editForm.estimated_value} onChange={(e) => setEditForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="Es. 180000" />
            </div>
            <div className="space-y-1.5">
              <Label>Campanello</Label>
              <Input value={editForm.doorbell} onChange={(e) => setEditForm(f => ({ ...f, doorbell: e.target.value }))} placeholder="Es. Rossi / Int. 4" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note palazzo</Label>
            <Textarea value={editForm.building_notes} onChange={(e) => setEditForm(f => ({ ...f, building_notes: e.target.value }))} rows={2} placeholder="Es. Palazzo anni '60, 4 piani, no ascensore..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={savingDetails}>Annulla</Button>
          <Button onClick={handleSaveDetails} disabled={savingDetails}>
            {savingDetails ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
