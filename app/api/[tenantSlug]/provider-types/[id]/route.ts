import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, verifyTenantOwnership } from '@/lib/tenant-context'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  try {
    const { id } = await params
    const { tenantId } = await getTenantContext()

    const providerType = await prisma.providerType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            providers: true,
          },
        },
      },
    })

    if (!providerType) {
      return NextResponse.json(
        { error: 'Provider type not found' },
        { status: 404 }
      )
    }

    await verifyTenantOwnership(providerType.tenantId)

    return NextResponse.json({ providerType })
  } catch (error: unknown) {
    console.error('Provider type fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch provider type', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  try {
    const { id } = await params
    const { tenantId } = await getTenantContext()
    const body = await request.json()

    // Verify the provider type belongs to this tenant
    const providerType = await prisma.providerType.findUnique({
      where: { id },
    })

    if (!providerType) {
      return NextResponse.json(
        { error: 'Provider type not found' },
        { status: 404 }
      )
    }

    await verifyTenantOwnership(providerType.tenantId)

    // Update the provider type
    const updated = await prisma.providerType.update({
      where: { id },
      data: body,
    })

    return NextResponse.json({ providerType: updated })
  } catch (error: unknown) {
    console.error('Provider type update error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update provider type', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  try {
    const { id } = await params
    const { tenantId } = await getTenantContext()

    // Verify the provider type belongs to this tenant
    const providerType = await prisma.providerType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { providers: true },
        },
      },
    })

    if (!providerType) {
      return NextResponse.json(
        { error: 'Provider type not found' },
        { status: 404 }
      )
    }

    await verifyTenantOwnership(providerType.tenantId)

    // Check if there are providers using this type
    if (providerType._count.providers > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete provider type with ${providerType._count.providers} provider(s). Remove providers first.`,
        },
        { status: 400 }
      )
    }

    await prisma.providerType.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Provider type deleted' })
  } catch (error: unknown) {
    console.error('Provider type deletion error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to delete provider type', details: errorMessage },
      { status: 500 }
    )
  }
}
