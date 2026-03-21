import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { I18nProvider } from '@/lib/i18n/context'
import { Providers } from '@/components/providers'
import { PWARegister } from '@/components/pwa-register'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CasaAI — Assistente AI per agenti immobiliari',
  description: 'Genera annunci, post social e contenuti di marketing in secondi.',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CasaAI',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${plusJakarta.variable} antialiased`}>
        <Providers>
          <I18nProvider>
            {children}
          </I18nProvider>
        </Providers>
        <PWARegister />
      </body>
    </html>
  )
}
