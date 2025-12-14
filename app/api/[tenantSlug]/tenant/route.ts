import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenant, getTenantContext } from '@/lib/tenant-context'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const tenant = await getTenant()
    return NextResponse.json({ tenant })
  } catch (error: unknown) {
    console.error('Tenant fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch tenant', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantId } = await getTenantContext()
    const body = await request.json()

    // Update tenant
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        website: body.website || null,
        description: body.description || null,
        primaryColor: body.primaryColor || null,
        secondaryColor: body.secondaryColor || null,
        timezone: body.timezone || 'UTC',
        currency: body.currency || 'USD',
      },
    })

    return NextResponse.json({ tenant: updated })
  } catch (error: unknown) {
    console.error('Tenant update error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update tenant', details: errorMessage },
      { status: 500 }
    )
  }
}
