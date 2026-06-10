export interface CaptureResult {
  title: string;
  url: string;
  html: string;
}

export interface UploadRequest {
  title: string;
  original_url: string;
  html: string;
}

export interface UploadResponse {
  share_url: string;
  archive: {
    id: string;
    title: string;
    created_at: string;
  };
}

export type Message =
  | { type: "CAPTURE_PAGE" }
  | { type: "CAPTURE_DONE"; payload: CaptureResult }
  | { type: "CAPTURE_ERROR"; message: string }
  | { type: "UPLOAD_DONE"; share_url: string }
  | { type: "UPLOAD_ERROR"; message: string };
