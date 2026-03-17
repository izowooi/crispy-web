'use client'

import { useState, useEffect } from 'react'
import { CalendarEvent, GroupMember, MEMBER_COLORS } from '@/types'
import { formatDate } from '@/lib/utils'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: EventFormData) => Promise<void>
  onDelete?: (eventId: string) => Promise<void>
  event?: CalendarEvent | null
  defaultDate?: string
  members: GroupMember[]
  currentUserId: string
}

export interface EventFormData {
  title: string
  description: string
  event_date: string
  color: string | null
  owner_id: string
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  defaultDate,
  members,
  currentUserId,
}: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState(defaultDate ?? formatDate(new Date()))
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description ?? '')
      setEventDate(event.event_date)
      setSelectedColor(event.color ?? null)
      setOwnerId(event.owner_id)
    } else {
      setTitle('')
      setDescription('')
      setEventDate(defaultDate ?? formatDate(new Date()))
      setSelectedColor(null)
      setOwnerId(currentUserId)
    }
  }, [event, defaultDate, currentUserId])

  if (!isOpen) return null

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), description, event_date: eventDate, color: selectedColor, owner_id: ownerId })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!event || !onDelete) return
    if (!confirm('일정을 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await onDelete(event.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const isOwner = !event || event.owner_id === currentUserId

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 모달 */}
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--surface)' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            {event ? '일정 상세' : '새 일정'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            style={{ color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              readOnly={!isOwner}
            />
          </div>

          {/* 날짜 */}
          <div>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              readOnly={!isOwner}
            />
          </div>

          {/* 담당 구성원 */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>
              담당
            </label>
            <select
              value={ownerId}
              onChange={e => setOwnerId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              disabled={!isOwner}
            >
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.name ?? '알 수 없음'}
                  {m.user_id === currentUserId ? ' (나)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 색상 선택 */}
          {isOwner && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>
                색상 (기본: 담당자 색상)
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedColor(null)}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs"
                  style={{
                    borderColor: selectedColor === null ? '#6366f1' : 'var(--border)',
                    background: 'var(--background)',
                    color: 'var(--muted)',
                  }}
                  title="기본"
                >
                  ✓
                </button>
                {MEMBER_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedColor(c.value)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      borderColor: selectedColor === c.value ? '#1e293b' : 'transparent',
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 메모 */}
          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="메모 (선택)"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              readOnly={!isOwner}
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 mt-5">
          {event && isOwner && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ color: 'var(--muted)', background: 'var(--background)', border: '1px solid var(--border)' }}
          >
            취소
          </button>
          {isOwner && (
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
