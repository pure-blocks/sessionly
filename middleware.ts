import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * List of paths that should not be scoped to a tenant
 */
const SYSTEM_PATHS = [
  '/_next',
  '/static',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/api/tenants',
  '/api/auth',
]

/**
 * List of paths that require authentication
 */
const PROTECTED_PATHS = [
  '/admin',
  '/trainer',
]

/**
 * Public paths that don't require authentication
 */
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth',
]

/**
 * Check if the path is a system path that doesn't need tenant context
 */
function isSystemPath(pathname: string): boolean {
  return SYSTEM_PATHS.some(path => pathname.startsWith(path))
}

/**
 * Extract tenant slug from the URL pathname
 * Supports patterns:
 * - /{tenantSlug}/... → extracts tenantSlug
 * - /api/{tenantSlug}/... → extracts tenantSlug
 * - /admin/{tenantSlug}/... → extracts tenantSlug
 */
function extractTenantSlug(pathname: string): string | null {
  // Skip root path
  if (pathname === '/') {
    return null
  }

  let slug: string | null = null

  // Pattern 1: /admin/{tenantSlug}/...
  if (pathname.startsWith('/admin/')) {
    const match = pathname.match(/^\/admin\/([^\/]+)/)
    slug = match?.[1] || null
  }
  // Pattern 2: /api/{tenantSlug}/...
  else if (pathname.startsWith('/api/')) {
    const match = pathname.match(/^\/api\/([^\/]+)/)
    slug = match?.[1] || null

    // Exclude system API routes
    if (slug === 'tenants' || slug === 'health') {
      return null
    }
  }
  // Pattern 3: /{tenantSlug}/...
  else {
    const match = pathname.match(/^\/([^\/]+)/)
    slug = match?.[1] || null
  }

  // Exclude certain known non-tenant routes
  const excludedSlugs = ['_next', 'static', 'favicon.ico', 'robots.txt']
  if (slug && excludedSlugs.includes(slug)) {
    return null
  }

  return slug
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip system paths
  if (isSystemPath(pathname)) {
    return NextResponse.next()
  }

  // Check if path is public (doesn't require authentication)
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))

  // Check if path requires authentication
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path))

  // Get authentication token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect to login if accessing protected path without authentication
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Extract tenant slug from URL
  const tenantSlug = extractTenantSlug(pathname)

  // Prepare request headers
  const requestHeaders = new Headers(request.headers)

  // Add tenant slug to headers if found
  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug)
  }

  // Add user info to headers if authenticated
  if (token) {
    requestHeaders.set('x-user-id', token.sub || '')
    requestHeaders.set('x-user-email', token.email || '')
    requestHeaders.set('x-user-role', (token.role as string) || 'user')
    if (token.tenantId) {
      requestHeaders.set('x-user-tenant-id', token.tenantId as string)
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
