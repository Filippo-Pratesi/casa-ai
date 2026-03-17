import { ListingForm } from '@/components/listing/listing-form'

export default function NewListingPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuovo annuncio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Inserisci i dati dell&apos;immobile e carica le foto. L&apos;AI genererà tutti i contenuti in pochi secondi.
        </p>
      </div>
      <ListingForm />
    </div>
  )
}
