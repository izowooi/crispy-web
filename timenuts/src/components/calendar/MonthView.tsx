'use client'

import { CalendarEvent, GroupMember } from '@/types'
import { getMonthDates, formatDate } from '@/lib/utils'
import EventBlock from './EventBlock'

interface MonthViewProps {
  year: number
  month: number // 0-indexed
  events: CalendarEvent[]
  members: GroupMember[]
  activeMembers: string[]
  onDateClick: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function MonthView({
  year,
  month,
  events,
  members,
  activeMembers,
  onDateClick,
  onEventClick,
}: MonthViewProps) {
  const dates = getMonthDates(year, month)
  const today = formatDate(new Date())

  function getEventsForDate(date: Date): CalendarEvent[] {
    const dateStr = formatDate(date)
    return events.filter(e => {
      if (e.event_date !== dateStr) return false
      if (activeMembers.length === 0) return true
      return activeMembers.includes(e.owner_id)
    })
  }

  function getMemberProfile(ownerId: string) {
    return members.find(m => m.user_id === ownerId)?.profile
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
        {DAYS.map((day, i) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium"
            style={{
              color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--muted)',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
        {dates.map((date, idx) => {
          if (!date) {
            return (
              <div
                key={`empty-${idx}`}
                className="border-r border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
              />
            )
          }

          const dateStr = formatDate(date)
          const isToday = dateStr === today
          const isCurrentMonth = date.getMonth() === month
          const dayEvents = getEventsForDate(date)
          const dayOfWeek = date.getDay()

          return (
            <div
              key={dateStr}
              className="border-r border-b p-1 flex flex-col gap-0.5 cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden"
              style={{
                borderColor: 'var(--border)',
                background: isToday ? '#eef2ff' : undefined,
              }}
              onClick={() => onDateClick(dateStr)}
            >
              {/* 날짜 숫자 */}
              <div className="flex justify-center mb-0.5">
                <span
                  className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium"
                  style={{
                    background: isToday ? 'var(--primary)' : 'transparent',
                    color: isToday
                      ? '#ffffff'
                      : !isCurrentMonth
                      ? 'var(--border)'
                      : dayOfWeek === 0
                      ? '#ef4444'
                      : dayOfWeek === 6
                      ? '#3b82f6'
                      : 'var(--foreground)',
                  }}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* 일정 블록 */}
              {dayEvents.slice(0, 3).map(e => (
                <EventBlock
                  key={e.id}
                  event={e}
                  ownerProfile={getMemberProfile(e.owner_id)}
                  onClick={() => onEventClick(e)}
                />
              ))}
              {dayEvents.length > 3 && (
                <span className="text-xs pl-1" style={{ color: 'var(--muted)' }}>
                  +{dayEvents.length - 3}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
