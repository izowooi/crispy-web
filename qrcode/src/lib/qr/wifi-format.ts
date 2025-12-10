export type EncryptionType = "WPA" | "WPA2";

export interface WifiQRData {
  ssid: string;
  password: string;
  encryptionType: EncryptionType;
  hidden?: boolean;
}

/**
 * WiFi QR 코드용 문자열 생성
 * 포맷: WIFI:T:<security>;S:<ssid>;P:<password>;H:<hidden>;;
 */
export function generateWifiString(data: WifiQRData): string {
  // 특수문자 이스케이프: \, ;, ,, ", :
  const escapeSpecialChars = (str: string): string => {
    return str.replace(/([\\;,":])/g, "\\$1");
  };

  const ssid = escapeSpecialChars(data.ssid);
  const password = escapeSpecialChars(data.password);
  const hidden = data.hidden ? "H:true;" : "";

  // WPA와 WPA2는 동일하게 WPA로 표시 (QR 표준)
  return `WIFI:T:WPA;S:${ssid};P:${password};${hidden};`;
}

/**
 * SSID 유효성 검사
 * - 1~32자
 * - 빈 문자열 불가
 */
export function validateSSID(ssid: string): { valid: boolean; error?: string } {
  if (!ssid || ssid.trim().length === 0) {
    return { valid: false, error: "SSID를 입력해주세요." };
  }
  if (ssid.length > 32) {
    return { valid: false, error: "SSID는 32자 이하여야 합니다." };
  }
  return { valid: true };
}

/**
 * WPA/WPA2 비밀번호 유효성 검사
 * - 8~63자
 */
export function validatePassword(
  password: string
): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "비밀번호를 입력해주세요." };
  }
  if (password.length < 8) {
    return { valid: false, error: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (password.length > 63) {
    return { valid: false, error: "비밀번호는 63자 이하여야 합니다." };
  }
  return { valid: true };
}

/**
 * WiFi 데이터 전체 유효성 검사
 */
export function validateWifiData(
  data: WifiQRData
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const ssidValidation = validateSSID(data.ssid);
  if (!ssidValidation.valid && ssidValidation.error) {
    errors.push(ssidValidation.error);
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid && passwordValidation.error) {
    errors.push(passwordValidation.error);
  }

  return { valid: errors.length === 0, errors };
}
