'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    setInviteCode(data.group.invite_code)
    setLoading(false)
  }

  if (inviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 shadow-lg text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            그룹이 만들어졌어요!
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            아래 초대 코드를 가족에게 공유하세요
          </p>

          <div
            className="text-3xl font-bold tracking-[0.3em] py-4 px-6 rounded-xl mb-6"
            style={{ background: 'var(--background)', color: 'var(--primary)' }}
          >
            {inviteCode}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(inviteCode)
              alert('초대 코드가 복사되었습니다!')
            }}
            className="w-full py-2.5 rounded-xl text-sm font-medium mb-3"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            코드 복사
          </button>

          <Link
            href="/calendar"
            className="block w-full py-2.5 rounded-xl text-sm font-medium text-white text-center"
            style={{ background: 'var(--primary)' }}
          >
            캘린더로 이동
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Link href="/calendar" className="text-sm mb-6 block" style={{ color: 'var(--muted)' }}>
          ← 돌아가기
        </Link>

        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>새 그룹 만들기</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            가족 그룹을 만들고 초대 코드를 공유하세요
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="예: 우리 가족"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            {loading ? '만드는 중...' : '그룹 만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}
