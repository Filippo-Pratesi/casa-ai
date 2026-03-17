import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { TodosClient } from '@/components/todos/todos-client'

export default async function TodosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile) redirect('/dashboard')

  // Fetch todos visible to this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: todosData } = await (admin as any)
    .from('todos')
    .select('*')
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Fetch workspace members for assignment
  const { data: membersData } = await admin
    .from('users')
    .select('id, name')
    .eq('workspace_id', profile.workspace_id)
    .order('name')

  const members = (membersData ?? []) as { id: string; name: string }[]
  const memberMap: Record<string, string> = Object.fromEntries(members.map(m => [m.id, m.name]))

  return (
    <TodosClient
      initialTodos={todosData ?? []}
      currentUserId={user.id}
      members={members}
      memberMap={memberMap}
    />
  )
}
