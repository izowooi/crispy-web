'use client';

import { AppCardProps } from './types';

export default function AppCard({ app, onClick }: AppCardProps) {
  const isNativeApp = app.type === 'app';

  return (
    <button
      onClick={onClick}
      className="
        w-full p-4 flex items-center gap-4
        bg-white/5 hover:bg-white/10
        backdrop-blur-sm border border-white/10
        hover:border-white/20
        rounded-xl
        transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg
        active:scale-[0.98]
        group
      "
    >
      {/* Icon */}
      <div
        className="
          w-12 h-12
          flex items-center justify-center
          text-3xl
          bg-white/10 rounded-xl
          group-hover:scale-110 transition-transform duration-200
          overflow-hidden
        "
      >
        {app.imageUrl ? (
          <img
            src={app.imageUrl}
            alt={`${app.name} 아이콘`}
            className="w-full h-full object-cover"
          />
        ) : (
          app.icon
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3
            className="
              text-white font-bold text-base
              group-hover:text-blue-400 transition-colors
            "
          >
            {app.name}
          </h3>
          {isNativeApp && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-pink-500/20 text-pink-300 rounded">
              APP
            </span>
          )}
        </div>
        <p className="text-white/60 text-xs line-clamp-2">{app.description}</p>
      </div>

      {/* External Link Icon */}
      <div className="text-white/40 group-hover:text-blue-400 transition-colors">
        {isNativeApp ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
