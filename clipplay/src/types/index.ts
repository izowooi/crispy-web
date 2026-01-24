// Clip entity (video clip)
export interface Clip {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  fileKey: string; // videos/uuid.mp4
  fileSize: number; // bytes
  duration: number; // seconds
  thumbnailKey?: string; // thumbnails/uuid.jpg (optional)
  thumbnailTimestamp?: number; // timestamp in seconds where thumbnail was captured
  filmingDate?: string; // ISO 8601 date (e.g., "2024-12-25") - when the video was filmed
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// App settings (configurable via metadata.json)
export interface AppSettings {
  maxFileSizeMB: number;
}

// Default settings (used when settings not in metadata.json)
export const DEFAULT_SETTINGS: AppSettings = {
  maxFileSizeMB: 200,
};

// R2 metadata.json schema
export interface Metadata {
  clips: Clip[];
  allowedUploaders: string[];
  settings?: AppSettings; // optional for backward compatibility
}

// Video player state
export interface PlayerState {
  currentClip: Clip | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
}

// Player actions
export interface PlayerActions {
  play: (clip?: Clip) => void;
  pause: () => void;
  seek: (time: number) => void;
  toggleMute: () => void;
}

// Auth state
export interface AuthState {
  user: GoogleUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

// Google user info
export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

// Upload form data
export interface UploadFormData {
  file: File;
  title: string;
  description?: string;
  emoji: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filter/Search state
export interface FilterState {
  searchQuery: string;
}

// Theme
export type Theme = 'light' | 'dark' | 'system';
