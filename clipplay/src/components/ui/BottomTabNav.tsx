'use client';

interface BottomTabNavProps {
  activeTab: 'feed' | 'grid';
  onTabChange: (tab: 'feed' | 'grid') => void;
}

export function BottomTabNav({ activeTab, onTabChange }: BottomTabNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card-bg/95 backdrop-blur-sm border-t border-card-border safe-area-bottom">
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        {/* Feed Tab */}
        <button
          onClick={() => onTabChange('feed')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
            activeTab === 'feed'
              ? 'bg-primary/10 text-primary'
              : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs font-medium">피드</span>
        </button>

        {/* Grid Tab */}
        <button
          onClick={() => onTabChange('grid')}
          className={`flex-1 flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
            activeTab === 'grid'
              ? 'bg-primary/10 text-primary'
              : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          <span className="text-xs font-medium">그리드</span>
        </button>
      </div>
    </nav>
  );
}
