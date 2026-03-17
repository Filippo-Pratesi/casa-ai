import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/components/contacts/contact-form'

export default function NewContactPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <Button nativeButton={false} render={<Link href="/contacts" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-neutral-500">Clienti</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuovo cliente</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Aggiungi un acquirente, venditore o affittuario al tuo database clienti.
        </p>
      </div>

      <ContactForm mode="create" />
    </div>
  )
}
