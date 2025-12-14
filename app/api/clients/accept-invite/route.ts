import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * GET /api/clients/accept-invite?token=xxx
 * Verify invitation token and get client info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { inviteToken: token },
      include: {
        provider: {
          select: {
            name: true,
            tenant: {
              select: {
                name: true,
                slug: true,
              }
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    if (client.inviteAcceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    if (client.userId) {
      return NextResponse.json(
        { error: 'This client already has an account' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      client: {
        name: client.name,
        email: client.email,
        providerName: client.provider.name,
        tenantName: client.provider.tenant.name,
      }
    })
  } catch (error) {
    console.error('Invitation verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients/accept-invite
 * Accept invitation and create user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, name } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Find client by invite token
    const client = await prisma.client.findUnique({
      where: { inviteToken: token }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    if (client.inviteAcceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    if (client.userId) {
      return NextResponse.json(
        { error: 'This client already has an account' },
        { status: 400 }
      )
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: client.email }
    })

    if (existingUser) {
      // Link existing user to client
      await prisma.client.update({
        where: { id: client.id },
        data: {
          userId: existingUser.id,
          inviteAcceptedAt: new Date(),
          inviteToken: null, // Clear token after use
        }
      })

      return NextResponse.json({
        message: 'Invitation accepted. Please log in with your existing account.',
        requiresLogin: true,
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user account and link to client in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: name || client.name,
          email: client.email,
          password: hashedPassword,
          tenantId: client.tenantId,
          role: 'user',
        }
      })

      // Link client to user
      await tx.client.update({
        where: { id: client.id },
        data: {
          userId: user.id,
          inviteAcceptedAt: new Date(),
          inviteToken: null, // Clear token after use
        }
      })

      return user
    })

    return NextResponse.json({
      message: 'Account created successfully. You can now log in.',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Invitation acceptance error:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
