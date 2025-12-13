'use client'

import { useState, useEffect } from 'react'
import { AppDrawerProps } from './types'
import FloatingButton from './FloatingButton'
import AppCard from './AppCard'

export default function AppDrawer({
  apps,
  position = 'left',
  defaultOpen = false
}: AppDrawerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // ESC 키 이벤트 리스너
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  // body 스크롤 잠금
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleAppClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* Floating Button */}
      <FloatingButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        position="right"
      />

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-labelledby="drawer-title"
        aria-hidden={!isOpen}
        className={`
          fixed top-0 left-0 h-full w-80 max-w-[90vw]
          bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-slate-900/95
          backdrop-blur-xl border-r border-white/10
          shadow-2xl z-50
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Drawer Content */}
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              id="drawer-title"
              className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500"
            >
              다른 앱 보기
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 flex items-center justify-center
                       bg-white/10 hover:bg-white/20 rounded-lg
                       transition-all duration-200"
              aria-label="드로워 닫기"
            >
              ✕
            </button>
          </div>

          {/* App List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {apps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onClick={() => handleAppClick(app.url)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/40 text-xs text-center">
              Learning Cake 프로젝트
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
