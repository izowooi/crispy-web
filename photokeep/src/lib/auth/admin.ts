const ADMIN_EMAILS = [
  'izowooi85@gmail.com',
  'ansaemi0@gmail.com',
];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}
