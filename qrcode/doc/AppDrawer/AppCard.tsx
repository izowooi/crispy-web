'use client'

import { AppCardProps } from './types'

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
      <div className="
        w-12 h-12 md:w-14 md:h-14
        flex items-center justify-center
        text-3xl md:text-4xl
        bg-white/10 rounded-lg
        group-hover:scale-110 transition-transform duration-200
      ">
        {app.imageUrl ? (
          <img
            src={app.imageUrl}
            alt={`${app.name} 아이콘`}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          app.icon
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <h3 className="
          text-white font-bold text-base md:text-lg
          group-hover:text-amber-400 transition-colors
        ">
          {app.name}
        </h3>
        <p className="text-white/60 text-xs md:text-sm line-clamp-2">
          {app.description}
        </p>
      </div>

      {/* External Link Icon */}
      <div className="text-white/40 group-hover:text-amber-400 transition-colors">
        ↗
      </div>
    </button>
  )
}
