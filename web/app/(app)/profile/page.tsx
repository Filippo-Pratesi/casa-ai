import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProfileForm } from '@/components/profile/profile-form'

const ROLE_LABELS: Record<string, string> = {
  group_admin: 'Admin Gruppo',
  admin: 'Admin',
  agent: 'Agente',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('id, name, email, role, phone, address, partita_iva, avatar_url, bio, created_at')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/dashboard')

  const profile = profileData as {
    id: string
    name: string
    email: string
    role: string
    phone: string | null
    address: string | null
    partita_iva: string | null
    avatar_url: string | null
    bio: string | null
    created_at: string
  }

  const joinedDate = new Date(profile.created_at).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="animate-in-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Il mio profilo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ROLE_LABELS[profile.role] ?? profile.role} · Nel team dal {joinedDate}
        </p>
      </div>

      <Card className="animate-in-2">
        <CardHeader>
          <CardTitle>Dati personali</CardTitle>
          <CardDescription>Modifica le tue informazioni personali e professionali</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  )
}
