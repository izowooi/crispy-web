export interface Profile {
  id: string
  name: string
  avatar_url?: string | null
  color: string
  created_at: string
}

export interface Group {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profile?: Profile
}

export interface CalendarEvent {
  id: string
  group_id: string
  owner_id: string
  title: string
  description?: string | null
  event_date: string // 'YYYY-MM-DD'
  color?: string | null
  created_at: string
  updated_at: string
  owner_profile?: Profile
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  created_at: string
}

export const MEMBER_COLORS = [
  { name: '하늘색', value: '#7DD3FC' },
  { name: '연분홍', value: '#FCA5A5' },
  { name: '연초록', value: '#86EFAC' },
  { name: '연노랑', value: '#FDE047' },
  { name: '연보라', value: '#C4B5FD' },
  { name: '살구색', value: '#FDBA74' },
  { name: '민트색', value: '#6EE7B7' },
  { name: '연주황', value: '#FCD34D' },
] as const

export type ViewMode = '2week' | 'month'
