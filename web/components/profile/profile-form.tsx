'use client'

import { useState, useRef } from 'react'
import { Camera, Save, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  address: string | null
  partita_iva: string | null
  avatar_url: string | null
  bio: string | null
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [address, setAddress] = useState(profile.address ?? '')
  const [partitaIva, setPartitaIva] = useState(profile.partita_iva ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')

  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setErrorMsg('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore upload')
      setAvatarUrl(data.avatar_url)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore upload immagine')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address, partita_iva: partitaIva, bio }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore salvataggio')
      setSuccessMsg('Profilo aggiornato con successo')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-neutral-100 flex items-center justify-center">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-neutral-500">{initials || <User className="h-8 w-8 text-neutral-400" />}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {uploadingAvatar ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-900">{name || '—'}</p>
          <p className="text-xs text-neutral-500">{profile.email}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="mt-1 text-xs text-neutral-500 hover:text-neutral-800 transition-colors disabled:opacity-50"
          >
            {uploadingAvatar ? 'Caricamento…' : 'Cambia foto'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Mario Rossi"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={profile.email}
            disabled
            className="bg-neutral-50 text-neutral-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefono</Label>
          <Input
            id="phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+39 333 000 0000"
            type="tel"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="partita_iva">Partita IVA</Label>
          <Input
            id="partita_iva"
            value={partitaIva}
            onChange={e => setPartitaIva(e.target.value)}
            placeholder="IT12345678901"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Indirizzo</Label>
        <Input
          id="address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Via Roma 1, 00100 Roma"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Agente immobiliare specializzato in…"
          rows={3}
          className="resize-none"
        />
      </div>

      {successMsg && (
        <p className="text-sm text-green-600 font-medium">{successMsg}</p>
      )}
      {errorMsg && (
        <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
      )}

      <Button type="submit" disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Salvataggio…' : 'Salva modifiche'}
      </Button>
    </form>
  )
}
