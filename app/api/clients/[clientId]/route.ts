import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/clients/[clientId]
 * Get a specific client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { provider: true }
    })

    if (!user?.provider) {
      return NextResponse.json(
        { error: 'Only providers can view clients' },
        { status: 403 }
      )
    }

    const client = await prisma.client.findFirst({
      where: {
        id: params.clientId,
        providerId: user.provider.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        bookings: {
          select: {
            id: true,
            availability: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
              }
            },
            status: true,
            totalPrice: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10,
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Client fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clients/[clientId]
 * Update a client
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { provider: true }
    })

    if (!user?.provider) {
      return NextResponse.json(
        { error: 'Only providers can update clients' },
        { status: 403 }
      )
    }

    // Verify client belongs to this provider
    const existingClient = await prisma.client.findFirst({
      where: {
        id: params.clientId,
        providerId: user.provider.id,
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      phone,
      notes,
      pricingTable,
      pricingNotes,
      isActive,
    } = body

    // Update client
    const client = await prisma.client.update({
      where: { id: params.clientId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
        ...(pricingTable !== undefined && { pricingTable }),
        ...(pricingNotes !== undefined && { pricingNotes }),
        ...(isActive !== undefined && { isActive }),
      }
    })

    return NextResponse.json({
      message: 'Client updated successfully',
      client
    })
  } catch (error) {
    console.error('Client update error:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clients/[clientId]
 * Delete (deactivate) a client
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { provider: true }
    })

    if (!user?.provider) {
      return NextResponse.json(
        { error: 'Only providers can delete clients' },
        { status: 403 }
      )
    }

    // Verify client belongs to this provider
    const existingClient = await prisma.client.findFirst({
      where: {
        id: params.clientId,
        providerId: user.provider.id,
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Soft delete by deactivating
    await prisma.client.update({
      where: { id: params.clientId },
      data: { isActive: false }
    })

    return NextResponse.json({
      message: 'Client deactivated successfully'
    })
  } catch (error) {
    console.error('Client deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
