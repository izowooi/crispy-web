export interface AppInfo {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
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
