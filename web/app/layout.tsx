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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CasaAI',
  },
  icons: {
    apple: '/apple-touch-icon.png',
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
