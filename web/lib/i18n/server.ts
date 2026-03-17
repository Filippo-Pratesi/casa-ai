import { cookies } from 'next/headers'
import { translations, type Locale } from './translations'

export async function getTranslations() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('casa-ai-locale')?.value
  const locale: Locale = raw === 'en' ? 'en' : 'it'
  const t = (key: string): string =>
    (translations[locale] as Record<string, string>)[key] ??
    (translations.it as Record<string, string>)[key] ??
    key
  return { t, locale }
}
