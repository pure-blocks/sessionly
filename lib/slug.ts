import { prisma } from './prisma'

/**
 * Generates a URL-friendly slug from a string
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
}

/**
 * Generates a unique slug for a tenant
 */
export async function generateUniqueTenantSlug(name: string): Promise<string> {
  let slug = generateSlug(name)
  let counter = 1
  let finalSlug = slug

  while (await prisma.tenant.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`
    counter++
  }

  return finalSlug
}

/**
 * Generates a unique slug for a provider within a tenant
 */
export async function generateUniqueProviderSlug(
  name: string,
  tenantId: string
): Promise<string> {
  let slug = generateSlug(name)
  let counter = 1
  let finalSlug = slug

  while (
    await prisma.provider.findFirst({
      where: { tenantId, slug: finalSlug },
    })
  ) {
    finalSlug = `${slug}-${counter}`
    counter++
  }

  return finalSlug
}

/**
 * Generates a unique slug for a provider type within a tenant
 */
export async function generateUniqueProviderTypeSlug(
  name: string,
  tenantId: string
): Promise<string> {
  let slug = generateSlug(name)
  let counter = 1
  let finalSlug = slug

  while (
    await prisma.providerType.findFirst({
      where: { tenantId, slug: finalSlug },
    })
  ) {
    finalSlug = `${slug}-${counter}`
    counter++
  }

  return finalSlug
}

/**
 * Generates a unique slug for a category within a tenant
 */
export async function generateUniqueCategorySlug(
  name: string,
  tenantId: string
): Promise<string> {
  let slug = generateSlug(name)
  let counter = 1
  let finalSlug = slug

  while (
    await prisma.category.findFirst({
      where: { tenantId, slug: finalSlug },
    })
  ) {
    finalSlug = `${slug}-${counter}`
    counter++
  }

  return finalSlug
}
