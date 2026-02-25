export function shouldProtectPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/sales') ||
    pathname.startsWith('/import-export') ||
    pathname.startsWith('/warehouse') ||
    pathname.startsWith('/master') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/settings')
  )
}

export function shouldRedirectProjectCreate(pathname: string): boolean {
  return pathname.startsWith('/projects/new')
}
