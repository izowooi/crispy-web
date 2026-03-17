'use client'

import { GroupMember } from '@/types'

interface MemberFilterProps {
  members: GroupMember[]
  activeMembers: string[] // user_id 배열, 비어있으면 전체
  onToggle: (userId: string) => void
  onShowAll: () => void
}

export default function MemberFilter({ members, activeMembers, onToggle, onShowAll }: MemberFilterProps) {
  const isAll = activeMembers.length === 0

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onShowAll}
        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        style={{
          background: isAll ? 'var(--primary)' : 'var(--background)',
          color: isAll ? '#ffffff' : 'var(--muted)',
          border: `1px solid ${isAll ? 'var(--primary)' : 'var(--border)'}`,
        }}
      >
        전체
      </button>
      {members.map(m => {
        const color = m.profile?.color ?? '#7DD3FC'
        const isActive = activeMembers.includes(m.user_id)
        return (
          <button
            key={m.user_id}
            onClick={() => onToggle(m.user_id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: isActive ? color + '33' : 'var(--background)',
              color: isActive ? '#1e293b' : 'var(--muted)',
              border: `1px solid ${isActive ? color : 'var(--border)'}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: color }}
            />
            {m.profile?.name ?? '?'}
          </button>
        )
      })}
    </div>
  )
}
