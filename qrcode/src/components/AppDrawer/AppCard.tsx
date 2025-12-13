'use client';

import { AppCardProps } from './types';

export default function AppCard({ app, onClick }: AppCardProps) {
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
        "
      >
        {app.icon}
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <h3
          className="
            text-white font-bold text-base
            group-hover:text-blue-400 transition-colors
          "
        >
          {app.name}
        </h3>
        <p className="text-white/60 text-xs line-clamp-2">{app.description}</p>
      </div>

      {/* External Link Icon */}
      <div className="text-white/40 group-hover:text-blue-400 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </button>
  );
}
