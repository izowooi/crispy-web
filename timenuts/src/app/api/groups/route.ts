import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils'

// GET /api/groups - 내가 속한 그룹 목록
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tn_group_members')
    .select('group_id, tn_groups(*)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const groups = data?.map((row: Record<string, unknown>) => row.tn_groups) ?? []
  return NextResponse.json({ groups })
}

// POST /api/groups - 새 그룹 생성
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: '그룹 이름을 입력해주세요' }, { status: 400 })

  const invite_code = generateInviteCode()

  const { data: group, error: groupError } = await supabase
    .from('tn_groups')
    .insert({ name: name.trim(), invite_code, owner_id: user.id })
    .select()
    .single()

  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 })

  // 생성자를 admin으로 멤버 추가
  await supabase
    .from('tn_group_members')
    .insert({ group_id: group.id, user_id: user.id, role: 'admin' })

  return NextResponse.json({ group }, { status: 201 })
}
