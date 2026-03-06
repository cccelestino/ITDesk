import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAgent = ['agent','admin'].includes(profile?.role || '')
  const { searchParams } = new URL(req.url)

  let q = supabase.from('tickets')
    .select('*, created_by_profile:profiles!tickets_created_by_fkey(full_name,email), assigned_to_profile:profiles!tickets_assigned_to_fkey(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 49)

  if (!isAgent) q = q.eq('created_by', user.id)
  const status   = searchParams.get('status')
  const priority = searchParams.get('priority')
  if (status)   q = q.eq('status', status)
  if (priority) q = q.eq('priority', priority)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tickets: data, total: count })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, category, priority, device_info, location } = body
  if (!title || !description) return NextResponse.json({ error: 'title & description required' }, { status: 400 })

  const { data, error } = await supabase.from('tickets').insert({
    title, description,
    category:    category || 'other',
    priority:    priority || 'medium',
    device_info: device_info || null,
    location:    location || null,
    created_by:  user.id,
    status:      'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify all agents
  const { data: agents } = await supabase.from('profiles').select('id').in('role',['agent','admin'])
  if (agents?.length) {
    await supabase.from('notifications').insert(
      agents.map(a => ({
        user_id: a.id, ticket_id: data.id, kind: 'info',
        title: `Nuevo ticket #${data.ticket_number}`,
        body: title,
      }))
    )
  }

  return NextResponse.json({ ticket: data }, { status: 201 })
}
