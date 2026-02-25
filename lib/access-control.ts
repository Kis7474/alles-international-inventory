export type UserRole = 'ADMIN' | 'STAFF'

export function canAccessMenu(role: UserRole | null, adminOnly = false): boolean {
  if (!adminOnly) return true
  return role === 'ADMIN'
}

export const ADMIN_ONLY_PATH_PREFIXES = [
  '/master/upload',
  '/settings/unipass',
]

export function isAdminOnlyPath(path: string): boolean {
  return ADMIN_ONLY_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
}
