'use client'

import Link from 'next/link'
import { Building2, User, MapPin, Mail, Phone, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

interface LinkedPropertyCardProps {
  property: {
    id: string
    address: string
    city: string
    property_type: string
    stage: string
    owner_contact: {
      id: string
      name: string
      email: string | null
      phone: string | null
    } | null
  }
}

export function LinkedPropertyCard({ property }: LinkedPropertyCardProps) {
  const stageLabels: Record<string, string> = {
    sconosciuto: 'Sconosciuto',
    ignoto: 'Non contattato',
    conosciuto: 'Conosciuto',
    incarico: 'Incarico',
    venduto: 'Venduto',
    locato: 'Locato',
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Building2 className="h-5 w-5 mt-1 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-tight">{property.address}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{property.city}</span>
                <span className="text-xs bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded">
                  {stageLabels[property.stage] || property.stage}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Visualizza in Banca Dati"
            render={<Link href={`/banca-dati/${property.id}`} />}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {/* Owner/Vendor contact */}
        {property.owner_contact && (
          <div className="flex items-start gap-3 pt-3 border-t border-blue-200 dark:border-blue-800">
            <User className="h-4 w-4 mt-1 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                Proprietario
              </p>
              <p className="font-medium text-sm">{property.owner_contact.name}</p>
              <div className="space-y-1 mt-2">
                {property.owner_contact.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 justify-start text-xs text-muted-foreground hover:text-foreground"
                    render={<a href={`mailto:${property.owner_contact.email}`} />}
                  >
                    <Mail className="h-3.5 w-3.5 mr-2" />
                    {property.owner_contact.email}
                  </Button>
                )}
                {property.owner_contact.phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 justify-start text-xs text-muted-foreground hover:text-foreground"
                    render={<a href={`tel:${property.owner_contact.phone}`} />}
                  >
                    <Phone className="h-3.5 w-3.5 mr-2" />
                    {property.owner_contact.phone}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
