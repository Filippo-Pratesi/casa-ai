'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Building2, User, MapPin } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

interface Property {
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

interface PropertySelectorProps {
  workspaceId: string
  selectedPropertyId?: string
  onPropertySelect: (propertyId: string | null) => void
  disabled?: boolean
}

export function PropertySelector({
  workspaceId,
  selectedPropertyId,
  onPropertySelect,
  disabled = false,
}: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select(`
            id,
            address,
            city,
            property_type,
            stage,
            owner_contact:owner_contact_id (
              id,
              name,
              email,
              phone
            )
          `)
          .eq('workspace_id', workspaceId)
          .order('address', { ascending: true })

        if (error) throw error

        const formattedProperties = (data || []).map((p: any) => ({
          id: p.id,
          address: p.address,
          city: p.city,
          property_type: p.property_type,
          stage: p.stage,
          owner_contact: p.owner_contact,
        }))

        setProperties(formattedProperties)

        // Select the property if already linked
        if (selectedPropertyId) {
          const selected = formattedProperties.find((p) => p.id === selectedPropertyId)
          if (selected) setSelectedProperty(selected)
        }
      } catch (error) {
        console.error('Error fetching properties:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [workspaceId, selectedPropertyId, supabase])

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    setSelectedProperty(property || null)
    onPropertySelect(propertyId || null)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="property">Collegamento Banca Dati</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Seleziona la proprietà corrispondente dalla banca dati
        </p>
        <Select
          value={selectedPropertyId || ''}
          onValueChange={handlePropertyChange}
          disabled={disabled || loading}
        >
          <SelectTrigger id="property">
            <SelectValue placeholder={loading ? 'Caricamento...' : 'Seleziona una proprietà'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nessun collegamento</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.address}, {property.city} ({property.stage})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Display selected property details */}
      {selectedProperty && (
        <Card className="p-4 bg-muted/50 border-muted">
          <div className="space-y-3">
            {/* Property info */}
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{selectedProperty.address}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{selectedProperty.city}</span>
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {selectedProperty.property_type}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner/Vendor contact */}
            {selectedProperty.owner_contact && (
              <div className="flex items-start gap-3 pt-2 border-t">
                <User className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Proprietario
                  </p>
                  <p className="font-medium text-sm">{selectedProperty.owner_contact.name}</p>
                  {selectedProperty.owner_contact.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedProperty.owner_contact.email}
                    </p>
                  )}
                  {selectedProperty.owner_contact.phone && (
                    <p className="text-xs text-muted-foreground">{selectedProperty.owner_contact.phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
