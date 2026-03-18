'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { translations, type Locale, type TranslationKey } from './translations'

const COOKIE_NAME = 'casa-ai-locale'

interface I18nContextValue {
  locale: Locale
  t: (key: TranslationKey) => string
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'it',
  t: (key) => translations.it[key],
  setLocale: () => {},
})

export function I18nProvider({ children, defaultLocale = 'it' }: { children: ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    // Read from cookie on mount
    const cookie = document.cookie.split('; ').find(r => r.startsWith(`${COOKIE_NAME}=`))
    if (cookie) {
      const val = cookie.split('=')[1] as Locale
      if (val === 'it' || val === 'en') setLocaleState(val)
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    document.cookie = `${COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
    // Update html lang attribute
    document.documentElement.lang = newLocale
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return translations[locale][key] ?? translations.it[key] ?? key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
