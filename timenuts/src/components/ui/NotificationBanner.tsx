'use client'

import { useState, useEffect } from 'react'
import { CalendarEvent, GroupMember } from '@/types'
import { formatDate } from '@/lib/utils'

interface NotificationBannerProps {
  events: CalendarEvent[]
  members: GroupMember[]
}

export default function NotificationBanner({ events, members }: NotificationBannerProps) {
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const today = formatDate(new Date())
    const todays = events.filter(e => e.event_date === today)
    setTodayEvents(todays)
  }, [events])

  const visible = todayEvents.filter(e => !dismissed.has(e.id))
  if (visible.length === 0) return null

  function getMemberColor(ownerId: string) {
    return members.find(m => m.user_id === ownerId)?.profile?.color ?? '#7DD3FC'
  }

  return (
    <div className="px-4 py-2 space-y-1">
      {visible.map(event => (
        <div
          key={event.id}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{
            background: (event.color ?? getMemberColor(event.owner_id)) + '22',
            borderLeft: `3px solid ${event.color ?? getMemberColor(event.owner_id)}`,
          }}
        >
          <span className="text-xs">📅</span>
          <span className="flex-1 font-medium" style={{ color: 'var(--foreground)' }}>
            오늘 · {event.title}
          </span>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, event.id]))}
            className="text-xs px-1"
            style={{ color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
