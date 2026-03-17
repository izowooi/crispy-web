'use client'

import { useState, useCallback } from 'react'
import { CalendarEvent, GroupMember, ViewMode } from '@/types'
import MonthView from './MonthView'
import TwoWeekView from './TwoWeekView'
import MemberFilter from './MemberFilter'
import EventModal, { EventFormData } from './EventModal'

interface CalendarViewProps {
  events: CalendarEvent[]
  members: GroupMember[]
  currentUserId: string
  groupId: string
  onCreateEvent: (data: EventFormData) => Promise<void>
  onUpdateEvent: (id: string, data: EventFormData) => Promise<void>
  onDeleteEvent: (id: string) => Promise<void>
}

export default function CalendarView({
  events,
  members,
  currentUserId,
  groupId,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('2week')
  const [activeMembers, setActiveMembers] = useState<string[]>([])
  const [baseDate, setBaseDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | undefined>()

  // 월/주 이동
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()

  function goPrev() {
    if (viewMode === 'month') {
      setBaseDate(new Date(year, month - 1, 1))
    } else {
      const d = new Date(baseDate)
      d.setDate(d.getDate() - 14)
      setBaseDate(d)
    }
  }

  function goNext() {
    if (viewMode === 'month') {
      setBaseDate(new Date(year, month + 1, 1))
    } else {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + 14)
      setBaseDate(d)
    }
  }

  function goToday() {
    setBaseDate(new Date())
  }

  function toggleMember(userId: string) {
    setActiveMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  function handleDateClick(dateStr: string) {
    setSelectedEvent(null)
    setSelectedDate(dateStr)
    setModalOpen(true)
  }

  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event)
    setSelectedDate(event.event_date)
    setModalOpen(true)
  }

  const handleSave = useCallback(async (data: EventFormData) => {
    if (selectedEvent) {
      await onUpdateEvent(selectedEvent.id, data)
    } else {
      await onCreateEvent(data)
    }
  }, [selectedEvent, onCreateEvent, onUpdateEvent])

  const handleDelete = useCallback(async (id: string) => {
    await onDeleteEvent(id)
  }, [onDeleteEvent])

  // 제목 표시
  const title = viewMode === 'month'
    ? `${year}년 ${month + 1}월`
    : (() => {
        const d = new Date(baseDate)
        const day = d.getDay()
        d.setDate(d.getDate() - day)
        const start = `${d.getMonth() + 1}/${d.getDate()}`
        d.setDate(d.getDate() + 13)
        const end = `${d.getMonth() + 1}/${d.getDate()}`
        return `${start} - ${end}`
      })()

  return (
    <div className="flex flex-col h-full">
      {/* 상단 네비게이션 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {/* 이전/다음/오늘 */}
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-sm"
            style={{ color: 'var(--muted)' }}
          >
            ◀
          </button>
          <span className="font-semibold text-sm min-w-[120px] text-center" style={{ color: 'var(--foreground)' }}>
            {title}
          </span>
          <button
            onClick={goNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-sm"
            style={{ color: 'var(--muted)' }}
          >
            ▶
          </button>
          <button
            onClick={goToday}
            className="px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            오늘
          </button>
        </div>

        {/* 뷰 전환 */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {(['2week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: viewMode === mode ? 'var(--primary)' : 'var(--surface)',
                color: viewMode === mode ? '#ffffff' : 'var(--muted)',
              }}
            >
              {mode === '2week' ? '2주' : '월'}
            </button>
          ))}
        </div>
      </div>

      {/* 캘린더 본문 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {viewMode === 'month' ? (
          <MonthView
            year={year}
            month={month}
            events={events}
            members={members}
            activeMembers={activeMembers}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        ) : (
          <TwoWeekView
            baseDate={baseDate}
            events={events}
            members={members}
            activeMembers={activeMembers}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {/* 하단 구성원 필터 */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <MemberFilter
          members={members}
          activeMembers={activeMembers}
          onToggle={toggleMember}
          onShowAll={() => setActiveMembers([])}
        />
      </div>

      {/* 일정 모달 */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedEvent(null) }}
        onSave={handleSave}
        onDelete={selectedEvent ? handleDelete : undefined}
        event={selectedEvent}
        defaultDate={selectedDate}
        members={members}
        currentUserId={currentUserId}
      />
    </div>
  )
}
