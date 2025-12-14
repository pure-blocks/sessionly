import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, tenantSlug } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Find tenant if tenantSlug is provided
    let tenantId: string | undefined = undefined
    let tenant = null
    if (tenantSlug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      })

      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        )
      }

      tenantId = tenant.id
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        tenantId,
        role: tenantId ? 'admin' : 'user', // If associated with tenant, make them admin
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
      },
    })

    // Send welcome email (async, don't wait for completion)
    sendWelcomeEmail({
      name: user.name || 'User',
      email: user.email,
      tenantName: tenant?.name,
    }).catch(error => {
      console.error('Failed to send welcome email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { message: 'User created successfully', user },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Registration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create user', details: errorMessage },
      { status: 500 }
    )
  }
}
