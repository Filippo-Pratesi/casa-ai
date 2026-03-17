'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MailCheck } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [officeName, setOfficeName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // 1. Create auth user — emailRedirectTo points to our confirm route
    const emailRedirectTo = `${window.location.origin}/auth/confirm`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, office_name: officeName },
        emailRedirectTo,
      },
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Errore durante la registrazione.')
      setLoading(false)
      return
    }

    // 2. Create workspace + user record via API (uses service role — works before email confirmation)
    const res = await fetch('/api/workspace/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: officeName, userName: name, userId: authData.user.id, email }),
    })

    if (!res.ok) {
      setError('Errore nella creazione del workspace. Riprova.')
      setLoading(false)
      return
    }

    // Registration complete — now wait for email confirmation
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <MailCheck className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Controlla la tua email</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Abbiamo inviato un link di conferma a <strong>{email}</strong>.
              Clicca il link per attivare il tuo account e accedere.
            </p>
          </div>
          <p className="text-xs text-neutral-400">
            Non trovi l&apos;email? Controlla la cartella spam.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea account</CardTitle>
        <CardDescription>Inizia la prova gratuita di 30 giorni</CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="name">Nome e cognome</Label>
            <Input
              id="name"
              placeholder="Mario Rossi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="office">Nome agenzia / filiale</Label>
            <Input
              id="office"
              placeholder="Agenzia Roma Centro"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="mario@agenzia.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Almeno 8 caratteri"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creazione account...' : 'Crea account gratuito'}
          </Button>
          <p className="text-sm text-neutral-500 text-center">
            Hai già un account?{' '}
            <Link href="/login" className="text-neutral-900 font-medium hover:underline">
              Accedi
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
