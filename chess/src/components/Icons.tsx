import type { ReactNode } from "react";

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconBack = () => <Icon><path d="M15 5l-7 7 7 7" /></Icon>;
export const IconClose = () => <Icon><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const IconPrev = () => <Icon><path d="M15 5l-7 7 7 7" /></Icon>;
export const IconNext = () => <Icon><path d="M9 5l7 7-7 7" /></Icon>;
export const IconFirst = () => <Icon><path d="M17 5l-7 7 7 7M7 5v14" /></Icon>;
export const IconLast = () => <Icon><path d="M7 5l7 7-7 7M17 5v14" /></Icon>;
export const IconFlip = () => <Icon><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></Icon>;
export const IconFlag = () => <Icon><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></Icon>;
export const IconStop = () => <Icon><rect x="6" y="6" width="12" height="12" rx="2.5" /></Icon>;
export const IconHome = () => <Icon><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" /></Icon>;
export const IconList = () => <Icon><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></Icon>;
export const IconChart = () => <Icon><path d="M5 20V10M12 20V4M19 20v-7" /></Icon>;
export const IconSound = () => <Icon><path d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></Icon>;
export const IconMute = () => <Icon><path d="M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6" /></Icon>;
export const IconCopy = () => <Icon><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8" /></Icon>;
export const IconBolt = () => <Icon><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></Icon>;
export const IconUser = () => <Icon><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" /></Icon>;
export const IconRobot = () => <Icon><rect x="4.5" y="7.5" width="15" height="12" rx="4" /><path d="M12 7.5V4M9 13h.01M15 13h.01M9.5 16.5h5" /></Icon>;
export const IconSwords = () => <Icon><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 14.5L3 21M5 17l2 2M14.5 6.5L18 3h3v3l-3.5 3.5" /></Icon>;
export const IconTrash = () => <Icon><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></Icon>;
export const IconUsers = () => <Icon><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c1-3.2 3.5-5 6.5-5s5.5 1.8 6.5 5M16 5.2a3.5 3.5 0 010 6.6M18.5 15.3c1.5.8 2.5 2.4 3 4.7" /></Icon>;
export const IconShare = () => <Icon><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v7.5A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5V12" /></Icon>;
export const IconSmile = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01" /></Icon>;
export const IconHandshake = () => <Icon><path d="M3 12l4-4 4 2 3-2 7 5M7 8l-4 4 6 6 2-1M14 8l4 4M11 17l2 2 2-1 2 1 4-5" /></Icon>;
export const IconEdit = () => <Icon><path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4" /></Icon>;
