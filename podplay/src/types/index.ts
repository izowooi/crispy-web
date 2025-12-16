// Category types
export const CATEGORIES = ['기술', '일상', '뉴스', '교양', '기타'] as const;
export type Category = (typeof CATEGORIES)[number];

// Podcast entity
export interface Podcast {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  category: Category;
  tags: string[];
  fileKey: string; // audio/uuid.mp3
  fileSize: number; // bytes
  duration: number; // seconds
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// R2 metadata.json schema
export interface Metadata {
  podcasts: Podcast[];
  categories: Category[];
  allowedUploaders: string[];
}

// Audio player state
export interface PlayerState {
  currentPodcast: Podcast | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoading: boolean;
  error: string | null;
}

// Player actions
export interface PlayerActions {
  play: (podcast?: Podcast) => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
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
  category: Category;
  tags: string[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filter/Search state
export interface FilterState {
  category: Category | 'all';
  searchQuery: string;
}

// Theme
export type Theme = 'light' | 'dark' | 'system';
