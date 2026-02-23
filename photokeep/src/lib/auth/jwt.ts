import { SignJWT, jwtVerify } from 'jose';

export interface JwtPayload {
  email: string;
  name: string;
  picture: string;
}

const COOKIE_NAME = 'photokeep_session';
const EXPIRY = '7d';

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
