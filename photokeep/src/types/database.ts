export interface Post {
  id: string;
  content: string | null;
  emoji: string;
  is_private: boolean;
  author_name: string;
  sort_order: number;
  cover_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  post_id: string;
  url: string;
  thumbnail_url: string | null;
  blurhash: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumPost {
  album_id: string;
  post_id: string;
  sort_order: number;
}

export interface AllowedUploader {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface PostWithPhotos extends Post {
  photos: Photo[];
}
