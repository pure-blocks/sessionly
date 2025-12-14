import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * POST /api/clients
 * Add a new client (provider only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's provider profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { provider: true }
    })

    if (!user?.provider) {
      return NextResponse.json(
        { error: 'Only providers can add clients' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      notes,
      customHourlyRate,
      customPricingNotes,
      sendInvite = true,
    } = body

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if client already exists for this provider
    const existingClient = await prisma.client.findFirst({
      where: {
        providerId: user.provider.id,
        email: email.toLowerCase(),
      }
    })

    if (existingClient) {
      return NextResponse.json(
        { error: 'Client with this email already exists in your roster' },
        { status: 409 }
      )
    }

    // Generate invitation token
    const inviteToken = sendInvite ? randomBytes(32).toString('hex') : null

    // Create client
    const client = await prisma.client.create({
      data: {
        providerId: user.provider.id,
        tenantId: user.provider.tenantId,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        notes: notes || null,
        customHourlyRate: customHourlyRate || null,
        customPricingNotes: customPricingNotes || null,
        inviteToken,
        invitedAt: sendInvite ? new Date() : null,
      }
    })

    // TODO: Send invitation email if sendInvite is true
    // For now, we'll just return the invite link in the response

    return NextResponse.json(
      {
        message: 'Client added successfully',
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          customHourlyRate: client.customHourlyRate,
        },
        inviteLink: sendInvite
          ? `${process.env.NEXTAUTH_URL}/client/accept-invite?token=${inviteToken}`
          : null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Client creation error:', error)
    return NextResponse.json(
      { error: 'Failed to add client' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/clients
 * Get all clients for the logged-in provider
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's provider profile
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

    const clients = await prisma.client.findMany({
      where: {
        providerId: user.provider.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        customHourlyRate: true,
        customPricingNotes: true,
        userId: true,
        inviteAcceptedAt: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Client listing error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}
