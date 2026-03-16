import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlusSquare, FileText, Clock } from 'lucide-react'
import type { Listing } from '@/lib/supabase/types'

const TONE_LABELS: Record<string, string> = {
  standard: 'Standard',
  luxury: 'Luxury',
  approachable: 'Accessibile',
  investment: 'Investimento',
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
  other: 'Altro',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase
    .from('users')
    .select('role, workspace_id')
    .eq('id', user!.id)
    .single()

  const profile = profileData as { role: string; workspace_id: string } | null
  const isAdmin = profile?.role === 'admin'

  // Agents see their own; admins see all workspace listings
  let listingsQuery = supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (!isAdmin) {
    listingsQuery = listingsQuery.eq('agent_id', user!.id) as typeof listingsQuery
  }

  const { data: listings } = await listingsQuery

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-neutral-500 text-sm">I tuoi ultimi annunci generati</p>
        </div>
        <Button render={<Link href="/listing/new" />}>
          <PlusSquare className="mr-2 h-4 w-4" />
          Nuovo annuncio
        </Button>
      </div>

      {!listings || listings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-neutral-300 mb-4" />
            <CardTitle className="text-lg mb-2">Nessun annuncio ancora</CardTitle>
            <CardDescription className="mb-4">
              Crea il tuo primo annuncio e genera in secondi descrizioni, post social e molto altro.
            </CardDescription>
            <Button render={<Link href="/listing/new" />}>
              <PlusSquare className="mr-2 h-4 w-4" />
              Crea il primo annuncio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {listings.map((listing: Listing) => (
            <Link key={listing.id} href={`/listing/${listing.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{listing.address}</CardTitle>
                      <CardDescription>
                        {TYPE_LABELS[listing.property_type]} · {listing.city}
                        {listing.property_type === 'apartment' && listing.floor != null
                          ? ` · Piano ${listing.floor}`
                          : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{TONE_LABELS[listing.tone]}</Badge>
                      {listing.generated_content ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Generato</Badge>
                      ) : (
                        <Badge variant="outline">Bozza</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <span>€{listing.price.toLocaleString('it-IT')}</span>
                    <span>{listing.sqm} m²</span>
                    <span>{listing.rooms} locali</span>
                    <span className="ml-auto flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(listing.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
