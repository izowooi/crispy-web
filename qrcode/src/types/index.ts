// QR 코드 관련 타입
export type { WifiQRData, EncryptionType } from "@/lib/qr/wifi-format";

// 테스트 케이스 타입
export interface TestCase {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "passed" | "failed";
  error?: string;
  duration?: number;
}
