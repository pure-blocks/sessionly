import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * Generate a random invitation code
 */
function generateInvitationCode(): string {
  return randomBytes(16).toString('hex').toUpperCase().slice(0, 16)
}

/**
 * POST /api/invitations
 * Create a new invitation code (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is authenticated and is admin
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // For now, allow any authenticated user to create invitations
    // TODO: Add role check when admin system is implemented
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: 'Forbidden - Admin access required' },
    //     { status: 403 }
    //   )
    // }

    const body = await request.json()
    const {
      email,
      maxUses = 1,
      expiresAt,
    } = body

    // Generate unique code
    let code = generateInvitationCode()
    let attempts = 0
    const MAX_ATTEMPTS = 10

    // Ensure code is unique
    while (attempts < MAX_ATTEMPTS) {
      const existing = await prisma.invitationCode.findUnique({
        where: { code }
      })
      if (!existing) break
      code = generateInvitationCode()
      attempts++
    }

    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Failed to generate unique code' },
        { status: 500 }
      )
    }

    // Create invitation
    const invitation = await prisma.invitationCode.create({
      data: {
        code,
        email: email || null,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      }
    })

    return NextResponse.json(
      {
        message: 'Invitation code created successfully',
        invitation: {
          id: invitation.id,
          code: invitation.code,
          email: invitation.email,
          maxUses: invitation.maxUses,
          expiresAt: invitation.expiresAt,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Invitation creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation code' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/invitations
 * List all invitation codes (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const invitations = await prisma.invitationCode.findMany({
      select: {
        id: true,
        code: true,
        email: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Invitation listing error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
