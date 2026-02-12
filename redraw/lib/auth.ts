import 'server-only';

export interface AuthPayload {
  authenticated: boolean;
  exp: number;
}

/**
 * Edge Runtime 호환 토큰 생성 (Web Crypto API 사용)
 */
export async function createToken(): Promise<string> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다.');
  }

  const payload: AuthPayload = {
    authenticated: true,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24시간 후
  };

  // 간단한 HMAC 기반 토큰 생성
  const data = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const secretBuffer = encoder.encode(secret);

  // Web Crypto API로 HMAC 생성
  const key = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Base64 인코딩
  const token = btoa(data) + '.' + signatureHex;
  return token;
}

/**
 * Edge Runtime 호환 토큰 검증
 */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[verifyToken] JWT_SECRET 환경 변수가 없습니다.');
    return null;
  }

  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      return null;
    }

    const data = atob(encodedPayload);
    const payload: AuthPayload = JSON.parse(data);

    // 만료 확인
    if (payload.exp < Date.now()) {
      console.log('[verifyToken] 토큰 만료됨');
      return null;
    }

    // 서명 검증
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const secretBuffer = encoder.encode(secret);

    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      dataBuffer
    );

    if (!isValid) {
      console.log('[verifyToken] 서명 검증 실패');
      return null;
    }

    console.log('[verifyToken] 토큰 검증 성공');
    return payload;
  } catch (error) {
    console.error('[verifyToken] 토큰 검증 실패:', error);
    return null;
  }
}

/**
 * 비밀번호 검증
 */
export function verifyPassword(password: string): boolean {
  const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

  if (!AUTH_PASSWORD) {
    throw new Error('AUTH_PASSWORD 환경 변수가 설정되지 않았습니다.');
  }

  return password === AUTH_PASSWORD;
}
