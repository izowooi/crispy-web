// QR 코드 관련 타입
export type { WifiQRData, EncryptionType } from "@/lib/qr/wifi-format";

// API 응답 타입
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// QR 생성 요청/응답
export interface GenerateQRRequest {
  ssid: string;
  password: string;
  encryptionType: "WPA" | "WPA2";
}

export interface GenerateQRResponse {
  qrId: string;
  qrDataUrl: string;
  r2Url?: string;
  createdAt: string;
}

// 데이터베이스 타입
export interface WifiQRCodeRecord {
  id: string;
  user_id: string;
  ssid: string;
  encryption_type: "WPA" | "WPA2";
  r2_object_key: string;
  created_at: string;
}

// 사용자 프로필
export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

// 테스트 케이스 타입
export interface TestCase {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "passed" | "failed";
  error?: string;
  duration?: number;
}
