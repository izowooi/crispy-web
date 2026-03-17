import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/groups/join - 초대 코드로 그룹 참여
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await request.json()
  if (!invite_code?.trim()) return NextResponse.json({ error: '초대 코드를 입력해주세요' }, { status: 400 })

  // 그룹 찾기
  const { data: group, error: groupError } = await supabase
    .from('tn_groups')
    .select('*')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: '유효하지 않은 초대 코드입니다' }, { status: 404 })
  }

  // 이미 멤버인지 확인
  const { data: existing } = await supabase
    .from('tn_group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ group, message: '이미 참여한 그룹입니다' })
  }

  // 멤버 추가
  const { error: memberError } = await supabase
    .from('tn_group_members')
    .insert({ group_id: group.id, user_id: user.id, role: 'member' })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  return NextResponse.json({ group }, { status: 201 })
}
