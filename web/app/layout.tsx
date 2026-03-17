import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { I18nProvider } from '@/lib/i18n/context'
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${plusJakarta.variable} antialiased`}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
