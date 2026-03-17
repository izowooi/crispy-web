import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/events?group_id=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('group_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!groupId) return NextResponse.json({ error: 'group_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabase
    .from('tn_events')
    .select('*, tn_profiles!tn_events_owner_id_fkey(*)')
    .eq('group_id', groupId)
    .order('event_date', { ascending: true })

  if (from) query = query.gte('event_date', from)
  if (to) query = query.lte('event_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const events = data?.map((row: Record<string, unknown>) => ({
    ...row,
    owner_profile: row['tn_profiles'],
  })) ?? []

  return NextResponse.json({ events })
}

// POST /api/events - 일정 생성
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { group_id, title, description, event_date, color, owner_id } = body

  if (!group_id || !title?.trim() || !event_date) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
  }

  const { data: event, error } = await supabase
    .from('tn_events')
    .insert({
      group_id,
      owner_id: owner_id ?? user.id,
      title: title.trim(),
      description: description?.trim() ?? null,
      event_date,
      color: color ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ event }, { status: 201 })
}
