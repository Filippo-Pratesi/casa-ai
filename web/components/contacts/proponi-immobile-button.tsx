'use client'

import { useState } from 'react'
import { Home } from 'lucide-react'
import { ProponiImmobileDialog } from './proponi-immobile-dialog'

interface ProponiImmobileButtonProps {
  contactId: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
}

export function ProponiImmobileButton({
  contactId,
  contactName,
  contactEmail,
  contactPhone,
}: ProponiImmobileButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[oklch(0.57_0.20_33)] text-white px-4 py-2 text-sm font-semibold hover:bg-[oklch(0.52_0.20_33)] transition-colors"
      >
        <Home className="h-4 w-4" />
        Proponi un immobile
      </button>

      <ProponiImmobileDialog
        open={open}
        onOpenChange={setOpen}
        contactId={contactId}
        contactName={contactName}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
      />
    </>
  )
}
