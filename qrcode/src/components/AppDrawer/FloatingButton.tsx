'use client';

import { FloatingButtonProps } from './types';

export default function FloatingButton({
  isOpen,
  onClick,
  position = 'right',
}: FloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 ${position === 'right' ? 'right-6' : 'left-6'}
        w-14 h-14
        bg-gradient-to-br from-blue-500 to-indigo-600
        hover:from-blue-400 hover:to-indigo-500
        text-white text-2xl
        rounded-full shadow-lg shadow-blue-500/30
        hover:shadow-blue-500/50 hover:scale-110
        active:scale-95
        transition-all duration-200
        z-40
        flex items-center justify-center
      `}
      aria-label={isOpen ? '드로워 닫기' : '앱 목록 열기'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );
}
