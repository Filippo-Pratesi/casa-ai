import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

type NoteRow = {
  id: string
  content: string
  sentiment: string | null
  created_at: string
  agent: { name: string } | null
}

function toNoteResponse(n: NoteRow) {
  return {
    id: n.id,
    content: n.content,
    sentiment: n.sentiment ?? null,
    created_at: n.created_at,
    agent_name: n.agent?.name ?? null,
  }
}

// GET /api/listing/[id]/notes
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Verify listing belongs to workspace
  const { data: listing } = await admin
    .from('listings')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()
  if (!listing) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('listing_notes')
    .select('id, content, sentiment, created_at, agent:users!listing_notes_agent_id_fkey(name)')
    .eq('listing_id', id)
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ notes: ((data ?? []) as NoteRow[]).map(toNoteResponse) })
}

// POST /api/listing/[id]/notes
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Verify listing belongs to workspace
  const { data: listing } = await admin
    .from('listings')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()
  if (!listing) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })

  let body: { content?: string; sentiment?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo non valido' }, { status: 400 })
  }

  const content = body.content?.trim()
  if (!content) return NextResponse.json({ error: 'Contenuto obbligatorio' }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: 'Nota troppo lunga (max 2000 caratteri)' }, { status: 400 })

  const validSentiments = ['positive', 'neutral', 'negative']
  const sentiment = typeof body.sentiment === 'string' && validSentiments.includes(body.sentiment)
    ? body.sentiment
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('listing_notes')
    .insert({ listing_id: id, workspace_id: profile.workspace_id, agent_id: user.id, content, sentiment })
    .select('id, content, sentiment, created_at, agent:users!listing_notes_agent_id_fkey(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(toNoteResponse(data as NoteRow), { status: 201 })
}

// DELETE /api/listing/[id]/notes/[noteId] — not implemented here (can add later)
