/**
 * Shared contact type color mappings used across the contacts module.
 * Extracted to avoid duplication between contacts-client and contact detail page.
 */

export const CONTACT_TYPE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  seller: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  renter: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  landlord: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  other: 'bg-muted/30 text-foreground border-border',
}

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente',
  seller: 'Venditore',
  renter: 'Affittuario',
  landlord: 'Proprietario',
  other: 'Altro',
}
