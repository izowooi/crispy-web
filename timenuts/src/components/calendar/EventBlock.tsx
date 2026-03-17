import { CalendarEvent, Profile } from '@/types'

interface EventBlockProps {
  event: CalendarEvent
  ownerProfile?: Profile
  onClick: (event: CalendarEvent) => void
}

export default function EventBlock({ event, ownerProfile, onClick }: EventBlockProps) {
  const color = event.color ?? ownerProfile?.color ?? '#7DD3FC'

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(event) }}
      className="w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate leading-5 transition-opacity hover:opacity-80"
      style={{
        backgroundColor: color + '33', // 20% opacity background
        borderLeft: `3px solid ${color}`,
        color: '#1e293b',
      }}
      title={event.title}
    >
      {event.title}
    </button>
  )
}
