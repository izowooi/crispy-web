import { cookies } from 'next/headers';
import { verifyJwt, COOKIE_NAME, type JwtPayload } from './jwt';

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}
