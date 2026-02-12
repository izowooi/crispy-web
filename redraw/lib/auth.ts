import 'server-only';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  authenticated: boolean;
  iat?: number;
  exp?: number;
}

/**
 * JWT 토큰 생성
 */
export function createToken(): string {
  const secret = process.env.JWT_SECRET;

  console.log('[createToken] JWT_SECRET 환경변수 존재:', !!secret);

  if (!secret) {
    throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다.');
  }

  const payload: JWTPayload = {
    authenticated: true,
  };

  return jwt.sign(payload, secret, {
    expiresIn: '24h', // 24시간 유효
  });
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): JWTPayload | null {
  const secret = process.env.JWT_SECRET;

  console.log('[verifyToken] JWT_SECRET 환경변수 존재:', !!secret);
  console.log('[verifyToken] JWT_SECRET 값 (일부):', secret?.substring(0, 10));

  if (!secret) {
    console.error('[verifyToken] JWT_SECRET 환경 변수가 없습니다.');
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    console.log('[verifyToken] 토큰 검증 성공:', decoded);
    return decoded;
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
