import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { ListingEditForm } from '@/components/listing/listing-edit-form'
import type { Listing } from '@/lib/supabase/types'

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const listing = data as Listing & {
    condition: string | null
    foglio: string | null
    particella: string | null
    subalterno: string | null
    categoria_catastale: string | null
    rendita_catastale: number | null
    floor_plan_url: string | null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <Link
          href={`/listing/${id}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all&apos;annuncio
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Modifica annuncio</h1>
        <p className="text-muted-foreground text-sm mt-1">{listing.address}, {listing.city}</p>
      </div>
      <ListingEditForm
        listingId={id}
        initial={{
          property_type: listing.property_type,
          floor: listing.floor ?? null,
          total_floors: listing.total_floors ?? null,
          address: listing.address,
          city: listing.city,
          neighborhood: listing.neighborhood ?? null,
          price: listing.price,
          sqm: listing.sqm,
          rooms: listing.rooms,
          bathrooms: listing.bathrooms,
          features: (listing.features ?? []) as string[],
          notes: listing.notes ?? null,
          tone: listing.tone,
          condition: listing.condition,
          foglio: listing.foglio,
          particella: listing.particella,
          subalterno: listing.subalterno,
          categoria_catastale: listing.categoria_catastale,
          rendita_catastale: listing.rendita_catastale,
          photos_urls: (listing.photos_urls ?? []) as string[],
        }}
      />
    </div>
  )
}
