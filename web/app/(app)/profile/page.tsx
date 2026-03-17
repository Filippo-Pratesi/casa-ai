import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProfileForm } from '@/components/profile/profile-form'
import { getTranslations } from '@/lib/i18n/server'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { t, locale } = await getTranslations()

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

  const dateLocale = locale === 'en' ? 'en-GB' : 'it-IT'
  const joinedDate = new Date(profile.created_at).toLocaleDateString(dateLocale, {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const roleKey = `profile.role.${profile.role}` as Parameters<typeof t>[0]
  const roleLabel = t(roleKey) ?? profile.role

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="animate-in-1">
        <h1 className="text-2xl font-extrabold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {roleLabel} · {t('profile.joinedOn')} {joinedDate}
        </p>
      </div>

      <Card className="animate-in-2">
        <CardHeader>
          <CardTitle>{t('profile.personalData')}</CardTitle>
          <CardDescription>{t('profile.personalDataDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  )
}
