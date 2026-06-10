import { cookies } from "next/headers";

const COOKIE_NAME = "ps_admin";

// Returns true when the stored cookie matches the configured admin password.
// If ADMIN_PASSWORD is not set, admin mode is permanently disabled.
export function isAdminToken(cookieValue: string | undefined): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !cookieValue) return false;
  return cookieValue === pw;
}

// For use in Server Components and Server Actions (next/headers available).
export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  return isAdminToken(store.get(COOKIE_NAME)?.value);
}

// For use in Route Handlers where we have the Request object.
export function isAdminRequest(request: Request): boolean {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(/(?:^|;\s*)ps_admin=([^;]*)/);
  return isAdminToken(match ? decodeURIComponent(match[1]) : undefined);
}

export { COOKIE_NAME };
