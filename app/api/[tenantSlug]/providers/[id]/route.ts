import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, verifyTenantOwnership } from '@/lib/tenant-context'

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantSlug: string; id: string } }
) {
  try {
    const { tenantId } = await getTenantContext()

    const provider = await prisma.provider.findUnique({
      where: { id: params.id },
      include: {
        providerType: true,
        category: true,
        services: true,
        _count: {
          select: {
            availability: true,
            bookings: true,
          },
        },
      },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    await verifyTenantOwnership(provider.tenantId)

    return NextResponse.json({ provider })
  } catch (error: any) {
    console.error('Provider fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch provider', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantSlug: string; id: string } }
) {
  try {
    const { tenantId } = await getTenantContext()
    const body = await request.json()

    // Verify the provider belongs to this tenant
    const provider = await prisma.provider.findUnique({
      where: { id: params.id },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    await verifyTenantOwnership(provider.tenantId)

    // Update the provider
    const updated = await prisma.provider.update({
      where: { id: params.id },
      data: body,
      include: {
        providerType: true,
        category: true,
      },
    })

    return NextResponse.json({ provider: updated })
  } catch (error: any) {
    console.error('Provider update error:', error)
    return NextResponse.json(
      { error: 'Failed to update provider', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantSlug: string; id: string } }
) {
  try {
    const { tenantId } = await getTenantContext()

    // Verify the provider belongs to this tenant
    const provider = await prisma.provider.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            bookings: true,
            availability: true,
          },
        },
      },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    await verifyTenantOwnership(provider.tenantId)

    // Check if there are active bookings
    if (provider._count.bookings > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete provider with ${provider._count.bookings} booking(s). Cancel bookings first.`,
        },
        { status: 400 }
      )
    }

    await prisma.provider.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Provider deleted' })
  } catch (error: any) {
    console.error('Provider deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete provider', details: error.message },
      { status: 500 }
    )
  }
}
