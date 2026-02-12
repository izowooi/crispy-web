import 'server-only';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface JWTPayload {
  authenticated: boolean;
  iat?: number;
  exp?: number;
}

/**
 * JWT 토큰 생성
 */
export function createToken(): string {
  const payload: JWTPayload = {
    authenticated: true,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h', // 24시간 유효
  });
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
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
