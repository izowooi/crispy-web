'use client'

import { CalendarEvent, GroupMember } from '@/types'
import { getTwoWeekDates, formatDate } from '@/lib/utils'
import EventBlock from './EventBlock'

interface TwoWeekViewProps {
  baseDate: Date
  events: CalendarEvent[]
  members: GroupMember[]
  activeMembers: string[]
  onDateClick: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function TwoWeekView({
  baseDate,
  events,
  members,
  activeMembers,
  onDateClick,
  onEventClick,
}: TwoWeekViewProps) {
  const dates = getTwoWeekDates(baseDate)
  const today = formatDate(new Date())

  const week1 = dates.slice(0, 7)
  const week2 = dates.slice(7, 14)

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

  function renderWeek(weekDates: Date[]) {
    return (
      <div className="grid grid-cols-7 flex-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {weekDates.map(date => {
          const dateStr = formatDate(date)
          const isToday = dateStr === today
          const dayEvents = getEventsForDate(date)
          const dayOfWeek = date.getDay()

          return (
            <div
              key={dateStr}
              className="border-r p-2 flex flex-col gap-1 cursor-pointer hover:bg-gray-50 transition-colors"
              style={{
                borderColor: 'var(--border)',
                background: isToday ? '#eef2ff' : undefined,
                minHeight: '120px',
              }}
              onClick={() => onDateClick(dateStr)}
            >
              {/* 날짜 */}
              <div className="flex flex-col items-center mb-1">
                <span
                  className="text-xs"
                  style={{
                    color: dayOfWeek === 0 ? '#ef4444' : dayOfWeek === 6 ? '#3b82f6' : 'var(--muted)',
                  }}
                >
                  {DAYS[dayOfWeek]}
                </span>
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    background: isToday ? 'var(--primary)' : 'transparent',
                    color: isToday
                      ? '#ffffff'
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

              {/* 일정 */}
              <div className="flex flex-col gap-0.5">
                {dayEvents.map(e => (
                  <EventBlock
                    key={e.id}
                    event={e}
                    ownerProfile={getMemberProfile(e.owner_id)}
                    onClick={() => onEventClick(e)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
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

      {/* 주 1 */}
      {renderWeek(week1)}

      {/* 주 구분선 레이블 */}
      <div className="px-3 py-1.5 text-xs font-medium" style={{ color: 'var(--muted)', background: 'var(--background)' }}>
        다음 주
      </div>

      {/* 주 2 */}
      {renderWeek(week2)}
    </div>
  )
}
