'use client'

import { useI18n } from '@/lib/i18n/context'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const next = locale === 'it' ? 'en' : 'it'

  return (
    <button
      onClick={() => setLocale(next)}
      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title={locale === 'it' ? 'Switch to English' : 'Passa all\'Italiano'}
    >
      <span className={`font-bold ${locale === 'it' ? 'text-foreground' : 'opacity-40'}`}>IT</span>
      <span className="opacity-30">/</span>
      <span className={`font-bold ${locale === 'en' ? 'text-foreground' : 'opacity-40'}`}>EN</span>
    </button>
  )
}
