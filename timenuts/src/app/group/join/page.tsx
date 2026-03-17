'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinGroupPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (code.trim().length < 6) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push('/calendar')
    router.refresh()
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
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>그룹 참여</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            가족에게 받은 6자리 초대 코드를 입력하세요
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
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABCDEF"
            className="w-full px-3 py-3 rounded-xl text-center text-2xl font-bold tracking-[0.3em] outline-none uppercase"
            style={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
            maxLength={6}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button
            onClick={handleJoin}
            disabled={code.trim().length < 6 || loading}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            {loading ? '참여 중...' : '그룹 참여'}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>새 그룹을 만들고 싶으신가요?</p>
          <Link
            href="/group/new"
            className="text-sm font-medium mt-1 block"
            style={{ color: 'var(--primary)' }}
          >
            그룹 만들기
          </Link>
        </div>
      </div>
    </div>
  )
}
