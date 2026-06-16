// A private archive is viewable only by an authenticated admin; public archives by anyone.
// This mirrors the list/API filter (`is_private = false` for non-admins) so the detail page,
// the list, and the metadata API all enforce the same rule.
export function canViewArchive(isPrivate: boolean, isAdmin: boolean): boolean {
  return isAdmin || !isPrivate;
}
