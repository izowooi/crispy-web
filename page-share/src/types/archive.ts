export interface Archive {
  id: string;
  title: string;
  original_url: string;
  storage_path: string;
  file_size: number;
  created_at: string;
}

export interface CreateArchivePayload {
  title: string;
  original_url: string;
  html: string;
}

export interface CreateArchiveResponse {
  archive: Archive;
  share_url: string;
}
