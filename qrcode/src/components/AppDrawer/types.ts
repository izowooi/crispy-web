export type AppType = 'web' | 'app';

export interface AppInfo {
  id: string;
  name: string;
  description: string;
  type: AppType;
  url: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  icon: string;
  imageUrl?: string;
  color?: string;
}

export interface AppDrawerProps {
  apps: AppInfo[];
  position?: 'left' | 'right';
  defaultOpen?: boolean;
}

export interface AppCardProps {
  app: AppInfo;
  onClick: () => void;
}

export interface FloatingButtonProps {
  isOpen: boolean;
  onClick: () => void;
  position?: 'left' | 'right';
}
