'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Group, Profile } from '@/types'

interface HeaderProps {
  currentGroup: Group | null
  profile: Profile | null
  groups: Group[]
  onGroupChange: (groupId: string) => void
}

export default function Header({ currentGroup, profile, groups, onGroupChange }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* 로고 */}
      <Link href="/calendar" className="flex items-center gap-2 font-bold text-lg" style={{ color: 'var(--foreground)' }}>
        <span>🗓️</span>
        <span>TimeNuts</span>
      </Link>

      <div className="flex items-center gap-2">
        {/* 그룹 선택 */}
        {groups.length > 0 && (
          <select
            value={currentGroup?.id ?? ''}
            onChange={e => onGroupChange(e.target.value)}
            className="text-sm px-2 py-1.5 rounded-lg outline-none max-w-[140px] truncate"
            style={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          >
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}

        {/* 그룹 없으면 만들기 버튼 */}
        {groups.length === 0 && (
          <Link
            href="/group/new"
            className="text-sm px-3 py-1.5 rounded-lg font-medium text-white"
            style={{ background: 'var(--primary)' }}
          >
            그룹 만들기
          </Link>
        )}

        {/* + 일정 버튼 (그룹이 있을 때만) */}
        {currentGroup && (
          <Link
            href="/group/join"
            className="text-xs px-2 py-1.5 rounded-lg"
            style={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
            }}
            title="초대 코드로 참여"
          >
            참여
          </Link>
        )}

        {/* 프로필 */}
        <div className="relative group">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
            style={{ background: profile?.color ?? '#7DD3FC' }}
            title={profile?.name ?? '프로필'}
          >
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </button>

          {/* 드롭다운 */}
          <div
            className="absolute right-0 top-10 w-44 rounded-xl shadow-lg border hidden group-hover:block z-20"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{profile?.name}</p>
            </div>
            <Link
              href="/group/new"
              className="flex items-center px-3 py-2 text-sm hover:bg-gray-50"
              style={{ color: 'var(--foreground)' }}
            >
              새 그룹 만들기
            </Link>
            <Link
              href="/group/join"
              className="flex items-center px-3 py-2 text-sm hover:bg-gray-50"
              style={{ color: 'var(--foreground)' }}
            >
              초대 코드로 참여
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-50 rounded-b-xl text-red-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
