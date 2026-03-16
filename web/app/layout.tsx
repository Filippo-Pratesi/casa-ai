import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CasaAI — Assistente AI per agenti immobiliari',
  description: 'Genera annunci, post social e contenuti di marketing in secondi.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
