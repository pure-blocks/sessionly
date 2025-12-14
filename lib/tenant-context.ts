import { headers } from 'next/headers'
import { prisma } from './prisma'
import { Tenant, TenantConfig } from '@prisma/client'

export class TenantNotFoundError extends Error {
  constructor(message: string = 'Tenant not found') {
    super(message)
    this.name = 'TenantNotFoundError'
  }
}

export class TenantContextError extends Error {
  constructor(message: string = 'Tenant context not available') {
    super(message)
    this.name = 'TenantContextError'
  }
}

/**
 * Get tenant context from request headers
 * This is set by the middleware after resolving the tenant from the URL
 */
export async function getTenantContext(): Promise<{
  tenantId: string
  tenantSlug: string
}> {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantSlug) {
    throw new TenantContextError(
      'Tenant context not found. Make sure middleware is configured correctly.'
    )
  }

  // Look up tenant by slug to get the ID
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: { id: true, slug: true }
  })

  if (!tenant) {
    throw new TenantNotFoundError(`No active tenant found with slug: ${tenantSlug}`)
  }

  return { tenantId: tenant.id, tenantSlug: tenant.slug }
}

/**
 * Get the full tenant object from the database
 */
export async function getTenant(): Promise<Tenant> {
  const { tenantId } = await getTenantContext()

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  })

  if (!tenant) {
    throw new TenantNotFoundError(`Tenant with ID ${tenantId} not found`)
  }

  return tenant
}

/**
 * Get tenant by slug (use this in middleware or pages)
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return prisma.tenant.findUnique({
    where: { slug, isActive: true },
  })
}

/**
 * Helper to create tenant-scoped query filters
 * Use this to ensure all queries are scoped to the current tenant
 */
export async function tenantQuery<T extends Record<string, unknown>>(
  additionalFilters?: T
): Promise<T & { tenantId: string }> {
  const { tenantId } = await getTenantContext()
  return {
    ...additionalFilters,
    tenantId,
  } as T & { tenantId: string }
}

/**
 * Verify that a resource belongs to the current tenant
 * Throws an error if the resource doesn't belong to the tenant
 */
export async function verifyTenantOwnership(resourceTenantId: string): Promise<void> {
  const { tenantId } = await getTenantContext()

  if (resourceTenantId !== tenantId) {
    throw new TenantNotFoundError(
      'Resource does not belong to the current tenant'
    )
  }
}

/**
 * Get tenant with related configuration
 */
export async function getTenantWithConfig(): Promise<
  Tenant & { config: TenantConfig | null }
> {
  const { tenantId } = await getTenantContext()

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      config: true,
    },
  })

  if (!tenant) {
    throw new TenantNotFoundError(`Tenant with ID ${tenantId} not found`)
  }

  return tenant
}

/**
 * Extract tenant slug from pathname
 * This is useful for middleware and other places where you need to parse the URL
 */
export function extractTenantSlug(pathname: string): string | null {
  // Handle different URL patterns:
  // /{tenantSlug}/...
  // /api/{tenantSlug}/...
  // /admin/{tenantSlug}/...

  const match = pathname.match(/^\/(?:api\/|admin\/)?([^\/]+)/)
  return match ? match[1] : null
}

/**
 * Check if a pathname should be scoped to a tenant
 * Returns false for system paths like _next, static files, etc.
 */
export function shouldScopeTenant(pathname: string): boolean {
  const systemPaths = [
    '/_next',
    '/static',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/api/health',
  ]

  return !systemPaths.some(path => pathname.startsWith(path))
}
