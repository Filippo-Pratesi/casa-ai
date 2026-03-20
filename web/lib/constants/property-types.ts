export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
  other: 'Altro',
}

export const PROPERTY_TYPE_VALUES = [
  'apartment',
  'house',
  'villa',
  'commercial',
  'land',
  'garage',
  'other',
] as const

export type PropertyTypeValue = typeof PROPERTY_TYPE_VALUES[number]
