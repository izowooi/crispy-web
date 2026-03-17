import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/events/[id] - 일정 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, event_date, color, owner_id } = body

  const { data: event, error } = await supabase
    .from('tn_events')
    .update({
      title: title?.trim(),
      description: description?.trim() ?? null,
      event_date,
      color: color ?? null,
      owner_id,
    })
    .eq('id', id)
    .eq('owner_id', user.id) // 작성자만 수정 가능
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!event) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  return NextResponse.json({ event })
}

// DELETE /api/events/[id] - 일정 삭제
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('tn_events')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id) // 작성자만 삭제 가능

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
