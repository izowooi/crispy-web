import * as jose from 'jose';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
  : 'http://localhost:3000/api/auth/callback';

// Session cookie name
export const SESSION_COOKIE = 'clipplay_session';

// JWT secret for session tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'clipplay-secret-key-change-in-production'
);

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
}

export interface SessionUser {
  email: string;
  name: string;
  picture: string;
  isAdmin: boolean;
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

/**
 * Check if user is in allowed uploaders list
 */
export async function isAllowedUploader(email: string): Promise<boolean> {
  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!r2Url) return false;

  try {
    const response = await fetch(`${r2Url}/metadata.json`);
    if (!response.ok) return false;

    const metadata = await response.json();
    return metadata.allowedUploaders?.includes(email) || false;
  } catch {
    return false;
  }
}

/**
 * Create session token (JWT)
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  const token = await new jose.SignJWT({
    email: user.email,
    name: user.name,
    picture: user.picture,
    isAdmin: user.isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify session token and return user
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);

    return {
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string,
      isAdmin: payload.isAdmin as boolean,
    };
  } catch {
    return null;
  }
}

/**
 * Get session from request cookies
 */
export async function getSessionFromCookies(
  cookies: { get: (name: string) => { value: string } | undefined }
): Promise<SessionUser | null> {
  const sessionCookie = cookies.get(SESSION_COOKIE);
  if (!sessionCookie) return null;

  return verifySessionToken(sessionCookie.value);
}
