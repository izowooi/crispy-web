import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/groups/[id]/members - 그룹 멤버 목록 (프로필 포함)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tn_group_members')
    .select('*, tn_profiles(*)')
    .eq('group_id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const members = data?.map((row: Record<string, unknown>) => ({
    ...row,
    profile: row.tn_profiles,
  })) ?? []

  return NextResponse.json({ members })
}
