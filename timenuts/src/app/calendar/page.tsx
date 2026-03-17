'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CalendarView from '@/components/calendar/CalendarView'
import Header from '@/components/ui/Header'
import NotificationBanner from '@/components/ui/NotificationBanner'
import { CalendarEvent, Group, GroupMember, Profile } from '@/types'
import { EventFormData } from '@/components/calendar/EventModal'

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const currentGroup = groups.find(g => g.id === currentGroupId) ?? null

  // 인증 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser({ id: user.id })
      loadProfile(user.id)
      loadGroups()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile(userId: string) {
    const res = await fetch(`/api/groups`) // 프로필은 groups 로드와 함께
    const { data } = await supabase
      .from('tn_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }

  async function loadGroups() {
    const res = await fetch('/api/groups')
    const { groups } = await res.json()
    if (groups?.length > 0) {
      setGroups(groups)
      setCurrentGroupId(groups[0].id)
    }
    setLoading(false)
  }

  // 그룹 변경 시 멤버/일정 로드
  useEffect(() => {
    if (!currentGroupId) return
    loadMembers(currentGroupId)
    loadEvents(currentGroupId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupId])

  async function loadMembers(groupId: string) {
    const res = await fetch(`/api/groups/${groupId}/members`)
    const { members } = await res.json()
    setMembers(members ?? [])
  }

  const loadEvents = useCallback(async (groupId: string) => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 3, 0)
    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]

    const res = await fetch(`/api/events?group_id=${groupId}&from=${fromStr}&to=${toStr}`)
    const { events } = await res.json()
    setEvents(events ?? [])
  }, [])

  async function handleCreateEvent(data: EventFormData) {
    if (!currentGroupId) return
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, group_id: currentGroupId }),
    })
    await loadEvents(currentGroupId)
  }

  async function handleUpdateEvent(id: string, data: EventFormData) {
    await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (currentGroupId) await loadEvents(currentGroupId)
  }

  async function handleDeleteEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    if (currentGroupId) await loadEvents(currentGroupId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="text-3xl mb-2">🗓️</div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Header
        currentGroup={currentGroup}
        profile={profile}
        groups={groups}
        onGroupChange={setCurrentGroupId}
      />

      {/* 오늘 일정 알림 배너 */}
      {events.length > 0 && (
        <NotificationBanner events={events} members={members} />
      )}

      {/* 그룹이 없을 때 */}
      {groups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="text-5xl">👨‍👩‍👧‍👦</div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
            아직 그룹이 없어요
          </h2>
          <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
            가족 그룹을 만들거나 초대 코드로 참여해보세요
          </p>
          <div className="flex gap-3">
            <a
              href="/group/new"
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              그룹 만들기
            </a>
            <a
              href="/group/join"
              className="px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            >
              코드로 참여
            </a>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {user && (
            <CalendarView
              events={events}
              members={members}
              currentUserId={user.id}
              groupId={currentGroupId!}
              onCreateEvent={handleCreateEvent}
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          )}
        </div>
      )}
    </div>
  )
}
